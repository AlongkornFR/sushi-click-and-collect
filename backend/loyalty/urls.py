from django.urls import path

from . import views, views_staff

urlpatterns = [
    # Customer
    path("", views.my_loyalty),
    path("qr/", views.my_qr),
    path("qr/regenerate/", views.regenerate_qr),
    path("history/", views.my_history),

    # Staff
    path("staff/search/", views_staff.staff_search),
    path("staff/audit/", views_staff.staff_audit_log),
    path("staff/scan/", views_staff.staff_scan),
    path("staff/add-point/", views_staff.staff_add_point),
    path("staff/remove-point/", views_staff.staff_remove_point),
    path("staff/redeem/", views_staff.staff_redeem),
    path("staff/reset/", views_staff.staff_reset),
    path("staff/<uuid:public_id>/", views_staff.staff_account_detail),
]
