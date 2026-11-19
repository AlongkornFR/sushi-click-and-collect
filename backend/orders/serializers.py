from rest_framework import serializers
from .models import Order, OrderItem
from .opening_hours import pickup_label

class OrderItemSerializer(serializers.ModelSerializer):
    line_total_cents = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product_id", "product_name", "unit_price_cents", "quantity", "line_total_cents"]

    def get_line_total_cents(self, obj):
        return obj.unit_price_cents * obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    pickup_label = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            # payment_id et notes ne sont plus exposés publiquement (lot C5) :
            # la note peut contenir des informations de santé (allergies).
            "id", "status", "total_cents", "pickup_time", "pickup_at", "pickup_label",
            "payment_provider", "payment_url", "created_at",
            "items",
        ]

    def get_pickup_label(self, obj):
        return pickup_label(obj)


class OrderStatusSerializer(serializers.ModelSerializer):
    """Réponse minimale des anciennes routes par ID."""

    class Meta:
        model = Order
        fields = ["id", "status"]
