from django.urls import path
from .views import checkout, payplug_ipn

urlpatterns = [
    path("checkout/", checkout),
    path("payplug/ipn/", payplug_ipn),
]
