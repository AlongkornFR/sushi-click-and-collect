from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.http import HttpResponse
from .models import Customer
from .serializers import CustomerProfileSerializer, OrderHistorySerializer, RegisterSerializer
from orders.models import Order
from orders.receipt import generate_receipt_pdf


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    data = serializer.validated_data
    user = User.objects.create_user(
        username=data["email"].lower(),
        email=data["email"].lower(),
        password=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"],
    )
    customer = Customer.objects.create(user=user, phone=data.get("phone", ""))
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "customer_id": customer.id}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    email = request.data.get("email", "").lower().strip()
    password = request.data.get("password", "")

    user = authenticate(username=email, password=password)
    if not user:
        return Response({"detail": "Identifiants invalides."}, status=401)
    if not hasattr(user, "customer"):
        return Response({"detail": "Compte non client."}, status=403)
    if not user.is_active:
        return Response({"detail": "Compte désactivé."}, status=403)

    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "customer_id": user.customer.id})


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def me(request):
    if not hasattr(request.user, "customer"):
        return Response({"detail": "Compte non client."}, status=403)

    customer = request.user.customer

    if request.method == "GET":
        return Response(CustomerProfileSerializer(customer).data)

    serializer = CustomerProfileSerializer(customer, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)
    serializer.save()
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password(request):
    if not hasattr(request.user, "customer"):
        return Response({"detail": "Compte non client."}, status=403)

    current = request.data.get("current_password", "")
    new_pw = request.data.get("new_password", "")

    if not current or not new_pw:
        return Response({"detail": "current_password et new_password requis."}, status=400)
    if len(new_pw) < 8:
        return Response({"detail": "Mot de passe minimum 8 caractères."}, status=400)

    if not authenticate(username=request.user.username, password=current):
        return Response({"detail": "Mot de passe actuel incorrect."}, status=400)

    request.user.set_password(new_pw)
    request.user.save()
    Token.objects.filter(user=request.user).delete()
    token = Token.objects.create(user=request.user)
    return Response({"token": token.key})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_email(request):
    if not hasattr(request.user, "customer"):
        return Response({"detail": "Compte non client."}, status=403)

    new_email = request.data.get("email", "").lower().strip()
    password = request.data.get("password", "")

    if not new_email or not password:
        return Response({"detail": "email et password requis."}, status=400)
    if User.objects.filter(email__iexact=new_email).exclude(pk=request.user.pk).exists():
        return Response({"detail": "Email déjà utilisé."}, status=400)
    if not authenticate(username=request.user.username, password=password):
        return Response({"detail": "Mot de passe incorrect."}, status=400)

    request.user.email = new_email
    request.user.username = new_email
    request.user.save()
    return Response({"detail": "Email mis à jour."})


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_account(request):
    if not hasattr(request.user, "customer"):
        return Response({"detail": "Compte non client."}, status=403)

    password = request.data.get("password", "")
    if not password:
        return Response({"detail": "Mot de passe requis."}, status=400)
    if not authenticate(username=request.user.username, password=password):
        return Response({"detail": "Mot de passe incorrect."}, status=400)

    request.user.delete()
    return Response(status=204)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_history(request):
    if not hasattr(request.user, "customer"):
        return Response({"detail": "Compte non client."}, status=403)

    orders = Order.objects.filter(user=request.user).prefetch_related("items").order_by("-created_at")
    return Response(OrderHistorySerializer(orders, many=True).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def order_receipt(request, pk):
    if not hasattr(request.user, "customer"):
        return Response({"detail": "Compte non client."}, status=403)

    try:
        order = Order.objects.prefetch_related("items").get(id=pk, user=request.user)
    except Order.DoesNotExist:
        return Response({"detail": "Commande introuvable."}, status=404)

    if order.status not in {"paid", "preparing", "ready", "collected"}:
        return Response({"detail": "Reçu indisponible tant que la commande n'est pas payée."}, status=400)

    try:
        pdf_bytes = generate_receipt_pdf(order)
    except Exception as e:
        import traceback; traceback.print_exc()
        return Response({"detail": f"Erreur génération PDF: {type(e).__name__}: {e}"}, status=500)

    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="recu-surice-{order.id}.pdf"'
    return resp
