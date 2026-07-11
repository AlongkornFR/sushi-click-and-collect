# orders/emails.py
import base64
import logging

import requests as http_requests
from django.conf import settings
from django.utils import timezone

from .receipt import generate_receipt_pdf

logger = logging.getLogger(__name__)


def send_receipt_email(order):
    """Envoie le reçu (HTML + PDF joint) via Resend. Silencieux en cas d'échec."""
    api_key = getattr(settings, "RESEND_API_KEY", "")
    from_email = getattr(settings, "RESEND_FROM_EMAIL", "")
    if not api_key or not from_email:
        return

    try:
        pdf_bytes = generate_receipt_pdf(order)
        pdf_b64 = base64.b64encode(pdf_bytes).decode()
    except Exception:
        logger.exception("Génération du reçu PDF impossible (commande #%s)", order.id)
        return

    created = timezone.localtime(order.created_at).strftime("%d/%m/%Y à %H:%M")
    total = f"{order.total_cents / 100:.2f} €"

    html = f"""
    <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
      <h2 style="margin:0 0 8px;font-size:22px;color:#111">Su-Rice — Merci pour votre commande !</h2>
      <p style="color:#555;font-size:14px;margin:0 0 24px">Votre reçu est joint à cet email en PDF.</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#444">
        <tr><td style="padding:6px 0;font-weight:600;color:#111;width:140px">Commande</td><td>#{order.id}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#111">Date</td><td>{created}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#111">Retrait</td><td>{order.pickup_time}</td></tr>
        <tr><td style="padding:6px 0;font-weight:600;color:#111">Total</td><td><strong>{total}</strong></td></tr>
      </table>

      <div style="margin-top:24px;padding:16px;background:#fff;border-radius:8px;border:1px solid #eee">
        <p style="margin:0 0 8px;font-weight:600;font-size:13px;color:#111">Détail de la commande</p>
        {"".join(
            f'<p style="margin:4px 0;font-size:13px;color:#555">{item.quantity}x {item.product_name} — {item.line_total_cents()/100:.2f} €</p>'
            for item in order.items.all()
        )}
      </div>

      <p style="margin-top:24px;font-size:12px;color:#999;text-align:center">
        Su-Rice · Cannes · contact@su-rice.com
      </p>
    </div>
    """

    try:
        http_requests.post(
            "https://api.resend.com/emails",
            json={
                "from": from_email,
                "to": [order.email],
                "subject": f"Su-Rice — Reçu commande #{order.id}",
                "html": html,
                "attachments": [{
                    "filename": f"recu-surice-{order.id}.pdf",
                    "content": pdf_b64,
                }],
            },
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=15,
        )
    except Exception:
        logger.exception("Envoi du reçu par email impossible (commande #%s)", order.id)
