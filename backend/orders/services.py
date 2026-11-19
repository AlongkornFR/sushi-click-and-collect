"""Règles métier partagées par les vues commandes."""
import logging

logger = logging.getLogger(__name__)


def on_paid_order_cancelled(order, actor=None):
    """Appelé quand le staff annule une commande déjà payée.

    Le remboursement Payplug reste manuel : on le trace dans les logs, et
    l'écran staff affiche un rappel.
    """
    logger.warning("Commande payée #%s annulée par %s : remboursement Payplug à faire (paiement %s).",
                   order.id, getattr(actor, "username", "?"), order.payment_id or "inconnu")
    mark_refund_needed(order)

    # Lot M11 : le point de fidélité gagné par cette commande est retiré.
    from loyalty.services import revoke_point_for_order  # import local : évite un import circulaire
    revoke_point_for_order(order, actor=actor)


def mark_refund_needed(order):
    """Lot A7 : la commande apparaît dans « Remboursements à faire »."""
    from .models import Order
    Order.objects.filter(pk=order.pk, refund_status="").update(refund_status="to_refund")


def mark_refunded(order):
    from django.utils import timezone as tz
    from .models import Order
    return Order.objects.filter(pk=order.pk, refund_status="to_refund").update(
        refund_status="refunded", refunded_at=tz.now())


# ── Expiration des commandes non payées (lot M3) ────────────────────────────
# Décision du 19/11/2026 : une commande restée « pending » plus de 60 minutes
# est annulée, sans email. Avant d'annuler, on interroge Payplug : si le
# client a payé entre-temps, la commande passe en « paid » à la place.

from datetime import timedelta

import payplug
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

PENDING_EXPIRY = timedelta(minutes=60)
SWEEP_EVERY_SECONDS = 60
SWEEP_LOCK_KEY = "orders:expire-pending:lock"


def _payplug_says_paid(order):
    """True / False selon Payplug, None si on ne peut pas savoir."""
    if not settings.PAYPLUG_SECRET_KEY:
        return None
    payplug.set_secret_key(settings.PAYPLUG_SECRET_KEY)
    payplug.set_api_version(settings.PAYPLUG_API_VERSION)
    try:
        payment = payplug.Payment.retrieve(order.payment_id)
    except Exception:
        logger.exception("Payplug injoignable pour la commande #%s : expiration reportée.", order.id)
        return None
    return bool(getattr(payment, "is_paid", False))


def expire_stale_pending_orders(now=None, limit=10):
    """Annule les commandes non payées depuis plus de 60 min. Renvoie (annulées, payées)."""
    from .models import Order
    from .views import _confirm_payment_if_paid  # import local : évite un import circulaire

    now = now or timezone.now()
    stale = list(
        Order.objects.filter(status="pending", created_at__lt=now - PENDING_EXPIRY).order_by("created_at")[:limit]
    )
    cancelled, paid = [], []
    for order in stale:
        if order.payment_id:
            is_paid = _payplug_says_paid(order)
            if is_paid is None:
                continue                      # on réessaiera au prochain passage
            if is_paid:
                if _confirm_payment_if_paid(order).status == "paid":
                    paid.append(order.id)
                continue
        # Aucun paiement : annulation sans email au client.
        if Order.objects.filter(pk=order.pk, status="pending").update(status="cancelled"):
            cancelled.append(order.id)
    if cancelled:
        logger.info("Commandes non payées expirées et annulées : %s", cancelled)
    return cancelled, paid


def expire_stale_pending_orders_throttled():
    """Version appelée par l'écran staff : au plus une fois par minute."""
    if not cache.add(SWEEP_LOCK_KEY, True, timeout=SWEEP_EVERY_SECONDS):
        return [], []
    return expire_stale_pending_orders()


# ── Pause des commandes en ligne (lot A3) ───────────────────────────────────

PAUSE_DURATIONS_MINUTES = (15, 60)
PAUSE_MESSAGE = (
    "Les commandes en ligne sont momentanément suspendues. "
    "Réessayez un peu plus tard ou appelez-nous au 04 93 68 08 12."
)


def ordering_pause_state(now=None):
    """État public de la pause : {paused, indefinite, until}."""
    from .models import OrderingPause

    pause = OrderingPause.current()
    active = pause.is_active(now)
    return {
        "paused": active,
        "indefinite": active and pause.indefinite,
        "until": pause.paused_until.isoformat() if active and not pause.indefinite and pause.paused_until else None,
        "message": PAUSE_MESSAGE if active else "",
    }


def pause_ordering(minutes=None, actor=None):
    """Met les commandes en pause : `minutes` = 15 ou 60, None = sans limite."""
    from .models import OrderingPause

    pause = OrderingPause.current()
    if minutes is None:
        pause.indefinite, pause.paused_until = True, None
    else:
        pause.indefinite, pause.paused_until = False, timezone.now() + timedelta(minutes=minutes)
    pause.updated_by = actor
    pause.save()
    logger.info("Commandes en ligne en pause (%s) par %s.",
                "sans limite" if minutes is None else f"{minutes} min", getattr(actor, "username", "?"))
    return ordering_pause_state()


def resume_ordering(actor=None):
    from .models import OrderingPause

    pause = OrderingPause.current()
    pause.indefinite, pause.paused_until, pause.updated_by = False, None, actor
    pause.save()
    logger.info("Commandes en ligne reprises par %s.", getattr(actor, "username", "?"))
    return ordering_pause_state()
