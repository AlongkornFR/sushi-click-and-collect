from django.contrib import admin

from .models import AuditLog, LoyaltyAccount, LoyaltyTransaction, QRToken


@admin.register(LoyaltyAccount)
class LoyaltyAccountAdmin(admin.ModelAdmin):
    list_display = ("public_id", "customer", "points", "reward_available", "updated_at")
    search_fields = ("public_id", "customer__user__email", "customer__user__first_name", "customer__user__last_name")
    readonly_fields = ("public_id", "created_at", "updated_at")


@admin.register(QRToken)
class QRTokenAdmin(admin.ModelAdmin):
    list_display = ("account", "version", "is_active", "created_at", "revoked_at")
    list_filter = ("is_active",)
    readonly_fields = ("secret_encrypted", "created_at")


@admin.register(LoyaltyTransaction)
class LoyaltyTransactionAdmin(admin.ModelAdmin):
    list_display = ("transaction_id", "account", "delta", "source", "balance_after", "admin_user", "store", "created_at")
    list_filter = ("source",)
    search_fields = ("transaction_id", "account__public_id", "store", "reason")
    readonly_fields = [f.name for f in LoyaltyTransaction._meta.fields]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "account", "actor", "delta", "created_at")
    list_filter = ("action",)
    readonly_fields = [f.name for f in AuditLog._meta.fields]
