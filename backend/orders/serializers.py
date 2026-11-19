from rest_framework import serializers
from .models import Order, OrderItem
from .opening_hours import pickup_label

class OrderItemSerializer(serializers.ModelSerializer):
    line_total_cents = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product_id", "product_name", "unit_price_cents", "quantity", "line_total_cents"]

    def get_line_total_cents(self, obj):
        return obj.unit_price_cents * obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    pickup_label = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            # payment_id et notes ne sont plus exposés publiquement (lot C5) :
            # la note peut contenir des informations de santé (allergies).
            "id", "status", "total_cents", "pickup_time", "pickup_at", "pickup_label",
            "payment_provider", "payment_url", "created_at",
            "items",
        ]

    def get_pickup_label(self, obj):
        return pickup_label(obj)


class OrderStatusSerializer(serializers.ModelSerializer):
    """Réponse minimale des anciennes routes par ID."""

    class Meta:
        model = Order
        fields = ["id", "status"]


# ── Validation de la requête de checkout (lot H1) ───────────────────────────
# Même format qu'avant : {customer: {full_name, email, phone}, pickup_time,
# notes, items: [{product_id, quantity}]}. Les champs inconnus (ex. un prix
# envoyé par le client) sont ignorés : le prix vient toujours de la base.

MAX_QUANTITY_PER_LINE = 50


class CheckoutCustomerSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=120, trim_whitespace=True,
                                      error_messages={"blank": "Indiquez votre nom.", "required": "Indiquez votre nom."})
    email = serializers.EmailField(max_length=254,
                                   error_messages={"invalid": "Adresse email invalide.", "blank": "Indiquez votre email.",
                                                   "required": "Indiquez votre email."})
    phone = serializers.CharField(max_length=30, required=False, allow_blank=True, trim_whitespace=True)


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1, error_messages={"invalid": "Article invalide."})
    quantity = serializers.IntegerField(
        min_value=1, max_value=MAX_QUANTITY_PER_LINE,
        error_messages={
            "invalid": "Quantité invalide.",
            "min_value": "Quantité invalide.",
            "max_value": f"Maximum {MAX_QUANTITY_PER_LINE} par article. Pour une grosse commande, appelez-nous.",
        },
    )


class CheckoutSerializer(serializers.Serializer):
    customer = CheckoutCustomerSerializer()
    pickup_time = serializers.CharField(max_length=20, error_messages={"blank": "Choisissez un créneau de retrait.",
                                                                       "required": "Choisissez un créneau de retrait."})
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True, default="",
                                  error_messages={"max_length": "La note est limitée à 500 caractères."})
    items = CheckoutItemSerializer(many=True, allow_empty=False,
                                   error_messages={"empty": "Panier vide.", "not_a_list": "Panier invalide."})

    def validate(self, attrs):
        # Un même produit envoyé deux fois : quantités additionnées.
        merged = {}
        for it in attrs["items"]:
            merged[it["product_id"]] = merged.get(it["product_id"], 0) + it["quantity"]
        if any(q > MAX_QUANTITY_PER_LINE for q in merged.values()):
            raise serializers.ValidationError(
                f"Maximum {MAX_QUANTITY_PER_LINE} par article. Pour une grosse commande, appelez-nous.")
        attrs["items"] = [{"product_id": pid, "quantity": q} for pid, q in merged.items()]

        user = self.context.get("user")
        if not (user and user.is_authenticated) and len(attrs["customer"].get("phone", "")) < 9:
            raise serializers.ValidationError({"customer": {"phone": ["Indiquez un numéro de téléphone."]}})
        return attrs


def first_error_message(errors) -> str:
    """Premier message d'erreur lisible, quelle que soit la profondeur."""
    if isinstance(errors, dict):
        for value in errors.values():
            msg = first_error_message(value)
            if msg:
                return msg
    elif isinstance(errors, list):
        for value in errors:
            msg = first_error_message(value)
            if msg:
                return msg
    elif errors:
        return str(errors)
    return ""
