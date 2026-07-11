from rest_framework import serializers

from .models import AuditLog, LoyaltyAccount, LoyaltyTransaction


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    public_id = serializers.UUIDField(read_only=True)
    customer_number = serializers.CharField(read_only=True)
    reward_available = serializers.BooleanField(read_only=True)
    max_points = serializers.SerializerMethodField()
    first_name = serializers.CharField(source="customer.user.first_name", read_only=True)
    last_name = serializers.CharField(source="customer.user.last_name", read_only=True)

    class Meta:
        model = LoyaltyAccount
        fields = [
            "public_id", "customer_number", "first_name", "last_name",
            "points", "max_points", "reward_available", "created_at", "updated_at",
        ]

    def get_max_points(self, obj):
        return obj.MAX_POINTS


class LoyaltyAccountStaffSerializer(LoyaltyAccountSerializer):
    email = serializers.EmailField(source="customer.user.email", read_only=True)
    phone = serializers.CharField(source="customer.phone", read_only=True)

    class Meta(LoyaltyAccountSerializer.Meta):
        fields = LoyaltyAccountSerializer.Meta.fields + ["email", "phone"]


class LoyaltyTransactionSerializer(serializers.ModelSerializer):
    transaction_id = serializers.UUIDField(read_only=True)
    admin_username = serializers.CharField(source="admin_user.username", read_only=True, default=None)
    order_total_cents = serializers.IntegerField(source="order.total_cents", read_only=True, default=None)

    class Meta:
        model = LoyaltyTransaction
        fields = [
            "transaction_id", "delta", "source", "store", "reason",
            "balance_after", "admin_username", "order_total_cents", "created_at",
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)
    account_public_id = serializers.UUIDField(source="account.public_id", read_only=True)

    class Meta:
        model = AuditLog
        fields = ["action", "delta", "metadata", "actor_username", "account_public_id", "created_at"]


class ScanSerializer(serializers.Serializer):
    payload = serializers.CharField(max_length=500)


class AddPointSerializer(serializers.Serializer):
    public_id = serializers.UUIDField()
    store = serializers.CharField(required=False, allow_blank=True, max_length=120, default="")
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255, default="")
    client_request_id = serializers.UUIDField(required=False, allow_null=True, default=None)


class AccountActionSerializer(serializers.Serializer):
    public_id = serializers.UUIDField()
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255, default="")
