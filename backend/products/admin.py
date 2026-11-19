from django.contrib import admin

from .models import Category, Product, SubCategory


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "position", "is_active")
    list_editable = ("is_active",)
    prepopulated_fields = {"slug": ("name",)}


# Lot A8 : les sous-catégories n'étaient pas dans l'admin (impossible de
# les masquer ou de les corriger en dépannage).
@admin.register(SubCategory)
class SubCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "position", "is_active")
    list_filter = ("category", "is_active")
    list_editable = ("is_active",)
    search_fields = ("name", "category__name")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    # Le stock n'a plus d'effet depuis le lot C3 : il n'est plus affiché.
    list_display = ("name", "price", "vat_rate", "category", "subcategory", "is_available")
    list_filter = ("category", "is_available", "vat_rate")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}
