from functools import partial

from django.conf import settings
from django.db import transaction

from .models import AuditLog, LoyaltyAccount, LoyaltyTransaction, QRToken
from .qr import build_payload, generate_secret

THRESHOLD_CENTS = getattr(settings, "LOYALTY_POINT_THRESHOLD_CENTS", 1600)
MAX_POINTS = getattr(settings, "LOYALTY_MAX_POINTS", 10)


class LoyaltyError(Exception):
    def __init__(self, code, message):
        self.code = code
        self.message = message
        super().__init__(message)


def _log(account, action, delta, actor=None, metadata=None, ip_address=None):
    AuditLog.objects.create(
        actor=actor,
        account=account,
        action=action,
        delta=delta,
        metadata=metadata or {},
        ip_address=ip_address,
    )


def get_or_create_account(customer) -> LoyaltyAccount:
    account, created = LoyaltyAccount.objects.get_or_create(customer=customer)
    if created or not account.qr_tokens.filter(is_active=True).exists():
        _issue_qr_token(account, version=1)
    return account


def _issue_qr_token(account: LoyaltyAccount, version: int) -> QRToken:
    QRToken.objects.filter(account=account, is_active=True).update(is_active=False)
    return QRToken.objects.create(account=account, secret_encrypted=generate_secret(), version=version, is_active=True)


def current_qr_payload(account: LoyaltyAccount) -> str:
    token = account.qr_tokens.filter(is_active=True).first()
    if not token:
        token = _issue_qr_token(account, version=1)
    return build_payload(account.public_id, token.version, token.secret_encrypted)


def regenerate_qr(account: LoyaltyAccount, actor=None, ip_address=None) -> str:
    with transaction.atomic():
        account = LoyaltyAccount.objects.select_for_update().get(pk=account.pk)
        current = account.qr_tokens.filter(is_active=True).first()
        next_version = (current.version + 1) if current else 1
        if current:
            from django.utils import timezone
            current.is_active = False
            current.revoked_at = timezone.now()
            current.save(update_fields=["is_active", "revoked_at"])
        token = QRToken.objects.create(account=account, secret_encrypted=generate_secret(), version=next_version, is_active=True)
        _log(account, "regenerate_qr", 0, actor=actor, metadata={"version": next_version}, ip_address=ip_address)
    return build_payload(account.public_id, token.version, token.secret_encrypted)


def award_point_for_order(order) -> LoyaltyTransaction | None:
    """Online purchase path. Idempotent per order (unique FK). Returns the
    transaction if a point was awarded, else None (guest order, below
    threshold, already awarded, or card already full)."""
    if order.user_id is None:
        return None
    if order.total_cents < THRESHOLD_CENTS:
        return None
    if not hasattr(order.user, "customer"):
        return None

    with transaction.atomic():
        if LoyaltyTransaction.objects.filter(order=order).exists():
            return None

        account = LoyaltyAccount.objects.select_for_update().get_or_create(customer=order.user.customer)[0]
        if not account.qr_tokens.filter(is_active=True).exists():
            _issue_qr_token(account, version=1)

        if account.points >= MAX_POINTS:
            _log(account, "award_skipped_card_full", 0, metadata={"order_id": order.id})
            return None

        account.points += 1
        account.save(update_fields=["points", "updated_at"])

        txn = LoyaltyTransaction.objects.create(
            account=account,
            delta=1,
            source="online",
            order=order,
            balance_after=account.points,
        )
        _log(account, "add_point_online", 1, metadata={"order_id": order.id, "transaction_id": str(txn.transaction_id)})

    # Lot M1 : notification après validation de la transaction englobante.
    transaction.on_commit(partial(_notify_after_award, account, txn))
    return txn


def admin_add_point(account: LoyaltyAccount, admin_user, store="", reason="", client_request_id=None, ip_address=None) -> LoyaltyTransaction:
    if client_request_id is not None:
        existing = LoyaltyTransaction.objects.filter(client_request_id=client_request_id).first()
        if existing is not None:
            return existing

    with transaction.atomic():
        account = LoyaltyAccount.objects.select_for_update().get(pk=account.pk)
        if account.points >= MAX_POINTS:
            raise LoyaltyError("card_full", "Card already has the maximum number of points — redeem the reward first.")

        account.points += 1
        account.save(update_fields=["points", "updated_at"])

        txn = LoyaltyTransaction.objects.create(
            account=account,
            delta=1,
            source="in_store",
            admin_user=admin_user,
            client_request_id=client_request_id,
            store=store,
            reason=reason,
            balance_after=account.points,
        )
        _log(account, "add_point_in_store", 1, actor=admin_user, metadata={"store": store, "reason": reason}, ip_address=ip_address)

    # Lot M1 : notification après validation de la transaction englobante.
    transaction.on_commit(partial(_notify_after_award, account, txn))
    return txn


def admin_remove_point(account: LoyaltyAccount, admin_user, reason="", ip_address=None) -> LoyaltyTransaction:
    with transaction.atomic():
        account = LoyaltyAccount.objects.select_for_update().get(pk=account.pk)
        if account.points <= 0:
            raise LoyaltyError("card_empty", "Card has no points to remove.")

        account.points -= 1
        account.save(update_fields=["points", "updated_at"])

        txn = LoyaltyTransaction.objects.create(
            account=account,
            delta=-1,
            source="adjustment",
            admin_user=admin_user,
            reason=reason,
            balance_after=account.points,
        )
        _log(account, "remove_point", -1, actor=admin_user, metadata={"reason": reason}, ip_address=ip_address)
    return txn


def redeem_reward(account: LoyaltyAccount, admin_user, ip_address=None) -> LoyaltyTransaction:
    with transaction.atomic():
        account = LoyaltyAccount.objects.select_for_update().get(pk=account.pk)
        if account.points < MAX_POINTS:
            raise LoyaltyError("not_full", "Card is not full yet — reward is not redeemable.")

        delta = -account.points
        account.points = 0
        account.save(update_fields=["points", "updated_at"])

        txn = LoyaltyTransaction.objects.create(
            account=account,
            delta=delta,
            source="redeem",
            admin_user=admin_user,
            balance_after=0,
        )
        _log(account, "redeem_reward", delta, actor=admin_user, ip_address=ip_address)

    transaction.on_commit(partial(_notify_reward_redeemed, account))
    return txn


def reset_card(account: LoyaltyAccount, admin_user, reason="", ip_address=None) -> LoyaltyTransaction:
    with transaction.atomic():
        account = LoyaltyAccount.objects.select_for_update().get(pk=account.pk)
        delta = -account.points
        account.points = 0
        account.save(update_fields=["points", "updated_at"])

        txn = LoyaltyTransaction.objects.create(
            account=account,
            delta=delta,
            source="reset",
            admin_user=admin_user,
            reason=reason,
            balance_after=0,
        )
        _log(account, "reset_card", delta, actor=admin_user, metadata={"reason": reason}, ip_address=ip_address)
    return txn


def _notify_after_award(account: LoyaltyAccount, txn: LoyaltyTransaction):
    from . import emails

    if account.points >= MAX_POINTS:
        emails.notify_reward_unlocked(account)
    else:
        emails.notify_point_earned(account, txn)


def _notify_reward_redeemed(account: LoyaltyAccount):
    from . import emails

    emails.notify_reward_redeemed(account)
