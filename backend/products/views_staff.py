import json as _json
import urllib.error
import urllib.request

from django.conf import settings
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import Product, Category, SubCategory
from .serializers_staff import (
    StaffProductSerializer,
    StaffCategorySerializer,
    StaffSubCategorySerializer,
)


def _swap_positions(Model, obj_id, direction):
    try:
        obj = Model.objects.get(id=obj_id)
    except Model.DoesNotExist:
        return False, "Not found"
    ids = list(Model.objects.order_by("position", "name").values_list("id", flat=True))
    idx = ids.index(obj.id)
    if direction == "up" and idx == 0:
        return False, None
    if direction == "down" and idx == len(ids) - 1:
        return False, None
    n_idx = idx - 1 if direction == "up" else idx + 1
    neighbor = Model.objects.get(id=ids[n_idx])
    if obj.position == neighbor.position:
        obj.position, neighbor.position = idx, n_idx
    else:
        obj.position, neighbor.position = neighbor.position, obj.position
    obj.save(update_fields=["position"])
    neighbor.save(update_fields=["position"])
    return True, None


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_categories_list(request):
    qs = Category.objects.all().order_by("position", "name")
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
def staff_subcategories_list(request):
    category_id = request.query_params.get("category_id")

    qs = SubCategory.objects.select_related("category").all().order_by("position", "name")

    if category_id:
        qs = qs.filter(category_id=category_id)

    return Response(StaffSubCategorySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_subcategory_create(request):
    serializer = StaffSubCategorySerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_products_list(request):
    q = (request.query_params.get("q") or "").strip()
    category_id = request.query_params.get("category_id")
    subcategory_id = request.query_params.get("subcategory_id")

    qs = Product.objects.select_related("category", "subcategory").all().order_by("position", "name")

    if category_id:
        qs = qs.filter(category_id=category_id)

    if subcategory_id:
        qs = qs.filter(subcategory_id=subcategory_id)

    if q:
        qs = qs.filter(
            Q(name__icontains=q)
            | Q(description__icontains=q)
            | Q(category__name__icontains=q)
            | Q(subcategory__name__icontains=q)
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


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_category_reorder_bulk(request):
    ids = request.data.get("ids", [])
    for position, obj_id in enumerate(ids):
        Category.objects.filter(id=obj_id).update(position=position)
    qs = Category.objects.all().order_by("position", "name")
    return Response(StaffCategorySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_subcategory_reorder_bulk(request):
    ids = request.data.get("ids", [])
    for position, obj_id in enumerate(ids):
        SubCategory.objects.filter(id=obj_id).update(position=position)
    qs = SubCategory.objects.select_related("category").all().order_by("position", "name")
    return Response(StaffSubCategorySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_product_reorder_bulk(request):
    ids = request.data.get("ids", [])
    for position, obj_id in enumerate(ids):
        Product.objects.filter(id=obj_id).update(position=position)
    qs = Product.objects.select_related("category", "subcategory").all().order_by("position", "name")
    return Response(StaffProductSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_product_reorder(request, product_id: int):
    direction = request.data.get("direction")
    if direction not in ("up", "down"):
        return Response({"detail": "direction must be 'up' or 'down'"}, status=400)
    _swap_positions(Product, product_id, direction)
    qs = Product.objects.select_related("category", "subcategory").all().order_by("position", "name")
    return Response(StaffProductSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_category_reorder(request, category_id: int):
    direction = request.data.get("direction")
    if direction not in ("up", "down"):
        return Response({"detail": "direction must be 'up' or 'down'"}, status=400)
    _swap_positions(Category, category_id, direction)
    qs = Category.objects.all().order_by("position", "name")
    return Response(StaffCategorySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_subcategory_reorder(request, subcategory_id: int):
    direction = request.data.get("direction")
    if direction not in ("up", "down"):
        return Response({"detail": "direction must be 'up' or 'down'"}, status=400)
    _swap_positions(SubCategory, subcategory_id, direction)
    qs = SubCategory.objects.select_related("category").all().order_by("position", "name")
    return Response(StaffSubCategorySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def cloudflare_upload_url(request):
    """
    Génère une URL d'upload directe Cloudflare Images (one-time).
    Le frontend upload ensuite l'image directement à cette URL (sans passer par le backend).
    """
    account_id = getattr(settings, "CLOUDFLARE_ACCOUNT_ID", "")
    token      = getattr(settings, "CLOUDFLARE_IMAGES_TOKEN", "")

    if not account_id or not token:
        return Response(
            {"detail": "Cloudflare Images non configuré. Ajoutez CLOUDFLARE_ACCOUNT_ID et CLOUDFLARE_IMAGES_TOKEN."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    cf_url = f"https://api.cloudflare.com/client/v4/accounts/{account_id}/images/v2/direct_upload"
    req = urllib.request.Request(
        cf_url,
        method="POST",
        headers={"Authorization": f"Bearer {token}"},
        data=b"",          # body vide obligatoire pour urllib POST
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = _json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return Response(
            {"detail": f"Cloudflare HTTP {e.code}", "body": body},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        return Response({"detail": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

    if not data.get("success"):
        return Response(
            {"detail": "Cloudflare API error", "errors": data.get("errors")},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({
        "upload_url": data["result"]["uploadURL"],
        "id":         data["result"]["id"],
    })