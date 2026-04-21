from django.urls import path
from . import views, views_staff

urlpatterns = [
    # Customer auth & profile
    path("auth/register/", views.register),
    path("auth/login/", views.login),
    path("auth/me/", views.me),
    path("auth/change-password/", views.change_password),
    path("auth/change-email/", views.change_email),
    path("auth/delete/", views.delete_account),
    path("auth/orders/", views.order_history),

    # Staff user management
    path("staff/users/", views_staff.list_users),
    path("staff/users/<int:pk>/", views_staff.get_user),
    path("staff/users/<int:pk>/delete/", views_staff.delete_user),
]
