# orders/views.py
import re

import payplug
from django.conf import settings
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from products.models import Product
from .models import Order, OrderItem
from .serializers import OrderSerializer

PICKUP_TIME_RE = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


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
def checkout(request):
    data = request.data or {}
    customer = data.get("customer") or {}
    items = data.get("items") or []

    full_name = (customer.get("full_name") or "").strip()
    email = (customer.get("email") or "").strip()
    phone = (customer.get("phone") or "").strip()
    pickup_time = (data.get("pickup_time") or "").strip()
    notes = (data.get("notes") or "").strip()

    if not full_name or not email or not pickup_time:
        return Response({"detail": "Champs client invalides."}, status=400)
    if not PICKUP_TIME_RE.match(pickup_time):
        return Response({"detail": "Créneau de retrait invalide."}, status=400)
    if not isinstance(items, list) or len(items) == 0:
        return Response({"detail": "Panier vide."}, status=400)

    # Validation items
    wanted = []
    product_ids = []
    for it in items:
        try:
            pid = int(it.get("product_id"))
            qty = int(it.get("quantity") or 0)
        except (TypeError, ValueError):
            return Response({"detail": "Item invalide."}, status=400)
        if pid <= 0 or qty <= 0:
            return Response({"detail": "Item invalide."}, status=400)
        wanted.append((pid, qty))
        product_ids.append(pid)

    # Transaction : vérifier dispo + stock, créer order/items.
    # ⚠️ Le stock n'est PAS décrémenté ici : il l'est quand Payplug
    # confirme le paiement (IPN). Une commande abandonnée ne bloque
    # donc jamais de stock.
    with transaction.atomic():
        db_products = Product.objects.filter(id__in=product_ids, is_available=True)
        db_map = {p.id: p for p in db_products}

        line_items = []
        total_cents = 0

        for pid, qty in wanted:
            p = db_map.get(pid)
            if not p:
                return Response({"detail": f"Produit indisponible (id={pid})."}, status=400)

            if p.stock < qty:
                return Response(
                    {"detail": f"Stock insuffisant pour '{p.name}' (restant: {p.stock})."},
                    status=400,
                )

            unit_cents = _to_cents(p.price)
            total_cents += unit_cents * qty
            line_items.append((p, qty, unit_cents))

        order = Order.objects.create(
            user=request.user if getattr(request, "user", None) and request.user.is_authenticated else None,
            full_name=full_name,
            email=email,
            phone=phone,
            pickup_time=pickup_time,
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

    # Paiement Payplug APRÈS commit
    if not settings.PAYPLUG_SECRET_KEY:
        return Response({"detail": "PAYPLUG_SECRET_KEY missing."}, status=500)

    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    # L'URL de retour utilise le token public (non devinable), pas l'ID.
    return_url = f"{settings.FRONTEND_BASE_URL}/success?order={order.public_token}"
    cancel_url = f"{settings.FRONTEND_BASE_URL}/cancel?order_id={order.id}"
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
        "metadata": {"order_id": str(order.id), "phone": phone, "pickup_time": pickup_time},
    }

    try:
        payment = payplug.Payment.create(**payment_data)
    except Exception as e:
        return Response({"detail": f"Payplug error: {str(e)}"}, status=400)

    with transaction.atomic():
        order.payment_id = str(getattr(payment, "id", "")) or order.payment_id
        order.payment_url = payment.hosted_payment.payment_url
        order.save(update_fields=["payment_id", "payment_url"])

    return Response({"order_id": order.id, "payment_url": order.payment_url}, status=201)





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


class OrderDetailView(RetrieveAPIView):
    """Consultation publique d'une commande via son token UUID (non devinable)."""
    queryset = Order.objects.prefetch_related("items")
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]


@api_view(["POST"])
@permission_classes([AllowAny])
def verify_payment(request, pk):
    """
    Pull-based payment verification — ne dépend pas de l'IPN Payplug.
    Appelé par la page /success pour confirmer le paiement même si IPN retardée
    ou injoignable (ex: dev localhost).
    """
    try:
        order = Order.objects.get(id=pk)
    except Order.DoesNotExist:
        return Response({"detail": "Commande introuvable."}, status=404)

    if order.status == "paid":
        return Response(OrderSerializer(order).data)

    if not order.payment_id:
        return Response(OrderSerializer(order).data)

    if not settings.PAYPLUG_SECRET_KEY:
        return Response({"detail": "PAYPLUG_SECRET_KEY missing."}, status=500)

    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    try:
        payment = payplug.Payment.retrieve(order.payment_id)
    except Exception:
        return Response(OrderSerializer(order).data)

    is_paid  = bool(getattr(payment, "is_paid", False))
    amount   = getattr(payment, "amount", None)
    currency = getattr(payment, "currency", None)

    if not is_paid:
        return Response(OrderSerializer(order).data)
    if currency and currency != "EUR":
        return Response(OrderSerializer(order).data)
    if amount is None or int(amount) != int(order.total_cents):
        return Response(OrderSerializer(order).data)

    with transaction.atomic():
        o = Order.objects.select_for_update().get(id=order.id)
        if o.status != "paid":
            o.status = "paid"
            o.save(update_fields=["status"])
            _send_receipt_email(o)
        order = o

    return Response(OrderSerializer(order).data)
