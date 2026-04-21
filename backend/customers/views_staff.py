from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from .models import Customer
from .serializers import StaffCustomerSerializer


@api_view(["GET"])
@permission_classes([IsAdminUser])
def list_users(request):
    q = request.query_params.get("q", "").strip()
    qs = Customer.objects.select_related("user").order_by("-created_at")

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
        customer = Customer.objects.select_related("user").get(pk=pk)
    except Customer.DoesNotExist:
        return Response({"detail": "Introuvable."}, status=404)
    return Response(StaffCustomerSerializer(customer).data)


@api_view(["DELETE"])
@permission_classes([IsAdminUser])
def delete_user(request, pk):
    try:
        customer = Customer.objects.select_related("user").get(pk=pk)
    except Customer.DoesNotExist:
        return Response({"detail": "Introuvable."}, status=404)
    customer.user.delete()
    return Response(status=204)
