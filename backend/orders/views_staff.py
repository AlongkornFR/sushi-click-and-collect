from django.contrib.auth import authenticate
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from .models import Order
from .serializers_staff import OrderStaffSerializer

ALLOWED_STATUSES = {"pending", "paid", "preparing", "ready", "collected", "cancelled"}


# ── Liste des commandes ────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_orders_list(request):
    qs = Order.objects.prefetch_related("items").order_by("-created_at")

    status_q = request.query_params.get("status")
    if status_q:
        qs = qs.filter(status=status_q)

    since = request.query_params.get("since")
    if since:
        dt = parse_datetime(since)
        if dt:
            qs = qs.filter(created_at__gte=dt)

    return Response(OrderStaffSerializer(qs, many=True).data)


# ── Commandes non encore imprimées ────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_orders_pending_print(request):
    """Retourne les commandes avec printed=False, ordonnées par date de création."""
    qs = (
        Order.objects
        .prefetch_related("items")
        .filter(printed=False)
        .exclude(status="cancelled")
        .order_by("created_at")
    )
    return Response(OrderStaffSerializer(qs, many=True).data)


# ── Marquer une commande comme imprimée ───────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_order_mark_printed(request, order_id: int):
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    order.printed    = True
    order.printed_at = timezone.now()
    order.save(update_fields=["printed", "printed_at"])
    return Response({"ok": True, "id": order.id, "printed_at": order.printed_at})


# ── Changer le statut d'une commande ─────────────────────────────────────────

@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_order_set_status(request, order_id: int):
    new_status = (request.data or {}).get("status")
    if new_status not in ALLOWED_STATUSES:
        return Response({"detail": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    order.status = new_status
    order.save(update_fields=["status"])
    return Response({"ok": True, "id": order.id, "status": order.status})


# ── Supprimer une commande ────────────────────────────────────────────────────

@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def staff_order_delete(request, order_id: int):
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    order.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


# ── Authentification staff ────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def staff_login(request):
    data     = request.data or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return Response({"detail": "Missing credentials"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    if not (user.is_staff or user.is_superuser):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_me(request):
    u = request.user
    return Response({
        "id":           u.id,
        "username":     u.username,
        "email":        u.email,
        "is_staff":     u.is_staff,
        "is_superuser": u.is_superuser,
    })
