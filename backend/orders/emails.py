"""Email notifications — reçu PDF et changements de statut."""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .receipt import generate_receipt_pdf


# ── Palette & config ────────────────────────────────────────────────────────
ACCENT = "#FFC366"
DARK_BG = "#1D1D1D"
LIGHT_BG = "#f9f9f9"

STATUS_MESSAGES = {
    "paid": {
        "subject":   "Su-Rice — Commande confirmée",
        "headline":  "Paiement confirmé",
        "emoji":     "💳",
        "body":      "Votre commande a bien été reçue et payée. Le ticket est joint à cet email.",
        "attach_receipt": True,
    },
    "preparing": {
        "subject":   "Su-Rice — Votre commande est en préparation",
        "headline":  "On s'y met !",
        "emoji":     "👨‍🍳",
        "body":      "Notre équipe prépare votre commande. Vous recevrez un nouveau message dès qu'elle sera prête à être récupérée.",
        "attach_receipt": False,
    },
    "ready": {
        "subject":   "Su-Rice — Votre commande est prête à récupérer",
        "headline":  "C'est prêt !",
        "emoji":     "🔔",
        "body":      "Votre commande vous attend en boutique. Venez la récupérer à l'heure convenue.",
        "attach_receipt": False,
    },
    "collected": {
        "subject":   "Su-Rice — Merci pour votre visite",
        "headline":  "À très vite !",
        "emoji":     "✅",
        "body":      "Merci d'avoir choisi Su-Rice. On espère que vous vous êtes régalé — à bientôt pour une nouvelle commande !",
        "attach_receipt": False,
    },
    "cancelled": {
        "subject":   "Su-Rice — Commande annulée",
        "headline":  "Commande annulée",
        "emoji":     "✖️",
        "body":      "Votre commande a été annulée. Si le paiement a déjà été prélevé, un remboursement sera effectué sous 3 à 5 jours ouvrés.",
        "attach_receipt": False,
    },
}


# ── Template HTML ───────────────────────────────────────────────────────────
def _render_html(order, msg):
    created   = order.created_at.strftime("%d/%m/%Y à %H:%M")
    total_eur = f"{order.total_cents / 100:.2f} €"
    frontend  = getattr(settings, "FRONTEND_BASE_URL", "https://su-rice.com").rstrip("/")
    account_url = f"{frontend}/account"

    items_html = "".join(
        f'<tr>'
        f'<td style="padding:6px 0;color:#d1d5db;font-size:13px">'
        f'<span style="color:#FFC366;font-weight:600">{item.quantity}×</span> {item.product_name}'
        f'</td>'
        f'<td style="padding:6px 0;color:#d1d5db;font-size:13px;text-align:right;font-variant-numeric:tabular-nums">'
        f'{item.line_total_cents()/100:.2f} €'
        f'</td>'
        f'</tr>'
        for item in order.items.all()
    )

    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

        <!-- Brand header -->
        <tr><td style="padding:0 8px 24px">
          <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#111">
            Su-<span style="color:{ACCENT}">Rice</span>
          </p>
        </td></tr>

        <!-- Main card (dark, like site) -->
        <tr><td style="background:{DARK_BG};border-radius:20px;overflow:hidden">

          <!-- Hero -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:40px 32px 24px;text-align:center">
              <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:rgba(255,195,102,0.15);font-size:32px;margin-bottom:16px">{msg['emoji']}</div>
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em">{msg['headline']}</h1>
              <p style="margin:12px 0 0;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;max-width:440px;margin-left:auto;margin-right:auto">
                {msg['body']}
              </p>
            </td></tr>
          </table>

          <!-- Order summary -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px">
            <tr><td style="padding:0 24px 24px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px">
                <tr><td style="padding:20px 24px;border-bottom:1px solid rgba(255,255,255,0.06)">
                  <table role="presentation" width="100%"><tr>
                    <td>
                      <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Commande</p>
                      <p style="margin:0;color:#fff;font-size:18px;font-weight:700">#{order.id}</p>
                    </td>
                    <td style="text-align:right">
                      <p style="margin:0 0 4px;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Retrait</p>
                      <p style="margin:0;color:{ACCENT};font-size:16px;font-weight:700">⏱ {order.pickup_time}</p>
                    </td>
                  </tr></table>
                </td></tr>

                <tr><td style="padding:18px 24px">
                  <p style="margin:0 0 10px;color:rgba(255,255,255,0.4);font-size:10px;text-transform:uppercase;letter-spacing:1.5px;font-weight:600">Détail</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    {items_html}
                  </table>
                </td></tr>

                <tr><td style="padding:16px 24px;border-top:1px solid rgba(255,255,255,0.06);background:rgba(255,195,102,0.04)">
                  <table role="presentation" width="100%"><tr>
                    <td style="color:rgba(255,255,255,0.6);font-size:13px;font-weight:500">Total</td>
                    <td style="color:#fff;font-size:18px;font-weight:800;text-align:right">{total_eur}</td>
                  </tr></table>
                </td></tr>
              </table>
            </td></tr>
          </table>

          <!-- CTA -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 24px 32px;text-align:center">
              <a href="{account_url}" style="display:inline-block;background:{ACCENT};color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px">
                Voir ma commande →
              </a>
              <p style="margin:16px 0 0;color:rgba(255,255,255,0.4);font-size:12px">
                Passée le {created}
              </p>
            </td></tr>
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:24px 8px 0;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6">
            Su-Rice · 53 boulevard Carnot, Cannes<br>
            <a href="mailto:contact@su-rice.com" style="color:#6b7280;text-decoration:none">contact@su-rice.com</a>
          </p>
          <p style="margin:12px 0 0;color:#d1d5db;font-size:11px">
            Vous recevez cet email suite à votre commande #{order.id}.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>"""


def _render_text(order, msg):
    lines = [
        f"Su-Rice — {msg['headline']}",
        "",
        msg["body"],
        "",
        f"Commande #{order.id}",
        f"Retrait : {order.pickup_time}",
        "",
        "Détail :",
    ]
    for item in order.items.all():
        lines.append(f"  {item.quantity}× {item.product_name} — {item.line_total_cents()/100:.2f} €")
    lines.append("")
    lines.append(f"Total : {order.total_cents / 100:.2f} €")
    lines.append("")
    lines.append(f"Voir ma commande : {getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')}/account")
    lines.append("")
    lines.append("Su-Rice · Cannes · contact@su-rice.com")
    return "\n".join(lines)


# ── Envoi ───────────────────────────────────────────────────────────────────
def send_order_status_email(order, status=None):
    """Envoie un email selon le statut de la commande."""
    st = status or order.status
    msg = STATUS_MESSAGES.get(st)
    if not msg:
        return False
    if not order.email:
        return False
    if not (getattr(settings, "GMAIL_USER", "") and getattr(settings, "GMAIL_APP_PASSWORD", "")):
        return False

    try:
        email = EmailMultiAlternatives(
            subject=msg["subject"],
            body=_render_text(order, msg),
            to=[order.email],
        )
        email.attach_alternative(_render_html(order, msg), "text/html")

        if msg.get("attach_receipt"):
            try:
                pdf_bytes = generate_receipt_pdf(order)
                email.attach(f"recu-surice-{order.id}.pdf", pdf_bytes, "application/pdf")
            except Exception:
                pass

        email.send(fail_silently=False)
        return True
    except Exception as e:
        import traceback; traceback.print_exc()
        return False
