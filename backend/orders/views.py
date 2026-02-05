from django.shortcuts import render

# Create your views here.
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

def split_name(full_name: str):
    parts = (full_name or "").strip().split()
    if not parts:
        return "Client", " "
    if len(parts) == 1:
        return parts[0], " "
    return parts[0], " ".join(parts[1:])



def _to_cents(decimal_price):
    # decimal_price: Decimal("12.50") -> 1250
    return int(round(float(decimal_price) * 100))

@api_view(["POST"])
@permission_classes([AllowAny])
def checkout(request):
    """
    Body attendu:
    {
      "customer": {"full_name": "...", "email": "...", "phone": "..."},
      "pickup_time": "18:30",
      "notes": "",
      "items": [{"product_id": 1, "quantity": 2}, ...]
    }
    """
    data = request.data or {}
    customer = data.get("customer") or {}
    items = data.get("items") or []

    full_name = (customer.get("full_name") or "").strip()
    email = (customer.get("email") or "").strip()
    phone = (customer.get("phone") or "").strip()
    pickup_time = (data.get("pickup_time") or "").strip()
    notes = (data.get("notes") or "").strip()

    if not full_name or not email or not phone or not pickup_time:
        return Response({"detail": "Champs client invalides."}, status=status.HTTP_400_BAD_REQUEST)
    if not isinstance(items, list) or len(items) == 0:
        return Response({"detail": "Panier vide."}, status=status.HTTP_400_BAD_REQUEST)

    # 1) Recalcul total côté serveur
    product_ids = [it.get("product_id") for it in items]
    db_products = Product.objects.filter(id__in=product_ids, is_available=True)
    db_map = {p.id: p for p in db_products}

    line_items = []
    total_cents = 0

    for it in items:
        pid = it.get("product_id")
        qty = int(it.get("quantity") or 0)
        if not pid or qty <= 0:
            return Response({"detail": "Item invalide."}, status=status.HTTP_400_BAD_REQUEST)

        p = db_map.get(pid)
        if not p:
            return Response({"detail": f"Produit indisponible (id={pid})."}, status=status.HTTP_400_BAD_REQUEST)

        unit_cents = _to_cents(p.price)
        line_total = unit_cents * qty
        total_cents += line_total

        line_items.append((p, qty, unit_cents))

    if total_cents <= 0:
        return Response({"detail": "Total invalide."}, status=status.HTTP_400_BAD_REQUEST)

    # 2) Créer Order + Items
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
        
        if not settings.PAYPLUG_SECRET_KEY:
         return Response({"detail": "PAYPLUG_SECRET_KEY missing in server env."}, status=500)
        # 3) Créer paiement Payplug (hosted payment -> payment_url)
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
    "hosted_payment": {
        "return_url": return_url,
        "cancel_url": cancel_url,
    },
    # "notification_url": notification_url,  # remettra avec tunnel plus tard
    "metadata": {
        "order_id": str(order.id),
        "phone": phone,               # ✅ on garde le tel ici
        "pickup_time": pickup_time,   # ✅ utile côté resto
    },
}

        
        


        try:
            payment = payplug.Payment.create(**payment_data)
        except Exception as e:
            return Response({"detail": f"Payplug error: {str(e)}"}, status=400)
        
        order.payment_id = str(payment.id)
        order.payment_url = payment.hosted_payment.payment_url
        order.save(update_fields=["payment_id", "payment_url"])

    return Response(
        {"order_id": order.id, "payment_url": order.payment_url},
        status=status.HTTP_201_CREATED,
    )






# orders/views.py (suite)
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def payplug_ipn(request):
    """
    Payplug envoie un POST contenant l'objet payment.
    On traite via payplug.notifications.treat(raw_body).
    """
    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    raw = request.body  # bytes
    try:
        resource = payplug.notifications.treat(raw)
    except Exception:
        return Response({"detail": "Invalid notification."}, status=400)

    # Exemple doc : resource.object == 'payment' and resource.is_paid :contentReference[oaicite:5]{index=5}
    if getattr(resource, "object", None) == "payment":
        order_id = None
        try:
            order_id = resource.metadata.get("order_id")
        except Exception:
            order_id = None

        if order_id:
            try:
                order = Order.objects.get(id=int(order_id))
            except Order.DoesNotExist:
                return Response({"detail": "Order not found."}, status=200)

            if getattr(resource, "is_paid", False):
                if order.status != "paid":
                    order.status = "paid"
                    order.save(update_fields=["status"])
            else:
                # paiement non payé / échoué : on laisse pending ou on peut passer cancelled selon ton choix
                pass

    return Response({"ok": True}, status=200)
