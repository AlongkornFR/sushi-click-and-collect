from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from . import services
from .models import AuditLog, LoyaltyAccount
from .qr import verify_payload
from .serializers import (
    AccountActionSerializer,
    AddPointSerializer,
    AuditLogSerializer,
    LoyaltyAccountStaffSerializer,
    LoyaltyTransactionSerializer,
    ScanSerializer,
)
from .throttles import LoyaltyMutateThrottle, LoyaltyScanThrottle


def _get_account_or_404(public_id):
    try:
        return LoyaltyAccount.objects.select_related("customer__user").get(public_id=public_id)
    except (LoyaltyAccount.DoesNotExist, ValueError, TypeError):
        return None


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_search(request):
    q = (request.query_params.get("q") or "").strip()
    if not q:
        return Response([])
    accounts = (
        LoyaltyAccount.objects.select_related("customer__user")
        .filter(
            Q(customer__user__email__icontains=q)
            | Q(customer__user__first_name__icontains=q)
            | Q(customer__user__last_name__icontains=q)
            | Q(customer__phone__icontains=q)
        )
        .order_by("-updated_at")[:20]
    )
    return Response(LoyaltyAccountStaffSerializer(accounts, many=True).data)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_account_detail(request, public_id):
    account = _get_account_or_404(public_id)
    if not account:
        return Response({"detail": "Compte introuvable."}, status=404)
    history = account.transactions.select_related("order")[:200]
    return Response({
        "account": LoyaltyAccountStaffSerializer(account).data,
        "history": LoyaltyTransactionSerializer(history, many=True).data,
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
@throttle_classes([LoyaltyScanThrottle])
def staff_scan(request):
    serializer = ScanSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    account = verify_payload(serializer.validated_data["payload"])
    if not account:
        return Response({"detail": "QR invalide."}, status=400)

    AuditLog.objects.create(actor=request.user, account=account, action="scan", metadata={})
    return Response(LoyaltyAccountStaffSerializer(account).data)


@api_view(["POST"])
@permission_classes([IsAdminUser])
@throttle_classes([LoyaltyMutateThrottle])
def staff_add_point(request):
    serializer = AddPointSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    account = _get_account_or_404(data["public_id"])
    if not account:
        return Response({"detail": "Compte introuvable."}, status=404)

    try:
        txn = services.admin_add_point(
            account,
            admin_user=request.user,
            store=data["store"],
            reason=data["reason"],
            client_request_id=data["client_request_id"],
            ip_address=request.META.get("REMOTE_ADDR"),
        )
    except services.LoyaltyError as e:
        return Response({"detail": e.message, "code": e.code}, status=400)

    account.refresh_from_db()
    return Response({
        "transaction": LoyaltyTransactionSerializer(txn).data,
        "account": LoyaltyAccountStaffSerializer(account).data,
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
@throttle_classes([LoyaltyMutateThrottle])
def staff_remove_point(request):
    serializer = AccountActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    account = _get_account_or_404(data["public_id"])
    if not account:
        return Response({"detail": "Compte introuvable."}, status=404)

    try:
        txn = services.admin_remove_point(
            account, admin_user=request.user, reason=data["reason"],
            ip_address=request.META.get("REMOTE_ADDR"),
        )
    except services.LoyaltyError as e:
        return Response({"detail": e.message, "code": e.code}, status=400)

    account.refresh_from_db()
    return Response({
        "transaction": LoyaltyTransactionSerializer(txn).data,
        "account": LoyaltyAccountStaffSerializer(account).data,
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
@throttle_classes([LoyaltyMutateThrottle])
def staff_redeem(request):
    serializer = AccountActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    account = _get_account_or_404(data["public_id"])
    if not account:
        return Response({"detail": "Compte introuvable."}, status=404)

    try:
        txn = services.redeem_reward(account, admin_user=request.user, ip_address=request.META.get("REMOTE_ADDR"))
    except services.LoyaltyError as e:
        return Response({"detail": e.message, "code": e.code}, status=400)

    account.refresh_from_db()
    return Response({
        "transaction": LoyaltyTransactionSerializer(txn).data,
        "account": LoyaltyAccountStaffSerializer(account).data,
    })


@api_view(["POST"])
@permission_classes([IsAdminUser])
@throttle_classes([LoyaltyMutateThrottle])
def staff_reset(request):
    serializer = AccountActionSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    data = serializer.validated_data

    account = _get_account_or_404(data["public_id"])
    if not account:
        return Response({"detail": "Compte introuvable."}, status=404)

    txn = services.reset_card(account, admin_user=request.user, reason=data["reason"], ip_address=request.META.get("REMOTE_ADDR"))

    account.refresh_from_db()
    return Response({
        "transaction": LoyaltyTransactionSerializer(txn).data,
        "account": LoyaltyAccountStaffSerializer(account).data,
    })


@api_view(["GET"])
@permission_classes([IsAdminUser])
def staff_audit_log(request):
    qs = AuditLog.objects.select_related("account", "actor")
    public_id = request.query_params.get("account")
    if public_id:
        qs = qs.filter(account__public_id=public_id)
    return Response(AuditLogSerializer(qs[:200], many=True).data)
