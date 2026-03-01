from django.urls import path

from .views_staff import staff_product_update, staff_products_list
from .views import ProductListView, ProductDetailView, google_reviews

urlpatterns = [
    path("products/", ProductListView.as_view()),
    path("products/<slug:slug>/", ProductDetailView.as_view()),
    path("staff/products/", staff_products_list),
    path("staff/products/<int:product_id>/", staff_product_update),
    path('reviews/', google_reviews, name='google-reviews'),
]
