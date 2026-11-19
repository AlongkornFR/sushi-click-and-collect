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
