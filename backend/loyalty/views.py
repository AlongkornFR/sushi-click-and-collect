from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .permissions import get_customer_or_403
from .qr import generate_qr_png_base64
from .serializers import LoyaltyAccountSerializer, LoyaltyTransactionSerializer
from .throttles import LoyaltyMutateThrottle, LoyaltyQRThrottle


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_loyalty(request):
    customer = get_customer_or_403(request)
    account = services.get_or_create_account(customer)
    return Response(LoyaltyAccountSerializer(account).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@throttle_classes([LoyaltyQRThrottle])
def my_qr(request):
    customer = get_customer_or_403(request)
    account = services.get_or_create_account(customer)
    payload = services.current_qr_payload(account)
    return Response({"payload": payload, "image_base64": generate_qr_png_base64(payload)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@throttle_classes([LoyaltyMutateThrottle])
def regenerate_qr(request):
    customer = get_customer_or_403(request)
    account = services.get_or_create_account(customer)
    payload = services.regenerate_qr(account, actor=request.user, ip_address=request.META.get("REMOTE_ADDR"))
    return Response({"payload": payload, "image_base64": generate_qr_png_base64(payload)})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_history(request):
    customer = get_customer_or_403(request)
    account = services.get_or_create_account(customer)
    qs = account.transactions.select_related("order")[:200]
    return Response(LoyaltyTransactionSerializer(qs, many=True).data)
