from rest_framework import serializers
from .models import Product, Category


class StaffCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class StaffProductSerializer(serializers.ModelSerializer):
    category = StaffCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )
    price_cents = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "description",
            "price",
            "price_cents",
            "stock",
            "is_available",
            "image_main",
            "category",
            "category_id",
        )

    def get_price_cents(self, obj):
        return int(round(float(obj.price) * 100))