from rest_framework import serializers
from .models import Order, OrderItem

class OrderItemSerializer(serializers.ModelSerializer):
    line_total_cents = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product_id", "product_name", "unit_price_cents", "quantity", "line_total_cents"]

    def get_line_total_cents(self, obj):
        return obj.unit_price_cents * obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "status", "total_cents", "pickup_time", "notes",
            "payment_provider", "payment_id", "payment_url", "created_at",
            "items",
        ]
