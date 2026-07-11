from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import models


def _fernet():
    key = getattr(settings, "LOYALTY_ENCRYPTION_KEY", None)
    if not key:
        raise RuntimeError("LOYALTY_ENCRYPTION_KEY is not configured.")
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_text(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_text(ciphertext: str) -> str:
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:
        raise ValueError("Unable to decrypt loyalty secret — check LOYALTY_ENCRYPTION_KEY.") from exc


class EncryptedTextField(models.TextField):
    """Stores text encrypted at rest with Fernet; transparent encrypt/decrypt on save/load."""

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        return decrypt_text(value)

    def to_python(self, value):
        return value

    def get_prep_value(self, value):
        if value is None:
            return value
        return encrypt_text(value)
