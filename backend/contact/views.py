from django.conf import settings
from django.core.mail import send_mail
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .serializers import ContactSerializer


@api_view(["POST"])
@permission_classes([AllowAny])
def contact_send(request):
    serializer = ContactSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    subject = f"Nouveau message de contact - {data['first_name']} {data['last_name']}"

    message = (
        f"Nouveau message reçu depuis le formulaire de contact.\n\n"
        f"Nom : {data['last_name']}\n"
        f"Prénom : {data['first_name']}\n"
        f"Email : {data['email']}\n"
        f"Téléphone : {data.get('phone', '')}\n\n"
        f"Message :\n{data['message']}\n"
    )

    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.CONTACT_RECEIVER_EMAIL],
        fail_silently=False,
    )

    return Response(
        {"detail": "Message envoyé avec succès."},
        status=status.HTTP_200_OK,
    )