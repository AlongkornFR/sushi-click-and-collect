from datetime import timedelta

from functools import partial

from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from backend.throttles import LoginThrottle
from .models import Order
from .serializers_staff import OrderStaffSerializer
from .emails import send_order_status_email
from .services import (
    PAUSE_DURATIONS_MINUTES,
    expire_stale_pending_orders_throttled,
    on_paid_order_cancelled,
    ordering_pause_state,
    pause_ordering,
    resume_ordering,
)

ALLOWED_STATUSES = {"pending", "paid", "preparing", "ready", "collected", "cancelled"}

STATUS_LABELS = {
    "pending": "Non payée", "paid": "Payée", "preparing": "En préparation",
    "ready": "Prête", "collected": "Récupérée", "cancelled": "Annulée",
}
PAID_STATUSES = {"paid", "preparing", "ready", "collected"}

# Lot M2 : transitions autorisées depuis l'écran staff. Le passage en
# « payée » n'est jamais manuel (seul Payplug le décide). Un pas en arrière
# reste possible pour corriger une erreur de clic.
ALLOWED_TRANSITIONS = {
    "pending":   {"cancelled"},
    "paid":      {"preparing", "cancelled"},
    "preparing": {"ready", "paid", "cancelled"},
    "ready":     {"collected", "preparing", "cancelled"},
    "collected": {"ready"},
    "cancelled": set(),
}
# Seules les commandes payées et encore en cours partent en cuisine.
PRINTABLE_STATUSES = ("paid", "preparing", "ready")
# Commandes encore à traiter : toujours affichées, quel que soit leur âge.
ACTIVE_STATUSES = ("paid", "preparing", "ready")
# Fenêtre par défaut de l'écran staff (lot H7).
DEFAULT_WINDOW = timedelta(hours=24)
# Plafond de l'historique complet, pour garder une réponse raisonnable.
HISTORY_LIMIT = 500

# Le passage automatique en "collected" après 2 h a été supprimé (décision
# du 19/11/2026) : un client peut venir plus tard, c'est le staff qui
# marque la commande comme récupérée.


# ── Liste des commandes ────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_orders_list(request):
    """Par défaut : commandes des dernières 24 h + toutes les commandes en
    cours. ?scope=all renvoie l'historique (les 500 plus récentes)."""
    # Lot M3 : annule les commandes non payées depuis plus de 60 min
    # (au plus une fois par minute, Payplug vérifié avant).
    expire_stale_pending_orders_throttled()

    qs = Order.objects.prefetch_related("items").order_by("-created_at")

    scope_all = request.query_params.get("scope") == "all"
    if not scope_all:
        recent = timezone.now() - DEFAULT_WINDOW
        qs = qs.filter(Q(created_at__gte=recent) | Q(status__in=ACTIVE_STATUSES))

    status_q = request.query_params.get("status")
    if status_q:
        qs = qs.filter(status=status_q)

    since = request.query_params.get("since")
    if since:
        dt = parse_datetime(since)
        if dt:
            qs = qs.filter(created_at__gte=dt)

    if scope_all:
        qs = qs[:HISTORY_LIMIT]
    return Response(OrderStaffSerializer(qs, many=True).data)


# ── Commandes non encore imprimées ────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_orders_pending_print(request):
    """Commandes payées non encore imprimées, par date de création.

    Une commande "pending" n'est pas payée : elle ne doit jamais partir en cuisine.
    """
    qs = (
        Order.objects
        .prefetch_related("items")
        .filter(printed=False, status__in=PRINTABLE_STATUSES)
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
        return Response({"detail": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)

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
        return Response({"detail": "Statut inconnu."}, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        try:
            order = Order.objects.select_for_update().get(id=order_id)
        except Order.DoesNotExist:
            return Response({"detail": "Commande introuvable."}, status=status.HTTP_404_NOT_FOUND)

        old_status = order.status
        if new_status == old_status:
            return Response({"ok": True, "id": order.id, "status": order.status, "ready_at": order.ready_at})
        if new_status not in ALLOWED_TRANSITIONS[old_status]:
            return Response(
                {"detail": f"Impossible de passer de « {STATUS_LABELS[old_status]} » à « {STATUS_LABELS[new_status]} »."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.status = new_status
        update_fields = ["status"]
        if new_status == "ready":
            order.ready_at = timezone.now()
            update_fields.append("ready_at")
        elif new_status in {"collected", "cancelled", "preparing"} and order.ready_at is not None:
            order.ready_at = None
            update_fields.append("ready_at")
        order.save(update_fields=update_fields)

        # Une commande payée puis annulée doit être remboursée à la main sur Payplug.
        refund_needed = new_status == "cancelled" and old_status in PAID_STATUSES
        if refund_needed:
            on_paid_order_cancelled(order, actor=request.user)

        transaction.on_commit(partial(send_order_status_email, order, status=new_status))

    return Response({
        "ok": True, "id": order.id, "status": order.status, "ready_at": order.ready_at,
        "refund_needed": refund_needed,
    })


# ── Suppression désactivée (lot M2) ───────────────────────────────────────────
# Supprimer effaçait la commande, ses lignes et le lien avec la fidélité.
# La route reste pour ne pas casser d'ancien client, mais renvoie une erreur :
# on annule une commande, on ne l'efface plus.

@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def staff_order_delete(request, order_id: int):
    return Response(
        {"detail": "La suppression est désactivée : annulez la commande à la place."},
        status=status.HTTP_400_BAD_REQUEST,
    )


# ── Authentification staff ────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def staff_login(request):
    data     = request.data or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return Response({"detail": "Indiquez l'identifiant et le mot de passe."}, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(username=username, password=password)
    if not user:
        return Response({"detail": "Identifiant ou mot de passe incorrect."}, status=status.HTTP_401_UNAUTHORIZED)

    if not (user.is_staff or user.is_superuser):
        return Response({"detail": "Ce compte n'a pas accès à l'espace staff."}, status=status.HTTP_403_FORBIDDEN)

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


# ── Pause des commandes en ligne (lot A3) ─────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAdminUser])
def staff_ordering_pause(request):
    """GET : état. POST {"action": "pause", "minutes": 15 | 60} ou
    {"action": "pause", "indefinite": true} ou {"action": "resume"}."""
    if request.method == "GET":
        return Response(ordering_pause_state())

    data = request.data or {}
    action = data.get("action")
    if action == "resume":
        return Response(resume_ordering(actor=request.user))
    if action == "pause":
        if data.get("indefinite") is True:
            return Response(pause_ordering(minutes=None, actor=request.user))
        try:
            minutes = int(data.get("minutes"))
        except (TypeError, ValueError):
            minutes = None
        if minutes in PAUSE_DURATIONS_MINUTES:
            return Response(pause_ordering(minutes=minutes, actor=request.user))
        return Response({"detail": "Durée de pause invalide (15 ou 60 minutes, ou sans limite)."},
                        status=status.HTTP_400_BAD_REQUEST)
    return Response({"detail": "Action inconnue (pause ou resume)."}, status=status.HTTP_400_BAD_REQUEST)
