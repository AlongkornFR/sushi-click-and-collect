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

    if not full_name or not email or not pickup_time:
        return Response({"detail": "Champs client invalides."}, status=400)
    if not isinstance(items, list) or len(items) == 0:
        return Response({"detail": "Panier vide."}, status=400)

    # Validation items
    wanted = []
    product_ids = []
    for it in items:
        pid = it.get("product_id")
        qty = int(it.get("quantity") or 0)
        if not pid or qty <= 0:
            return Response({"detail": "Item invalide."}, status=400)
        wanted.append((int(pid), qty))
        product_ids.append(int(pid))

    # ✅ Transaction : lock produits -> check stock -> décrément -> créer order/items
    with transaction.atomic():
        db_products = Product.objects.select_for_update().filter(id__in=product_ids, is_available=True)
        db_map = {p.id: p for p in db_products}

        line_items = []
        total_cents = 0

        for pid, qty in wanted:
            p = db_map.get(pid)
            if not p:
                return Response({"detail": f"Produit indisponible (id={pid})."}, status=400)

            # ⚠️ adapte le nom du champ stock si besoin
            if hasattr(p, "stock") and p.stock is not None:
                if p.stock < qty:
                    return Response(
                        {"detail": f"Stock insuffisant pour '{p.name}' (restant: {p.stock})."},
                        status=400
                    )
                # décrément
                p.stock -= qty
                p.save(update_fields=["stock"])

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

    # ✅ Paiement Payplug APRÈS commit (comme tu fais déjà)
    if not settings.PAYPLUG_SECRET_KEY:
        return Response({"detail": "PAYPLUG_SECRET_KEY missing."}, status=500)

    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)

    return_url = f"{settings.FRONTEND_BASE_URL}/success?order_id={order.id}"
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


def _send_receipt_email(order):
    api_key    = getattr(settings, "RESEND_API_KEY", "")
    from_email = getattr(settings, "RESEND_FROM_EMAIL", "")
    if not api_key or not from_email:
        return

    try:
        pdf_bytes = generate_receipt_pdf(order)
        pdf_b64   = base64.b64encode(pdf_bytes).decode()
    except Exception:
        return

    created = order.created_at.strftime("%d/%m/%Y à %H:%M")
    total   = f"{order.total_cents / 100:.2f} €"

    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111">Su-Rice — Merci pour votre commande !</h2>
      <p style="color:#555;font-size:14px;margin:0 0 24px">Votre reçu est joint à cet email en PDF.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
        <tr><td style="padding:6px 0;font-weight:600;color:#111;width:140px">Commande</td><td>#{order.id}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#111">Date</td><td>{created}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#111">Retrait</td><td>{order.pickup_time}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#111">Total</td><td><strong>{total}</strong></td></tr>
      </table>

      <div style="margin-top:24px;padding:16px;background:#fff;border-radius:8px;border:1px solid #eee">
        <p style="margin:0 0 8px;font-weight:600;font-size:13px;color:#111">Détail de la commande</p>
        {"".join(
            f'<p style="margin:4px 0;font-size:13px;color:#555">{item.quantity}x {item.product_name} — {item.line_total_cents()/100:.2f} €</p>'
            for item in order.items.all()
        )}
      </div>

      <p style="margin-top:24px;font-size:12px;color:#999;text-align:center">
        Su-Rice · Cannes · contact@su-rice.com
      </p>
    </div>
    """

    try:
        http_requests.post(
            "https://api.resend.com/emails",
            json={
                "from":        from_email,
                "to":          [order.email],
                "subject":     f"Su-Rice — Reçu commande #{order.id}",
                "html":        html,
                "attachments": [{
                    "filename": f"recu-surice-{order.id}.pdf",
                    "content":  pdf_b64,
                }],
            },
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
    except Exception:
        pass


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

        # Idempotent
        if order.status == "paid":
            return Response({"ok": True, "already_paid": True}, status=status.HTTP_200_OK)

        # 3) On valide uniquement si Payplug confirme
        if is_paid:
            order.status = "paid"
            # on resync au cas où
            order.payment_id = str(payment_id)
            order.save(update_fields=["status", "payment_id"])
            _send_receipt_email(order)
            return Response({"ok": True, "paid": True}, status=status.HTTP_200_OK)

    return Response({"ok": True, "paid": False}, status=status.HTTP_200_OK)

from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny
from .models import Order
from .serializers import OrderSerializer

class OrderDetailView(RetrieveAPIView):
    queryset = Order.objects.all()
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
