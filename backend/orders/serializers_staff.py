from rest_framework import serializers
from .models import Order, OrderItem
from .opening_hours import pickup_label

class OrderItemMiniSerializer(serializers.ModelSerializer):
    line_total_cents = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ("id", "product_name", "quantity", "unit_price_cents", "line_total_cents")

    def get_line_total_cents(self, obj):
        return obj.line_total_cents()

class OrderStaffSerializer(serializers.ModelSerializer):
    items     = OrderItemMiniSerializer(many=True, read_only=True)
    total_eur = serializers.SerializerMethodField()
    pickup_label = serializers.SerializerMethodField()
    # Lot A6 : lien vers la fiche client (null pour une commande invité)
    customer_id = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id", "created_at",
            "full_name", "phone", "email",
            "pickup_time", "pickup_at", "pickup_label", "notes",
            "status", "total_cents", "total_eur",
            "payment_id",
            "printed", "printed_at",
            "ready_at",
            "items",
            "customer_id",
        )

    def get_customer_id(self, obj):
        customer = getattr(obj.user, "customer", None) if obj.user_id else None
        return customer.id if customer else None

    def get_pickup_label(self, obj):
        return pickup_label(obj)

    def get_total_eur(self, obj):
        return round(obj.total_cents / 100, 2)
