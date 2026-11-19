import logging
from html import escape

import requests as http_requests

from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from backend.throttles import ContactThrottle
from .models import ContactMessage
from .serializers import ContactSerializer

logger = logging.getLogger(__name__)
CONTACT_FAILED = "Le message n'a pas pu être envoyé. Réessayez ou appelez-nous au 04 93 68 08 12."


@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([ContactThrottle])
def contact_send(request):
    serializer = ContactSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Lot A8 : enregistré d'abord, pour ne jamais perdre un message même si
    # l'envoi de l'email échoue.
    saved = ContactMessage.objects.create(
        first_name=data["first_name"], last_name=data["last_name"], email=data["email"],
        phone=data.get("phone", ""), message=data["message"],
    )

    api_key    = getattr(settings, "RESEND_API_KEY", "")
    from_email = getattr(settings, "RESEND_FROM_EMAIL", "onboarding@resend.dev")
    to_email   = getattr(settings, "CONTACT_RECEIVER_EMAIL", "")

    if not api_key or not to_email:
        return Response(
            {"detail": CONTACT_FAILED},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    subject = f"Contact Su-Rice — {data['first_name']} {data['last_name']}"

    text_body = (
        f"Nouveau message reçu depuis le formulaire de contact.\n\n"
        f"Nom      : {data['last_name']}\n"
        f"Prénom   : {data['first_name']}\n"
        f"Email    : {data['email']}\n"
        f"Téléphone: {data.get('phone', '—')}\n\n"
        f"Message :\n{data['message']}\n"
    )

    # Lot M4 : tout ce qui vient du formulaire est échappé avant d'entrer
    # dans le HTML (sinon un visiteur peut injecter liens ou faux contenu).
    safe = {k: escape(str(v or "—")) for k, v in data.items()}
    html_body = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
      <h2 style="margin:0 0 24px;font-size:20px;color:#111">Nouveau message — Su-Rice</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
        <tr><td style="padding:8px 0;font-weight:600;color:#111;width:120px">Nom</td><td>{safe['last_name']}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;color:#111">Prénom</td><td>{safe['first_name']}</td></tr>
        <tr><td style="padding:8px 0;font-weight:600;color:#111">Email</td><td><a href="mailto:{safe['email']}" style="color:#111">{safe['email']}</a></td></tr>
        <tr><td style="padding:8px 0;font-weight:600;color:#111">Téléphone</td><td>{safe.get('phone', '—')}</td></tr>
      </table>
      <div style="margin-top:24px;padding:16px;background:#fff;border-radius:8px;border:1px solid #eee">
        <p style="margin:0;font-size:14px;color:#111;white-space:pre-wrap">{safe['message']}</p>
      </div>
      <p style="margin-top:24px;font-size:12px;color:#999">Envoyé depuis le formulaire de contact Su-Rice</p>
    </div>
    """

    try:
        resp = http_requests.post(
            "https://api.resend.com/emails",
            json={
                "from":     from_email,
                "to":       [to_email],
                "reply_to": data["email"],
                "subject":  subject,
                "text":     text_body,
                "html":     html_body,
            },
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
        )
        resp.raise_for_status()
    except http_requests.HTTPError as e:
        logger.error("Resend HTTP %s : %s", e.response.status_code, e.response.text[:500])
        return Response({"detail": CONTACT_FAILED}, status=status.HTTP_502_BAD_GATEWAY)
    except Exception:
        logger.exception("Envoi du formulaire de contact impossible.")
        return Response({"detail": CONTACT_FAILED}, status=status.HTTP_502_BAD_GATEWAY)

    ContactMessage.objects.filter(pk=saved.pk).update(email_sent=True)
    return Response({"detail": "Message envoyé avec succès."}, status=status.HTTP_200_OK)
