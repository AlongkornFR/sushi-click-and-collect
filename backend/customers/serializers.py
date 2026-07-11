from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Customer
from orders.models import Order


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Email déjà utilisé.")
        return value.lower()


class CustomerProfileSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(source="id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)

    class Meta:
        model = Customer
        fields = ["customer_id", "email", "first_name", "last_name", "phone", "date_joined"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "first_name" in user_data:
            instance.user.first_name = user_data["first_name"]
        if "last_name" in user_data:
            instance.user.last_name = user_data["last_name"]
        instance.user.save()
        instance.phone = validated_data.get("phone", instance.phone)
        instance.save()
        return instance


class OrderItemSummarySerializer(serializers.Serializer):
    name = serializers.CharField(source="product_name")
    quantity = serializers.IntegerField()
    unit_price_cents = serializers.IntegerField()


class OrderHistorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "status", "total_cents", "created_at", "pickup_time", "items"]

    def get_items(self, obj):
        return [
            {
                "name": item.product_name,
                "quantity": item.quantity,
                "unit_price_cents": item.unit_price_cents,
            }
            for item in obj.items.all()
        ]


class StaffCustomerSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    is_active = serializers.BooleanField(source="user.is_active")
    date_joined = serializers.DateTimeField(source="user.date_joined")
    order_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ["id", "email", "first_name", "last_name", "phone", "is_active", "date_joined", "order_count"]

    def get_order_count(self, obj):
        return Order.objects.filter(user=obj.user).count()
