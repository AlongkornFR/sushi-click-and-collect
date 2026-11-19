"""Email de réinitialisation du mot de passe (lot H8)."""
import logging
from html import escape

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_password_reset_email(user, reset_url: str) -> bool:
    first_name = escape(user.first_name or "")
    hello = f"Bonjour {first_name}," if first_name else "Bonjour,"
    minutes = settings.PASSWORD_RESET_TIMEOUT // 60

    text = (
        f"{hello}\n\n"
        "Vous avez demandé à réinitialiser le mot de passe de votre compte Su-Rice.\n"
        f"Choisissez un nouveau mot de passe ici (lien valable {minutes} minutes) :\n\n"
        f"{reset_url}\n\n"
        "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : "
        "votre mot de passe actuel reste valable.\n\n"
        "Su-Rice · 53 boulevard Carnot, Cannes · 04 93 68 08 12"
    )
    html = f"""<!doctype html>
<html lang="fr"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;padding:24px">
  <p>{hello}</p>
  <p>Vous avez demandé à réinitialiser le mot de passe de votre compte Su-Rice.</p>
  <p><a href="{escape(reset_url)}" style="display:inline-block;background:#FFC366;color:#000;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">Choisir un nouveau mot de passe</a></p>
  <p style="color:#555;font-size:13px">Lien valable {minutes} minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe actuel reste valable.</p>
  <p style="color:#888;font-size:12px">Su-Rice · 53 boulevard Carnot, Cannes · 04 93 68 08 12</p>
</body></html>"""

    try:
        message = EmailMultiAlternatives(
            subject="Su-Rice : réinitialisation de votre mot de passe",
            body=text,
            to=[user.email],
        )
        message.attach_alternative(html, "text/html")
        message.send(fail_silently=False)
        return True
    except Exception:
        logger.exception("Envoi de l'email de réinitialisation impossible (utilisateur #%s).", user.pk)
        return False
