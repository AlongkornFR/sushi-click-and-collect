from rest_framework.generics import ListAPIView, RetrieveAPIView
from .models import Product, SubCategory
from .serializers import ProductSerializer, SubCategorySerializer


class ProductListView(ListAPIView):
    queryset = Product.objects.select_related("category", "subcategory").filter(is_available=True).order_by(
        "category__position", "category__name",
        "subcategory__position", "subcategory__name",
        "position", "name",
    )
    serializer_class = ProductSerializer


class ProductDetailView(RetrieveAPIView):
    queryset = Product.objects.select_related("category", "subcategory").filter(is_available=True)
    serializer_class = ProductSerializer
    lookup_field = "slug"


class SubCategoryListView(ListAPIView):
    serializer_class = SubCategorySerializer

    def get_queryset(self):
        qs = SubCategory.objects.select_related("category").all().order_by("position", "name")

        category_id = self.request.query_params.get("category_id")
        if category_id:
            qs = qs.filter(category_id=category_id)

        return qs