"""Limitation des tentatives par adresse IP (lot H2).

S'applique que la personne soit connectée ou non : la limite vise
l'adresse, pas le compte. Les taux sont dans REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"].

Le cache par défaut de Django est en mémoire, propre à chaque processus :
avec plusieurs processus, la limite effective est multipliée d'autant.
C'est acceptable ici sans ajouter Redis.
"""
from rest_framework.throttling import SimpleRateThrottle


class IPRateThrottle(SimpleRateThrottle):
    scope = None

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginThrottle(IPRateThrottle):
    scope = "login"


class RegisterThrottle(IPRateThrottle):
    scope = "register"


class CheckoutThrottle(IPRateThrottle):
    scope = "checkout"


class ContactThrottle(IPRateThrottle):
    scope = "contact"


class PasswordResetThrottle(IPRateThrottle):
    scope = "password_reset"
