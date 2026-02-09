from django.contrib import admin
from django.utils.html import format_html

from .models import Order, OrderItem


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("id", "order", "product_name", "quantity", "unit_price_eur", "line_total_eur")
    list_filter = ("order__status",)
    search_fields = ("order__id", "product_name", "product_id")

    @admin.display(description="Prix unit. (€)")
    def unit_price_eur(self, obj: OrderItem):
        return f"{obj.unit_price_cents / 100:.2f} €"

    @admin.display(description="Total ligne (€)")
    def line_total_eur(self, obj: OrderItem):
        return f"{obj.line_total_cents() / 100:.2f} €"


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False

    readonly_fields = ("product_id", "product_name", "unit_price_eur", "quantity", "line_total_eur")
    fields = ("product_id", "product_name", "unit_price_eur", "quantity", "line_total_eur")

    @admin.display(description="Prix unit. (€)")
    def unit_price_eur(self, obj: OrderItem):
        return f"{obj.unit_price_cents / 100:.2f} €"

    @admin.display(description="Total ligne (€)")
    def line_total_eur(self, obj: OrderItem):
        return f"{obj.line_total_cents() / 100:.2f} €"


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    inlines = [OrderItemInline]

    list_display = (
        "id",
        "created_at",
        "full_name",
        "phone",
        "pickup_time",
        "status",
        "total_eur",
        "payment_provider",
        "payment_id_short",
        "payplug_link",
    )
    list_filter = ("status", "payment_provider", "created_at")
    search_fields = ("id", "full_name", "email", "phone", "payment_id")
    ordering = ("-created_at",)

    readonly_fields = ("created_at", "total_eur", "payplug_link", "payment_id", "payment_url")

    fieldsets = (
        ("Client", {"fields": ("user", "full_name", "email", "phone")}),
        ("Retrait", {"fields": ("pickup_time", "notes")}),
        ("Commande", {"fields": ("status", "total_cents", "total_eur", "created_at")}),
        ("Paiement", {"fields": ("payment_provider", "payment_id", "payment_url", "payplug_link")}),
    )

    actions = ("mark_preparing", "mark_ready", "mark_collected", "mark_cancelled")

    @admin.display(description="Total (€)")
    def total_eur(self, obj: Order):
        return f"{obj.total_cents / 100:.2f} €"

    @admin.display(description="Payment ID")
    def payment_id_short(self, obj: Order):
        if not obj.payment_id:
            return "—"
        s = str(obj.payment_id)
        return s if len(s) <= 12 else f"{s[:6]}…{s[-4:]}"

    @admin.display(description="Payplug")
    def payplug_link(self, obj: Order):
        if not obj.payment_url:
            return "—"
        return format_html('<a href="{}" target="_blank" rel="noopener">Ouvrir paiement</a>', obj.payment_url)

    @admin.action(description="Passer en Preparing")
    def mark_preparing(self, request, queryset):
        queryset.update(status="preparing")

    @admin.action(description="Passer en Ready")
    def mark_ready(self, request, queryset):
        queryset.update(status="ready")

    @admin.action(description="Passer en Collected")
    def mark_collected(self, request, queryset):
        queryset.update(status="collected")

    @admin.action(description="Passer en Cancelled")
    def mark_cancelled(self, request, queryset):
        queryset.update(status="cancelled")
