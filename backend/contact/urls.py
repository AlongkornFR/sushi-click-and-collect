from django.urls import path
from .views import contact_send

urlpatterns = [
    path("", contact_send),
]