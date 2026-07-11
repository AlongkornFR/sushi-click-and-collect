# orders/views_staff.py
from django.contrib.auth import authenticate
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from .models import Order
from .serializers_staff import OrderStaffSerializer

ALLOWED_STATUSES = {"pending", "paid", "preparing", "ready", "collected", "cancelled"}

DEFAULT_LIMIT = 200
MAX_LIMIT = 500


class StaffLoginThrottle(AnonRateThrottle):
    """Limite les tentatives de connexion staff (anti brute-force)."""
    scope = "staff_login"


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_orders_list(request):
    qs = Order.objects.prefetch_related("items").order_by("-created_at")

    # filtres optionnels
    status_q = request.query_params.get("status")
    if status_q:
        qs = qs.filter(status=status_q)

    since = request.query_params.get("since")
    if since:
        dt = parse_datetime(since)
        if dt:
            qs = qs.filter(created_at__gte=dt)

    # pagination simple (limit/offset), réponse inchangée : un tableau
    try:
        limit = min(int(request.query_params.get("limit", DEFAULT_LIMIT)), MAX_LIMIT)
        offset = max(int(request.query_params.get("offset", 0)), 0)
    except (TypeError, ValueError):
        limit, offset = DEFAULT_LIMIT, 0

    qs = qs[offset:offset + limit]
    return Response(OrderStaffSerializer(qs, many=True).data)


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


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([StaffLoginThrottle])
def staff_login(request):
    data = request.data or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return Response({"detail": "Missing credentials"}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    # IMPORTANT : n'autoriser que staff/superuser
    if not (user.is_staff or user.is_superuser):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key})


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_me(request):
    u = request.user
    return Response({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "is_staff": u.is_staff,
        "is_superuser": u.is_superuser,
    })
