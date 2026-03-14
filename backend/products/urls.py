from django.urls import path

from .views import ProductListView, ProductDetailView
from .views_staff import (
    staff_products_list,
    staff_product_create,
    staff_product_update,
    staff_categories_list,
    staff_category_create,
)

urlpatterns = [

    # PUBLIC API
    path("products/", ProductListView.as_view()),
    path("products/<slug:slug>/", ProductDetailView.as_view()),

    # STAFF PRODUCTS
    path("staff/products/", staff_products_list),
    path("staff/products/create/", staff_product_create),
    path("staff/products/<int:product_id>/", staff_product_update),

    # STAFF CATEGORIES
    path("staff/categories/", staff_categories_list),
    path("staff/categories/create/", staff_category_create),
]