from rest_framework import serializers
from .models import Product

class StaffProductSerializer(serializers.ModelSerializer):
    price_cents = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "stock", "is_available", "price_cents")

    def get_price_cents(self, obj):
        # obj.price est très souvent un Decimal -> conversion safe
        return int(round(float(obj.price) * 100))
