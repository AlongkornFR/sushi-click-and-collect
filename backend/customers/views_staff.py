from django.db.models import Count
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from .models import Customer
from .serializers import StaffCustomerDetailSerializer, StaffCustomerSerializer


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_users(request):
    q = request.query_params.get("q", "").strip()
    # Nombre de commandes calculé en une seule requête (lot A6)
    qs = (
        Customer.objects.select_related("user")
        .annotate(order_count_annot=Count("user__order", distinct=True))
        .order_by("-created_at")
    )

    if q:
        qs = qs.filter(user__email__icontains=q) | \
             qs.filter(user__first_name__icontains=q) | \
             qs.filter(user__last_name__icontains=q) | \
             qs.filter(phone__icontains=q)
        qs = qs.distinct()

    return Response(StaffCustomerSerializer(qs, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def get_user(request, pk):
    try:
        customer = Customer.objects.select_related("user", "loyaltyaccount").get(pk=pk)
    except Customer.DoesNotExist:
        return Response({"detail": "Client introuvable."}, status=404)
    # Lot A6 : fiche complète (commandes, carte de fidélité, total dépensé)
    return Response(StaffCustomerDetailSerializer(customer).data)


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_user(request, pk):
    try:
        customer = Customer.objects.select_related("user").get(pk=pk)
    except Customer.DoesNotExist:
        return Response({"detail": "Introuvable."}, status=404)
    if customer.user.is_staff or customer.user.is_superuser:
        return Response({"detail": "Ce compte est un compte staff : il ne peut pas être supprimé ici."},
                        status=status.HTTP_400_BAD_REQUEST)
    customer.user.delete()
    return Response(status=204)


@api_view(["POST"])
@permission_classes([IsAdminUser])
def set_active(request, pk):
    """Lot A6 : désactiver ou réactiver un compte client.

    Désactivé, le client ne peut plus se connecter (ses sessions sont
    coupées), mais ses commandes et sa carte de fidélité sont conservées.
    """
    try:
        customer = Customer.objects.select_related("user").get(pk=pk)
    except Customer.DoesNotExist:
        return Response({"detail": "Client introuvable."}, status=404)
    if customer.user.is_staff or customer.user.is_superuser:
        return Response({"detail": "Ce compte est un compte staff : il ne peut pas être désactivé ici."},
                        status=status.HTTP_400_BAD_REQUEST)
    is_active = (request.data or {}).get("is_active")
    if not isinstance(is_active, bool):
        return Response({"detail": "Indiquez is_active : true ou false."}, status=status.HTTP_400_BAD_REQUEST)

    customer.user.is_active = is_active
    customer.user.save(update_fields=["is_active"])
    if not is_active:
        Token.objects.filter(user=customer.user).delete()
    return Response(StaffCustomerSerializer(customer).data)
