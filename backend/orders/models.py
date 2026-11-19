# orders/models.py
import uuid
from decimal import Decimal

from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class Order(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("paid", "Paid"),
        ("preparing", "Preparing"),
        ("ready", "Ready"),
        ("collected", "Collected"),
        ("cancelled", "Cancelled"),
    ]

    # Identifiant public non devinable : seul moyen pour un client non
    # connecté de consulter sa commande (l'ID séquentiel ne suffit plus).
    public_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    full_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=30)

    pickup_time = models.CharField(max_length=10)  # "18:30" : conservé pour les anciennes commandes et l'API
    # Date et heure de retrait. Nul pour les commandes passées avant l'ajout du champ.
    pickup_at = models.DateTimeField(null=True, blank=True, db_index=True)
    notes = models.TextField(blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    total_cents = models.PositiveIntegerField(default=0)

    payment_provider = models.CharField(max_length=30, default="payplug")
    payment_id = models.CharField(max_length=80, blank=True, default="")
    payment_url = models.URLField(blank=True, default="")

    printed    = models.BooleanField(default=False)
    printed_at = models.DateTimeField(null=True, blank=True)

    ready_at   = models.DateTimeField(null=True, blank=True)

    # Lot A7 : suivi des remboursements (le remboursement se fait sur Payplug)
    REFUND_CHOICES = [("", "Aucun"), ("to_refund", "À rembourser"), ("refunded", "Remboursée")]
    refund_status = models.CharField(max_length=12, choices=REFUND_CHOICES, blank=True, default="", db_index=True)
    refunded_at   = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Order #{self.id} - {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name="items", on_delete=models.CASCADE)

    product_id = models.IntegerField()  # snapshot simple
    product_name = models.CharField(max_length=120)
    unit_price_cents = models.PositiveIntegerField()  # TTC
    quantity = models.PositiveIntegerField(default=1)
    # Lot A7 : taux de TVA figé au moment de l'achat (changer le taux d'un
    # produit ne modifie pas les ventes passées). 10 % pour l'existant.
    vat_rate = models.DecimalField(max_digits=4, decimal_places=1, default=Decimal("10.0"))

    def line_total_cents(self):
        return self.unit_price_cents * self.quantity




class OrderingPause(models.Model):
    """Pause des commandes en ligne (lot A3). Une seule ligne (pk=1).

    Le staff met en pause pour 15 min, 1 h ou sans limite ; pendant la pause,
    le checkout refuse les nouvelles commandes et le site affiche un message.
    """
    paused_until = models.DateTimeField(null=True, blank=True)
    indefinite = models.BooleanField(default=False)
    updated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "pause des commandes"
        verbose_name_plural = "pause des commandes"

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def is_active(self, now=None):
        from django.utils import timezone
        now = now or timezone.now()
        return self.indefinite or (self.paused_until is not None and self.paused_until > now)
