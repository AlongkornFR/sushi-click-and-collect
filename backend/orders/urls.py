from django.urls import path

from .views import checkout, payplug_ipn, OrderDetailView
from .views_staff import (
    staff_login,
    staff_me,
    staff_orders_list,
    staff_orders_pending_print,
    staff_order_set_status,
    staff_order_mark_printed,
)

urlpatterns = [
    # Public
    path("checkout/",           checkout),
    path("payplug/ipn/",        payplug_ipn),
    path("orders/<int:pk>/",    OrderDetailView.as_view()),

    # Staff — auth
    path("staff/login/",        staff_login),
    path("staff/me/",           staff_me),

    # Staff — orders
    path("staff/orders/",                              staff_orders_list),
    path("staff/orders/pending-print/",                staff_orders_pending_print),
    path("staff/orders/<int:order_id>/status/",        staff_order_set_status),
    path("staff/orders/<int:order_id>/printed/",       staff_order_mark_printed),
]
