from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Customer
from orders.models import Order
from orders.opening_hours import pickup_label


PRIVACY_REQUIRED = "Acceptez la politique de confidentialité pour créer un compte."


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(min_length=8)
    first_name = serializers.CharField(max_length=50)
    last_name = serializers.CharField(max_length=50)
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True)
    accept_privacy = serializers.BooleanField(
        error_messages={"required": PRIVACY_REQUIRED, "invalid": PRIVACY_REQUIRED})

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Un compte existe déjà avec cet email. Connectez-vous ou réinitialisez votre mot de passe.")
        return value.lower()

    def validate_accept_privacy(self, value):
        if value is not True:
            raise serializers.ValidationError(PRIVACY_REQUIRED)
        return value

    def validate(self, attrs):
        # Règles de mot de passe de Django (trop courant, trop proche du nom
        # ou de l'email, uniquement des chiffres), comme pour la
        # réinitialisation.
        probe = User(username=attrs.get("email", ""), email=attrs.get("email", ""),
                     first_name=attrs.get("first_name", ""), last_name=attrs.get("last_name", ""))
        try:
            validate_password(attrs["password"], user=probe)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs


class CustomerProfileSerializer(serializers.ModelSerializer):
    customer_id = serializers.IntegerField(source="id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    date_joined = serializers.DateTimeField(source="user.date_joined", read_only=True)

    class Meta:
        model = Customer
        fields = ["customer_id", "email", "first_name", "last_name", "phone", "date_joined"]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "first_name" in user_data:
            instance.user.first_name = user_data["first_name"]
        if "last_name" in user_data:
            instance.user.last_name = user_data["last_name"]
        instance.user.save()
        instance.phone = validated_data.get("phone", instance.phone)
        instance.save()
        return instance


class OrderItemSummarySerializer(serializers.Serializer):
    name = serializers.CharField(source="product_name")
    quantity = serializers.IntegerField()
    unit_price_cents = serializers.IntegerField()


class OrderHistorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()
    pickup_label = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "status", "total_cents", "created_at", "pickup_time", "pickup_at", "pickup_label", "items"]

    def get_pickup_label(self, obj):
        return pickup_label(obj)

    def get_items(self, obj):
        return [
            {
                "name": item.product_name,
                "quantity": item.quantity,
                "unit_price_cents": item.unit_price_cents,
            }
            for item in obj.items.all()
        ]


class StaffCustomerSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")
    first_name = serializers.CharField(source="user.first_name")
    last_name = serializers.CharField(source="user.last_name")
    is_active = serializers.BooleanField(source="user.is_active")
    date_joined = serializers.DateTimeField(source="user.date_joined")
    order_count = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = ["id", "email", "first_name", "last_name", "phone", "is_active", "date_joined", "order_count"]

    def get_order_count(self, obj):
        # Annoté par la liste (une seule requête) ; sinon calculé (fiche).
        annotated = getattr(obj, "order_count_annot", None)
        if annotated is not None:
            return annotated
        return Order.objects.filter(user=obj.user).count()


# Statuts qui comptent dans le total dépensé (commandes payées, non annulées)
SPENT_STATUSES = ("paid", "preparing", "ready", "collected")


class StaffCustomerDetailSerializer(StaffCustomerSerializer):
    """Lot A6 : fiche client complète pour l'espace staff."""
    orders = serializers.SerializerMethodField()
    loyalty = serializers.SerializerMethodField()
    total_spent_cents = serializers.SerializerMethodField()

    class Meta(StaffCustomerSerializer.Meta):
        fields = StaffCustomerSerializer.Meta.fields + ["orders", "loyalty", "total_spent_cents"]

    def _orders(self, obj):
        if not hasattr(self, "_orders_cache"):
            self._orders_cache = list(
                Order.objects.filter(user=obj.user).prefetch_related("items").order_by("-created_at")[:50]
            )
        return self._orders_cache

    def get_orders(self, obj):
        return [
            {
                "id": o.id,
                "status": o.status,
                "total_cents": o.total_cents,
                "created_at": o.created_at,
                "pickup_label": pickup_label(o),
                "items": [f"{it.quantity}× {it.product_name}" for it in o.items.all()],
            }
            for o in self._orders(obj)
        ]

    def get_total_spent_cents(self, obj):
        return sum(
            Order.objects.filter(user=obj.user, status__in=SPENT_STATUSES).values_list("total_cents", flat=True)
        )

    def get_loyalty(self, obj):
        # Lecture seule : on ne crée pas de carte en consultant la fiche.
        account = getattr(obj, "loyaltyaccount", None)
        if account is None:
            return None
        return {
            "public_id": str(account.public_id),
            "points": account.points,
            "max_points": account.MAX_POINTS,
            "reward_available": account.reward_available,
        }
