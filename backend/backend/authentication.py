"""Jetons de connexion qui expirent après une période sans utilisation (lot A8).

Avant, un jeton restait valable indéfiniment, même après la déconnexion.
Désormais :
- staff : expire après TOKEN_IDLE_DAYS_STAFF jours sans utilisation (7),
- clients : après TOKEN_IDLE_DAYS_CUSTOMER jours (30).

Le champ `created` du jeton DRF sert de « dernière utilisation » : il est
avancé au plus une fois par heure (pas d'écriture à chaque requête, l'écran
staff interroge le serveur toutes les 3 secondes). Aucune migration.
"""
from datetime import timedelta

from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.exceptions import AuthenticationFailed

TOUCH_EVERY = timedelta(hours=1)


def idle_limit(user):
    days = settings.TOKEN_IDLE_DAYS_STAFF if (user.is_staff or user.is_superuser) else settings.TOKEN_IDLE_DAYS_CUSTOMER
    return timedelta(days=days)


def touch_token(token, now=None):
    """Marque le jeton comme utilisé maintenant (connexion, ou usage)."""
    now = now or timezone.now()
    Token.objects.filter(pk=token.pk).update(created=now)
    token.created = now


class ExpiringTokenAuthentication(TokenAuthentication):

    def authenticate_credentials(self, key):
        user, token = super().authenticate_credentials(key)
        now = timezone.now()
        if token.created < now - idle_limit(user):
            token.delete()
            raise AuthenticationFailed("Session expirée. Reconnectez-vous.")
        if token.created < now - TOUCH_EVERY:
            touch_token(token, now)
        return user, token
