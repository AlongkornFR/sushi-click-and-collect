from rest_framework.exceptions import PermissionDenied


def get_customer_or_403(request):
    if not hasattr(request.user, "customer"):
        raise PermissionDenied("Compte non client.")
    return request.user.customer
