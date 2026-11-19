# orders/views.py
import logging
from functools import partial

import payplug
from django.conf import settings
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from backend.throttles import CheckoutThrottle
from products.models import Product
from .models import Order, OrderItem
from .opening_hours import PickupError, parse_pickup, public_schedule
from .serializers import CheckoutSerializer, first_error_message

PAYMENT_UNAVAILABLE = (
    "Le paiement en ligne n'a pas pu démarrer. Réessayez dans un instant "
    "ou appelez-nous au 04 93 68 08 12."
)

logger = logging.getLogger(__name__)


@api_view(["GET"])
@permission_classes([AllowAny])
def opening_hours(request):
    """Horaires de retrait, lus par le checkout pour construire les créneaux."""
    return Response(public_schedule())


def _to_cents(decimal_price):
    return int(round(float(decimal_price) * 100))

def split_name(full_name: str):
    parts = (full_name or "").strip().split()
    if not parts:
        return "Client", " "
    if len(parts) == 1:
        return parts[0], " "
    return parts[0], " ".join(parts[1:])

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([CheckoutThrottle])
def checkout(request):
    user = request.user if getattr(request, "user", None) and request.user.is_authenticated else None
    serializer = CheckoutSerializer(data=request.data or {}, context={"user": user})
    if not serializer.is_valid():
        errors = serializer.errors
        field = "pickup_time" if "pickup_time" in errors else None
        return Response({"detail": first_error_message(errors), "field": field, "errors": errors}, status=400)

    data = serializer.validated_data
    full_name = data["customer"]["full_name"]
    email = data["customer"]["email"]
    phone = data["customer"].get("phone", "")
    notes = data.get("notes", "").strip()

    try:
        pickup_at = parse_pickup(data["pickup_time"])
    except PickupError as e:
        return Response({"detail": str(e), "field": "pickup_time"}, status=400)

    # Vérifié avant de créer la commande : pas de commande orpheline si la
    # configuration de paiement manque.
    if not settings.PAYPLUG_SECRET_KEY:
        logger.error("PAYPLUG_SECRET_KEY absente : checkout impossible.")
        return Response({"detail": PAYMENT_UNAVAILABLE}, status=503)

    wanted = [(it["product_id"], it["quantity"]) for it in data["items"]]
    product_ids = [pid for pid, _ in wanted]

    # Règle métier (validée le 19/11/2026) : un produit "disponible" est
    # commandable, sans suivi de stock. Le champ Product.stock est conservé
    # en base et dans l'API, mais n'a plus d'effet sur la commande.
    with transaction.atomic():
        db_products = Product.objects.filter(id__in=product_ids, is_available=True)
        db_map = {p.id: p for p in db_products}

        line_items = []
        total_cents = 0

        for pid, qty in wanted:
            p = db_map.get(pid)
            if not p:
                return Response(
                    {"detail": "Un article de votre panier n'est plus disponible. Retirez-le puis réessayez.",
                     "field": "items", "unavailable_product_id": pid},
                    status=400,
                )

            unit_cents = _to_cents(p.price)
            total_cents += unit_cents * qty
            line_items.append((p, qty, unit_cents))

        order = Order.objects.create(
            user=user,
            full_name=full_name,
            email=email,
            phone=phone,
            pickup_time=f"{pickup_at:%H:%M}",
            pickup_at=pickup_at,
            notes=notes,
            status="pending",
            total_cents=total_cents,
        )

        for p, qty, unit_cents in line_items:
            OrderItem.objects.create(
                order=order,
                product_id=p.id,
                product_name=p.name,
                unit_price_cents=unit_cents,
                quantity=qty,
            )

    # Paiement Payplug après la création de la commande
    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    query = f"order_id={order.id}&token={order.public_token}"
    return_url = f"{settings.FRONTEND_BASE_URL}/success?{query}"
    cancel_url = f"{settings.FRONTEND_BASE_URL}/cancel?{query}"
    notification_url = f"{settings.BACKEND_BASE_URL}/api/payplug/ipn/"

    first_name, last_name = split_name(full_name)

    payment_data = {
        "amount": order.total_cents,
        "currency": "EUR",
        "billing": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "address1": "53 boulevard Carnot",
            "postcode": "06400",
            "city": "Cannes",
            "country": "FR",
        },
        "shipping": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "address1": "53 boulevard Carnot",
            "postcode": "06400",
            "city": "Cannes",
            "country": "FR",
        },
        "hosted_payment": {"return_url": return_url, "cancel_url": cancel_url},
        "notification_url": notification_url,
        "metadata": {"order_id": str(order.id), "phone": phone, "pickup_time": pickup_at.isoformat()},
    }

    try:
        payment = payplug.Payment.create(**payment_data)
    except Exception:
        # La commande ne peut pas être payée : on l'annule pour qu'elle
        # n'encombre pas l'écran staff. Le détail reste dans les logs.
        logger.exception("Création du paiement Payplug impossible pour la commande #%s.", order.id)
        Order.objects.filter(pk=order.pk, status="pending").update(status="cancelled")
        return Response({"detail": PAYMENT_UNAVAILABLE}, status=502)

    with transaction.atomic():
        order.payment_id = str(getattr(payment, "id", "")) or order.payment_id
        order.payment_url = payment.hosted_payment.payment_url
        order.save(update_fields=["payment_id", "payment_url"])

    return Response(
        {"order_id": order.id, "token": str(order.public_token), "payment_url": order.payment_url},
        status=201,
    )





# orders/views.py (suite)
import base64
import requests as http_requests

from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
import payplug

from .models import Order
from .receipt import generate_receipt_pdf
from .emails import send_order_status_email
from loyalty.services import award_point_for_order


def _send_receipt_email(order):
    """Wrapper legacy — utilise système unifié SMTP Gmail."""
    send_order_status_email(order, status="paid")


def _extract_payment_id(payload: dict):
    if not isinstance(payload, dict):
        return None
    return (
        payload.get("id")
        or payload.get("payment_id")
        or (payload.get("payment") or {}).get("id")
        or (payload.get("data") or {}).get("id")
    )


@api_view(["POST"])
@permission_classes([AllowAny])
def payplug_ipn(request):
    if not settings.PAYPLUG_SECRET_KEY:
        return Response({"detail": "PAYPLUG_SECRET_KEY missing."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # DRF te donne déjà un dict (JSON), pas besoin de json.loads(request.body)
    payload = request.data or {}
    payment_id = _extract_payment_id(payload)

    if not payment_id:
        return Response({"detail": "Missing payment id"}, status=status.HTTP_400_BAD_REQUEST)

    # ⚠️ Même style que ton checkout (tu utilises set_secret_key + set_api_version)
    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    # 1) Vérité côté Payplug
    try:
        payment = payplug.Payment.retrieve(payment_id)
    except Exception:
        # On répond OK pour éviter que Payplug réessaye en boucle sur une erreur ponctuelle ?
        # Tu peux aussi renvoyer 400 si tu préfères.
        return Response({"ok": True, "detail": "Cannot retrieve payment"}, status=status.HTTP_200_OK)

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

        # (Mode STRICT recommandé) : si ta commande a déjà un payment_id enregistré,
        # on refuse toute IPN qui ne correspond pas à CE paiement.
        if order.payment_id and str(order.payment_id) != str(payment_id):
            return Response({"ok": True, "detail": "payment_id mismatch"}, status=status.HTTP_200_OK)

        # Vérif montant (anti-fraude)
        if amount is None or int(amount) != int(order.total_cents):
            return Response({"ok": True, "detail": "Amount mismatch"}, status=status.HTTP_200_OK)

        # Idempotent : seule une commande "pending" peut devenir "paid".
        # Une commande déjà prise en charge (preparing, ready, collected)
        # ou annulée garde son statut.
        if order.status != "pending":
            if order.status == "cancelled" and is_paid:
                logger.warning("Paiement %s reçu pour la commande annulée #%s : remboursement à prévoir.",
                               payment_id, order.id)
            return Response({"ok": True, "already_processed": True, "status": order.status},
                            status=status.HTTP_200_OK)

        # 3) On valide uniquement si Payplug confirme
        if is_paid:
            order.status = "paid"
            # on resync au cas où
            order.payment_id = str(payment_id)
            order.save(update_fields=["status", "payment_id"])
            # Email envoyé après la validation de la transaction (lot M1) :
            # jamais pendant que la commande est verrouillée.
            transaction.on_commit(partial(_send_receipt_email, order))
            award_point_for_order(order)
            return Response({"ok": True, "paid": True}, status=status.HTTP_200_OK)

    return Response({"ok": True, "paid": False}, status=status.HTTP_200_OK)

from rest_framework.generics import RetrieveAPIView
from .serializers import OrderSerializer, OrderStatusSerializer


def _confirm_payment_if_paid(order):
    """Interroge Payplug et passe la commande en "paid" si le paiement est confirmé.

    Ne dépend pas de l'IPN : appelé par la page /success. Seule une commande
    "pending" peut devenir "paid". Renvoie la commande à jour, sans jamais
    lever d'erreur vers le client.
    """
    if order.status != "pending" or not order.payment_id:
        return order
    if not settings.PAYPLUG_SECRET_KEY:
        logger.error("PAYPLUG_SECRET_KEY absente : impossible de vérifier la commande #%s.", order.id)
        return order

    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)
    try:
        payment = payplug.Payment.retrieve(order.payment_id)
    except Exception:
        logger.exception("Payplug injoignable pour la commande #%s.", order.id)
        return order

    amount = getattr(payment, "amount", None)
    currency = getattr(payment, "currency", None)
    if not getattr(payment, "is_paid", False):
        return order
    if currency and currency != "EUR":
        return order
    if amount is None or int(amount) != int(order.total_cents):
        return order

    with transaction.atomic():
        o = Order.objects.select_for_update().get(id=order.id)
        if o.status == "pending":
            o.status = "paid"
            o.save(update_fields=["status"])
            transaction.on_commit(partial(_send_receipt_email, o))
            award_point_for_order(o)
    return o


# ── Accès client par jeton (lot C5) ─────────────────────────────────────────

class OrderByTokenView(RetrieveAPIView):
    """Détail d'une commande, accessible seulement avec son jeton public."""
    queryset = Order.objects.prefetch_related("items")
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]
    lookup_field = "public_token"
    lookup_url_kwarg = "token"


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_payment_by_token(request, token):
    try:
        order = Order.objects.get(public_token=token)
    except Order.DoesNotExist:
        return Response({"detail": "Commande introuvable."}, status=404)
    return Response(OrderSerializer(_confirm_payment_if_paid(order)).data)


# ── Anciennes routes par ID (transition) ────────────────────────────────────
# Gardées pour les clients partis payer avant le déploiement : elles ne
# renvoient plus que l'ID et le statut, jamais le contenu de la commande.

class OrderDetailView(RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderStatusSerializer
    permission_classes = [AllowAny]


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_payment(request, pk):
    try:
        order = Order.objects.get(id=pk)
    except Order.DoesNotExist:
        return Response({"detail": "Commande introuvable."}, status=404)
    return Response(OrderStatusSerializer(_confirm_payment_if_paid(order)).data)
