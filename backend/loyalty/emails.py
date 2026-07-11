"""Loyalty program email notifications — point earned / reward unlocked / redeemed."""
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

ACCENT = "#FFC366"
DARK_BG = "#1D1D1D"


def _dots(points, max_points):
    filled = "".join(f'<span style="color:{ACCENT}">■</span>' for _ in range(points))
    empty = "".join('<span style="color:rgba(255,255,255,0.15)">□</span>' for _ in range(max_points - points))
    return filled + empty


def _render_html(headline, emoji, body, points, max_points):
    frontend = getattr(settings, "FRONTEND_BASE_URL", "https://su-rice.com").rstrip("/")
    account_url = f"{frontend}/account"
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="padding:0 8px 24px">
          <p style="margin:0;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#111">
            Su-<span style="color:{ACCENT}">Rice</span>
          </p>
        </td></tr>
        <tr><td style="background:{DARK_BG};border-radius:20px;overflow:hidden">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:40px 32px 24px;text-align:center">
              <div style="display:inline-block;width:64px;height:64px;line-height:64px;border-radius:50%;background:rgba(255,195,102,0.15);font-size:32px;margin-bottom:16px">{emoji}</div>
              <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.02em">{headline}</h1>
              <p style="margin:12px 0 0;color:rgba(255,255,255,0.6);font-size:14px;line-height:1.6;max-width:440px;margin-left:auto;margin-right:auto">
                {body}
              </p>
              <p style="margin:24px 0 0;font-size:22px;letter-spacing:4px">{_dots(points, max_points)}</p>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.4);font-size:13px;font-weight:600">{points} / {max_points} points</p>
            </td></tr>
          </table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:0 24px 32px;text-align:center">
              <a href="{account_url}" style="display:inline-block;background:{ACCENT};color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 28px;border-radius:12px">
                Voir ma carte de fidélité →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 8px 0;text-align:center">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6">
            Su-Rice · 53 boulevard Carnot, Cannes<br>
            <a href="mailto:contact@su-rice.com" style="color:#6b7280;text-decoration:none">contact@su-rice.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""


def _render_text(headline, body, points, max_points):
    return "\n".join([
        f"Su-Rice — {headline}",
        "",
        body,
        "",
        f"{points} / {max_points} points",
        "",
        f"{getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')}/account",
    ])


def _send(to_email, subject, headline, emoji, body, points, max_points):
    if not to_email:
        return False
    if not (getattr(settings, "GMAIL_USER", "") and getattr(settings, "GMAIL_APP_PASSWORD", "")):
        return False
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=_render_text(headline, body, points, max_points),
            to=[to_email],
        )
        email.attach_alternative(_render_html(headline, emoji, body, points, max_points), "text/html")
        email.send(fail_silently=False)
        return True
    except Exception:
        import traceback
        traceback.print_exc()
        return False


def notify_point_earned(account, txn):
    max_points = account.MAX_POINTS
    _send(
        account.customer.user.email,
        "Su-Rice — +1 point fidélité",
        "Nouveau point !",
        "🎉",
        "Merci pour votre achat — un point vient d'être ajouté à votre carte de fidélité.",
        account.points,
        max_points,
    )


def notify_reward_unlocked(account):
    max_points = account.MAX_POINTS
    _send(
        account.customer.user.email,
        "Su-Rice — Récompense débloquée !",
        "Carte complète !",
        "🏆",
        "Votre carte de fidélité est pleine. Présentez votre QR code en boutique pour échanger votre récompense.",
        account.points,
        max_points,
    )


def notify_reward_redeemed(account):
    max_points = account.MAX_POINTS
    _send(
        account.customer.user.email,
        "Su-Rice — Récompense échangée",
        "Récompense échangée",
        "✅",
        "Votre récompense a été utilisée. Votre carte repart de zéro — merci de votre fidélité !",
        account.points,
        max_points,
    )
