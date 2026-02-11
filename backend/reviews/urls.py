from django.urls import path
from .views import google_reviews

urlpatterns = [
    path("reviews/google/", google_reviews),
]
