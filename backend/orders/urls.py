from django.urls import path


from .views import checkout, payplug_ipn, OrderDetailView
from .views_staff import staff_login, staff_me, staff_orders_list, staff_order_set_status

urlpatterns = [
    path("checkout/", checkout),
    path("payplug/ipn/", payplug_ipn),
    path("orders/<int:pk>/", OrderDetailView.as_view()),
    path("staff/orders/", staff_orders_list),
    path("staff/orders/<int:order_id>/status/", staff_order_set_status),
    path("staff/login/", staff_login),
    path("staff/me/", staff_me),
]
