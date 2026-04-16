from rest_framework import serializers
from .models import Product, Category, SubCategory


class StaffCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "position")


class StaffSubCategorySerializer(serializers.ModelSerializer):
    category = StaffCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.all(),
        write_only=True,
    )

    class Meta:
        model = SubCategory
        fields = ("id", "name", "slug", "category", "category_id", "position")


class StaffProductSerializer(serializers.ModelSerializer):
    category = StaffCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source="category",
        queryset=Category.objects.all(),
        write_only=True,
        allow_null=True,
        required=False,
    )

    subcategory = StaffSubCategorySerializer(read_only=True)
    subcategory_id = serializers.PrimaryKeyRelatedField(
    source="subcategory",
    queryset=SubCategory.objects.all(),
    write_only=True,
    required=True,
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
            "subcategory",
            "subcategory_id",
            "position",
        )

    def get_price_cents(self, obj):
        return int(round(float(obj.price) * 100))

    def validate(self, attrs):
        category = attrs.get("category", getattr(self.instance, "category", None))
        subcategory = attrs.get("subcategory", getattr(self.instance, "subcategory", None))

        if subcategory and not category:
            raise serializers.ValidationError({
                "subcategory_id": "Une sous-catégorie nécessite une catégorie."
            })

        if category and subcategory and subcategory.category_id != category.id:
            raise serializers.ValidationError({
                "subcategory_id": "Cette sous-catégorie n'appartient pas à la catégorie sélectionnée."
            })

        return attrs