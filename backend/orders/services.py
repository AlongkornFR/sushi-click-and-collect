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
