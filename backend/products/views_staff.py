import hashlib
import logging
import time

from django.conf import settings
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework import status

from .models import Product, Category, SubCategory

logger = logging.getLogger(__name__)
from .serializers_staff import (
    StaffProductSerializer,
    StaffCategorySerializer,
    StaffSubCategorySerializer,
)


def _next_position(queryset):
    """Lot A4 : un nouvel élément se place à la fin de son groupe (sinon, à
    position égale, l'ordre alphabétique le mettait parfois en tête)."""
    last = queryset.order_by("-position").values_list("position", flat=True).first()
    return 0 if last is None else last + 1


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
        serializer.save(position=_next_position(Category.objects.all()))
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
        category = serializer.validated_data["category"]
        serializer.save(position=_next_position(SubCategory.objects.filter(category=category)))
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

    if subcategory_id == "none":
        # Produits rangés directement sous leur catégorie (lot A4)
        qs = qs.filter(subcategory__isnull=True)
    elif subcategory_id:
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
            return Response({"detail": "Prix invalide."}, status=400)

    serializer = StaffProductSerializer(data=data)
    if serializer.is_valid():
        siblings = Product.objects.filter(
            category=serializer.validated_data.get("category"),
            subcategory=serializer.validated_data.get("subcategory"),
        )
        product = serializer.save(position=_next_position(siblings))
        return Response(StaffProductSerializer(product).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_product_update(request, product_id: int):
    try:
        product = Product.objects.get(id=product_id)
    except Product.DoesNotExist:
        return Response({"detail": "Produit introuvable."}, status=status.HTTP_404_NOT_FOUND)

    data = request.data.copy()

    if "price_cents" in data and "price" not in data:
        try:
            data["price"] = str(int(data["price_cents"]) / 100)
        except Exception:
            return Response({"detail": "Prix invalide."}, status=400)

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
        return Response({"detail": "Direction invalide (up ou down)."}, status=400)
    _swap_positions(Product, product_id, direction)
    qs = Product.objects.select_related("category", "subcategory").all().order_by("position", "name")
    return Response(StaffProductSerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_category_reorder(request, category_id: int):
    direction = request.data.get("direction")
    if direction not in ("up", "down"):
        return Response({"detail": "Direction invalide (up ou down)."}, status=400)
    _swap_positions(Category, category_id, direction)
    qs = Category.objects.all().order_by("position", "name")
    return Response(StaffCategorySerializer(qs, many=True).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def staff_subcategory_reorder(request, subcategory_id: int):
    direction = request.data.get("direction")
    if direction not in ("up", "down"):
        return Response({"detail": "Direction invalide (up ou down)."}, status=400)
    _swap_positions(SubCategory, subcategory_id, direction)
    qs = SubCategory.objects.select_related("category").all().order_by("position", "name")
    return Response(StaffSubCategorySerializer(qs, many=True).data)


# ── Envoi de photos signé vers Cloudinary ──────────────────────────────────
# Avant, l'envoi utilisait un « preset » non signé dont le nom figurait dans
# le code public du site : n'importe qui pouvait déposer des fichiers sur le
# compte. Désormais, seul un membre du staff connecté obtient une signature,
# valable pour un envoi dans le dossier prévu. Le secret reste sur le serveur.

def _cloudinary_signature(params, api_secret):
    """Signature Cloudinary : SHA-1 de « clé=valeur&… » (clés triées) + secret."""
    to_sign = "&".join(f"{k}={params[k]}" for k in sorted(params))
    return hashlib.sha1((to_sign + api_secret).encode("utf-8")).hexdigest()


@api_view(["POST"])
@permission_classes([IsAdminUser])
def cloudinary_signature(request):
    cloud_name = settings.CLOUDINARY_CLOUD_NAME
    api_key = settings.CLOUDINARY_API_KEY
    api_secret = settings.CLOUDINARY_API_SECRET
    if not (cloud_name and api_key and api_secret):
        logger.error("Cloudinary non configuré (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).")
        return Response({"detail": "L'envoi de photos n'est pas encore configuré. Vous pouvez coller l'adresse d'une image."},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)

    params = {"folder": settings.CLOUDINARY_FOLDER, "timestamp": int(time.time())}
    return Response({
        "cloud_name": cloud_name,
        "api_key": api_key,
        "folder": params["folder"],
        "timestamp": params["timestamp"],
        "signature": _cloudinary_signature(params, api_secret),
    })


# ── Modification des catégories et sous-catégories (lot A4) ────────────────
# Renommer et masquer / afficher. Pas de suppression : une catégorie masquée
# disparaît du site sans perdre ses produits.

def _patch(serializer_cls, instance, request):
    allowed = {k: v for k, v in (request.data or {}).items() if k in ("name", "is_active")}
    if "name" in allowed:
        allowed["name"] = str(allowed["name"]).strip()
        if not allowed["name"]:
            return Response({"detail": "Le nom ne peut pas être vide."}, status=status.HTTP_400_BAD_REQUEST)
    serializer = serializer_cls(instance, data=allowed, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_category_update(request, category_id: int):
    try:
        category = Category.objects.get(id=category_id)
    except Category.DoesNotExist:
        return Response({"detail": "Catégorie introuvable."}, status=status.HTTP_404_NOT_FOUND)
    return _patch(StaffCategorySerializer, category, request)


@api_view(["PATCH"])
@permission_classes([IsAdminUser])
def staff_subcategory_update(request, subcategory_id: int):
    try:
        sub = SubCategory.objects.select_related("category").get(id=subcategory_id)
    except SubCategory.DoesNotExist:
        return Response({"detail": "Sous-catégorie introuvable."}, status=status.HTTP_404_NOT_FOUND)
    return _patch(StaffSubCategorySerializer, sub, request)
