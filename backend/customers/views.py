from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.http import HttpResponse
import logging

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from backend.authentication import touch_token
from backend.throttles import LoginThrottle, PasswordResetThrottle, RegisterThrottle
from .emails import send_password_reset_email

logger = logging.getLogger(__name__)
from .models import Customer
from .serializers import CustomerProfileSerializer, OrderHistorySerializer, RegisterSerializer
from orders.models import Order
from orders.receipt import generate_receipt_pdf


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([RegisterThrottle])
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
    customer = Customer.objects.create(user=user, phone=data.get("phone", ""),
                                       privacy_accepted_at=timezone.now())
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "customer_id": customer.id}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([LoginThrottle])
def login(request):
    email = request.data.get("email", "").lower().strip()
    password = request.data.get("password", "")

    user = authenticate(username=email, password=password)
    if not user:
        return Response({"detail": "Identifiants invalides."}, status=401)
    if not hasattr(user, "customer"):
        # Même réponse qu'un mauvais mot de passe : la page publique ne doit
        # pas révéler qu'une adresse correspond à un compte du staff.
        return Response({"detail": "Identifiants invalides."}, status=401)
    if not user.is_active:
        return Response({"detail": "Compte désactivé."}, status=403)

    token, _ = Token.objects.get_or_create(user=user)
    touch_token(token)  # lot A8 : le délai d'inactivité repart de la connexion
    return Response({"token": token.key, "customer_id": user.customer.id})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """Lot A8 : la déconnexion supprime le jeton côté serveur."""
    if request.auth is not None:
        request.auth.delete()
    return Response(status=204)


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
    try:
        validate_password(new_pw, user=request.user)
    except ValidationError as e:
        return Response({"detail": " ".join(e.messages)}, status=400)

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
    except Exception:
        logger.exception("Génération du reçu PDF impossible (commande #%s).", order.id)
        return Response({"detail": "Le reçu n'a pas pu être généré. Réessayez plus tard."}, status=500)

    resp = HttpResponse(pdf_bytes, content_type="application/pdf")
    resp["Content-Disposition"] = f'attachment; filename="recu-surice-{order.id}.pdf"'
    return resp


# ── Mot de passe oublié (lot H8) ─────────────────────────────────────────────
# Jeton intégré à Django : il expire après PASSWORD_RESET_TIMEOUT et devient
# invalide dès que le mot de passe change (donc utilisable une seule fois).

RESET_REQUEST_MESSAGE = (
    "Si un compte existe avec cette adresse, vous allez recevoir un email "
    "pour choisir un nouveau mot de passe."
)
RESET_INVALID_LINK = "Ce lien n'est plus valable. Faites une nouvelle demande."


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_request(request):
    email = (request.data.get("email") or "").lower().strip()
    if not email:
        return Response({"detail": "Indiquez votre adresse email."}, status=400)

    # Même réponse que le compte existe ou non : on ne révèle pas qui est inscrit.
    user = User.objects.filter(email__iexact=email, is_active=True).first()
    if user and hasattr(user, "customer"):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend = settings.FRONTEND_BASE_URL.rstrip("/")
        send_password_reset_email(user, f"{frontend}/account/reset?uid={uid}&token={token}")

    return Response({"detail": RESET_REQUEST_MESSAGE})


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([PasswordResetThrottle])
def password_reset_confirm(request):
    uid = request.data.get("uid") or ""
    token = request.data.get("token") or ""
    new_password = request.data.get("new_password") or ""

    try:
        user = User.objects.get(pk=force_str(urlsafe_base64_decode(uid)), is_active=True)
    except (User.DoesNotExist, ValueError, TypeError, OverflowError):
        user = None
    if user is None or not hasattr(user, "customer") or not default_token_generator.check_token(user, token):
        return Response({"detail": RESET_INVALID_LINK}, status=400)

    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        return Response({"detail": " ".join(e.messages)}, status=400)

    user.set_password(new_password)
    user.save()
    # Déconnecte les autres appareils : l'ancien token d'API ne marche plus.
    Token.objects.filter(user=user).delete()
    return Response({"detail": "Mot de passe modifié. Vous pouvez vous connecter."})
