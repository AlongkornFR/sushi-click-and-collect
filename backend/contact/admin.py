from django.contrib import admin

from .models import ContactMessage


@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    """Lecture seule : les messages reçus via le formulaire (lot A8)."""
    list_display = ("created_at", "first_name", "last_name", "email", "phone", "email_sent")
    list_filter = ("email_sent",)
    search_fields = ("first_name", "last_name", "email", "phone", "message")
    readonly_fields = ("first_name", "last_name", "email", "phone", "message", "email_sent", "created_at")

    def has_add_permission(self, request):
        return False
