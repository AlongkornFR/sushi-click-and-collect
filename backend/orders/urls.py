from django.urls import path

from .views import (
    checkout, payplug_ipn, opening_hours,
    OrderByTokenView, verify_payment_by_token,
    OrderDetailView, verify_payment,
)
from .views_staff import (
    staff_login,
    staff_logout,
    staff_me,
    staff_orders_list,
    staff_orders_pending_print,
    staff_order_set_status,
    staff_order_mark_printed,
    staff_order_delete,
    staff_ordering_pause,
    staff_stats,
    staff_refunds,
    staff_refund_done,
)

urlpatterns = [
    # Public
    path("checkout/",           checkout),
    path("opening-hours/",      opening_hours),
    path("payplug/ipn/",        payplug_ipn),
    path("orders/t/<uuid:token>/",                OrderByTokenView.as_view()),
    path("orders/t/<uuid:token>/verify-payment/", verify_payment_by_token),
    # Anciennes routes : ID + statut seulement (transition)
    path("orders/<int:pk>/",    OrderDetailView.as_view()),
    path("orders/<int:pk>/verify-payment/", verify_payment),

    # Staff — auth
    path("staff/login/",        staff_login),
    path("staff/me/",           staff_me),
    path("staff/logout/",       staff_logout),

    # Staff — orders
    path("staff/orders/",                              staff_orders_list),
    path("staff/orders/pending-print/",                staff_orders_pending_print),
    path("staff/orders/<int:order_id>/status/",        staff_order_set_status),
    path("staff/orders/<int:order_id>/printed/",       staff_order_mark_printed),
    path("staff/orders/<int:order_id>/delete/",        staff_order_delete),

    # Staff — pause des commandes en ligne (lot A3)
    path("staff/ordering-pause/",                      staff_ordering_pause),

    # Staff — pilotage (lot A7)
    path("staff/stats/",                               staff_stats),
    path("staff/refunds/",                             staff_refunds),
    path("staff/refunds/<int:order_id>/done/",         staff_refund_done),
]
