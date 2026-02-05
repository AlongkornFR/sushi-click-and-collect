# orders/views.py
import payplug
from django.conf import settings
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from products.models import Product
from .models import Order, OrderItem

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

    if not full_name or not email or not phone or not pickup_time:
        return Response({"detail": "Champs client invalides."}, status=400)
    if not isinstance(items, list) or len(items) == 0:
        return Response({"detail": "Panier vide."}, status=400)

    product_ids = [it.get("product_id") for it in items]
    db_products = Product.objects.filter(id__in=product_ids, is_available=True)
    db_map = {p.id: p for p in db_products}

    line_items = []
    total_cents = 0
    for it in items:
        pid = it.get("product_id")
        qty = int(it.get("quantity") or 0)
        if not pid or qty <= 0:
            return Response({"detail": "Item invalide."}, status=400)

        p = db_map.get(pid)
        if not p:
            return Response({"detail": f"Produit indisponible (id={pid})."}, status=400)

        unit_cents = _to_cents(p.price)
        total_cents += unit_cents * qty
        line_items.append((p, qty, unit_cents))

    # ✅ 1) Crée la commande et COMMIT d'abord
    with transaction.atomic():
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

    # ✅ 2) Crée le paiement Payplug APRÈS le commit
    if not settings.PAYPLUG_SECRET_KEY:
        return Response({"detail": "PAYPLUG_SECRET_KEY missing."}, status=500)

    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    return_url = f"{settings.FRONTEND_BASE_URL}/success?order_id={order.id}"
    cancel_url = f"{settings.FRONTEND_BASE_URL}/cancel?order_id={order.id}"
    notification_url = f"{settings.BACKEND_BASE_URL}/api/payplug/ipn/"

    first_name, last_name = split_name(full_name)

    payment_data = {
        "amount": total_cents,
        "currency": "EUR",
        "billing": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "address1": "Click & Collect",
            "postcode": "00000",
            "city": "—",
            "country": "FR",
        },
        "shipping": {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "address1": "Retrait sur place",
            "postcode": "00000",
            "city": "—",
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

    # ✅ 3) Sauve payment_id/url (petite transaction)
    with transaction.atomic():
        order.payment_id = str(getattr(payment, "id", ""))
        order.payment_url = payment.hosted_payment.payment_url
        order.save(update_fields=["payment_id", "payment_url"])

    return Response({"order_id": order.id, "payment_url": order.payment_url}, status=201)




# orders/views.py (suite)
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
import json

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def payplug_ipn(request):
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception as e:
        print("IPN JSON ERROR:", e)
        return Response({"detail": "Invalid JSON"}, status=400)

    print("IPN PAYLOAD:", payload)

    # Payplug envoie souvent directement l'objet payment
    if payload.get("object") != "payment":
        return Response({"ok": True}, status=200)

    payment_id = payload.get("id")
    is_paid = payload.get("is_paid")
    metadata = payload.get("metadata") or {}

    order_id = metadata.get("order_id")

    order = None
    if order_id:
        order = Order.objects.filter(id=int(order_id)).first()

    if not order and payment_id:
        order = Order.objects.filter(payment_id=payment_id).first()

    if not order:
        print("IPN: order not found", order_id, payment_id)
        return Response({"ok": True}, status=200)

    if is_paid:
        if order.status != "paid":
            order.status = "paid"
            order.save(update_fields=["status"])
            print("ORDER MARKED PAID:", order.id)

    return Response({"ok": True}, status=200)




from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from .models import Order
from .serializers import OrderSerializer

class OrderDetailView(RetrieveAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [AllowAny]
