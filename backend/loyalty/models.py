import uuid

from django.conf import settings
from django.db import models

from customers.models import Customer
from orders.models import Order

from .crypto import EncryptedTextField


class LoyaltyAccount(models.Model):
    MAX_POINTS = 10

    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name="loyaltyaccount")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    points = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LoyaltyAccount {self.public_id} ({self.points}/{self.MAX_POINTS})"

    @property
    def reward_available(self):
        return self.points >= self.MAX_POINTS

    @property
    def customer_number(self):
        return f"SR-{str(self.public_id).replace('-', '')[:8].upper()}"


class QRToken(models.Model):
    account = models.ForeignKey(LoyaltyAccount, on_delete=models.CASCADE, related_name="qr_tokens")
    secret_encrypted = EncryptedTextField()
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["account"],
                condition=models.Q(is_active=True),
                name="unique_active_qrtoken_per_account",
            )
        ]

    def __str__(self):
        return f"QRToken account={self.account_id} v{self.version} active={self.is_active}"


class LoyaltyTransaction(models.Model):
    SOURCE_CHOICES = [
        ("online", "Online purchase"),
        ("in_store", "In-store (staff)"),
        ("redeem", "Reward redeemed"),
        ("reset", "Reset"),
        ("adjustment", "Manual adjustment"),
    ]

    transaction_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    account = models.ForeignKey(LoyaltyAccount, on_delete=models.CASCADE, related_name="transactions")
    delta = models.IntegerField()
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    order = models.OneToOneField(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="loyalty_transaction")
    admin_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="loyalty_actions")
    client_request_id = models.UUIDField(null=True, blank=True, unique=True)
    store = models.CharField(max_length=120, blank=True, default="")
    reason = models.CharField(max_length=255, blank=True, default="")
    balance_after = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Txn {self.transaction_id} {self.source} {self.delta:+d} -> {self.balance_after}"


class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="loyalty_audit_entries")
    account = models.ForeignKey(LoyaltyAccount, on_delete=models.CASCADE, related_name="audit_logs")
    action = models.CharField(max_length=40)
    delta = models.IntegerField(default=0)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"AuditLog {self.action} account={self.account_id} at={self.created_at}"
