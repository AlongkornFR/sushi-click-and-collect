# orders/views_ipn.py
import logging

import payplug
from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from products.models import Product
from .emails import send_receipt_email
from .models import Order

logger = logging.getLogger(__name__)


def _extract_payment_id(payload: dict):
    if not isinstance(payload, dict):
        return None
    return (
        payload.get("id")
        or payload.get("payment_id")
        or (payload.get("payment") or {}).get("id")
        or (payload.get("data") or {}).get("id")
    )


def _decrement_stock(order):
    """Décrémente le stock des produits de la commande (jamais en dessous de 0).

    Appelé une seule fois, au passage pending -> paid, sous verrou
    (select_for_update) pour éviter les décréments concurrents.
    """
    items = list(order.items.all())
    pids = [it.product_id for it in items]
    products = {p.id: p for p in Product.objects.select_for_update().filter(id__in=pids)}

    for it in items:
        p = products.get(it.product_id)
        if p is None:
            continue
        if p.stock < it.quantity:
            # Survente rare (payé entre-temps par quelqu'un d'autre) :
            # on plafonne à 0 et on loggue pour que le staff soit au courant.
            logger.warning(
                "Stock insuffisant au paiement (commande #%s, produit '%s') : %s restant, %s demandés",
                order.id, p.name, p.stock, it.quantity,
            )
        p.stock = max(0, p.stock - it.quantity)
        p.save(update_fields=["stock"])


@api_view(["POST"])
@permission_classes([AllowAny])
def payplug_ipn(request):
    if not settings.PAYPLUG_SECRET_KEY:
        return Response({"detail": "PAYPLUG_SECRET_KEY missing."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    payload = request.data or {}
    payment_id = _extract_payment_id(payload)

    if not payment_id:
        return Response({"detail": "Missing payment id"}, status=status.HTTP_400_BAD_REQUEST)

    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    # 1) Source de vérité : le paiement tel que Payplug le connaît.
    try:
        payment = payplug.Payment.retrieve(payment_id)
    except Exception:
        # Erreur ponctuelle (réseau, etc.) : on renvoie 400 pour que
        # Payplug retente la notification plus tard.
        logger.exception("IPN : impossible de récupérer le paiement %s", payment_id)
        return Response({"detail": "Cannot retrieve payment"}, status=status.HTTP_400_BAD_REQUEST)

    is_paid = bool(getattr(payment, "is_paid", False))
    amount = getattr(payment, "amount", None)
    currency = getattr(payment, "currency", None)
    metadata = getattr(payment, "metadata", None) or {}

    order_id = metadata.get("order_id")
    if not order_id:
        return Response({"ok": True, "detail": "Missing order_id in metadata"}, status=status.HTTP_200_OK)

    # 2) Vérifs sécurité
    if currency and currency != "EUR":
        return Response({"ok": True, "detail": "Unexpected currency"}, status=status.HTTP_200_OK)

    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(id=int(order_id))
        except Order.DoesNotExist:
            return Response({"ok": True, "detail": "Order not found"}, status=status.HTTP_200_OK)

        # Mode strict : l'IPN doit correspondre au paiement enregistré.
        if order.payment_id and str(order.payment_id) != str(payment_id):
            return Response({"ok": True, "detail": "payment_id mismatch"}, status=status.HTTP_200_OK)

        # Vérif montant (anti-fraude)
        if amount is None or int(amount) != int(order.total_cents):
            return Response({"ok": True, "detail": "Amount mismatch"}, status=status.HTTP_200_OK)

        # Idempotent
        if order.status == "paid":
            return Response({"ok": True, "already_paid": True}, status=status.HTTP_200_OK)

        # 3) On valide uniquement si Payplug confirme
        if is_paid:
            _decrement_stock(order)
            order.status = "paid"
            order.payment_id = str(payment_id)
            order.save(update_fields=["status", "payment_id"])
            # Email envoyé seulement si la transaction est bien committée.
            transaction.on_commit(lambda: send_receipt_email(order))
            return Response({"ok": True, "paid": True}, status=status.HTTP_200_OK)

    return Response({"ok": True, "paid": False}, status=status.HTTP_200_OK)
