import base64
import hashlib
import hmac
import io
import secrets

import qrcode


def generate_secret() -> str:
    return secrets.token_urlsafe(32)


def _sign(public_id: str, version: int, secret: str) -> str:
    msg = f"{public_id}.{version}".encode()
    sig = hmac.new(secret.encode(), msg, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(sig).rstrip(b"=").decode()


def build_payload(public_id, version: int, secret: str) -> str:
    return f"{public_id}.{version}.{_sign(str(public_id), version, secret)}"


def verify_payload(payload: str):
    """Returns the LoyaltyAccount the payload authenticates as, or None if the
    signature is invalid, the QR has been superseded by a regenerate, or the
    payload is malformed. Signature comparison is constant-time."""
    from .models import LoyaltyAccount  # local import: avoid module-load cycle

    if not isinstance(payload, str):
        return None
    parts = payload.strip().split(".")
    if len(parts) != 3:
        return None
    public_id, version_str, sig = parts
    try:
        version = int(version_str)
    except ValueError:
        return None

    try:
        account = LoyaltyAccount.objects.select_related("customer__user").get(public_id=public_id)
    except (LoyaltyAccount.DoesNotExist, ValueError):
        return None

    token = account.qr_tokens.filter(is_active=True).first()
    if not token or token.version != version:
        return None

    expected_sig = _sign(str(account.public_id), token.version, token.secret_encrypted)
    if not hmac.compare_digest(expected_sig, sig):
        return None

    return account


def generate_qr_png_base64(payload: str) -> str:
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()
