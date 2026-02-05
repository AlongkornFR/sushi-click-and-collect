from django.urls import path
from .views import checkout, payplug_ipn, OrderDetailView

urlpatterns = [
    path("checkout/", checkout),
    path("payplug/ipn/", payplug_ipn),
    path("orders/<int:pk>/", OrderDetailView.as_view()),
]
