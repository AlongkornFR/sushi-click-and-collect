from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "phone", "created_at"]
    search_fields = ["user__email", "user__first_name", "user__last_name", "phone"]
    raw_id_fields = ["user"]
