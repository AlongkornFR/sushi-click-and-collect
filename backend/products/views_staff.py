from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import Product, Category
from .serializers_staff import StaffProductSerializer, StaffCategorySerializer


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_categories_list(request):
    qs = Category.objects.all().order_by("name")
    return Response(StaffCategorySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_category_create(request):
    serializer = StaffCategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_products_list(request):
    q = (request.query_params.get("q") or "").strip()
    qs = Product.objects.select_related("category").all().order_by("name")

    if q:
        qs = qs.filter(
            Q(name__icontains=q) |
            Q(description__icontains=q) |
            Q(category__name__icontains=q)
        )

    return Response(StaffProductSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_product_create(request):
    data = request.data.copy()

    if "price_cents" in data and "price" not in data:
        try:
            data["price"] = str(int(data["price_cents"]) / 100)
        except Exception:
            return Response({"detail": "Invalid price_cents"}, status=400)

    serializer = StaffProductSerializer(data=data)
    if serializer.is_valid():
        product = serializer.save()
        return Response(StaffProductSerializer(product).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_product_update(request, product_id: int):
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    data = request.data.copy()

    if "price_cents" in data and "price" not in data:
        try:
            data["price"] = str(int(data["price_cents"]) / 100)
        except Exception:
            return Response({"detail": "Invalid price_cents"}, status=400)

    serializer = StaffProductSerializer(product, data=data, partial=True)
    if serializer.is_valid():
        product = serializer.save()
        return Response(StaffProductSerializer(product).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)