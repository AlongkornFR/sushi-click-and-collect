from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import Product
from .serializers_staff import StaffProductSerializer


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_products_list(request):
    q = (request.query_params.get("q") or "").strip()
    qs = Product.objects.all().order_by("name")

    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))

    return Response(StaffProductSerializer(qs, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_product_update(request, product_id: int):
    data = request.data or {}

    try:
        p = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)

    # stock
    if "stock" in data:
        try:
            stock = int(data["stock"])
            if stock < 0:
                raise ValueError()
            p.stock = stock
        except Exception:
            return Response({"detail": "Invalid stock"}, status=status.HTTP_400_BAD_REQUEST)

    # disponibilité
    if "is_available" in data:
        p.is_available = bool(data["is_available"])

    # prix (ta page envoie price_cents)
    if "price_cents" in data:
        try:
            cents = int(data["price_cents"])
            if cents < 0:
                raise ValueError()
            p.price = cents / 100  # DecimalField accepte float->Decimal généralement, sinon adapte
        except Exception:
            return Response({"detail": "Invalid price_cents"}, status=status.HTTP_400_BAD_REQUEST)

    p.save()
    return Response(StaffProductSerializer(p).data, status=status.HTTP_200_OK)
