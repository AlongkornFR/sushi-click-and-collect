"""Horaires de retrait Click & Collect : seule source de vérité.

Horaires validés par le restaurant le 19/11/2026 :
- lundi à jeudi : 12h00-14h30 et 19h15-21h45
- vendredi      : 12h00-14h30 et 19h15-22h00
- samedi, dimanche : fermé

Les créneaux tombent toutes les SLOT_MINUTES depuis le début de chaque
service, heure de fermeture incluse (dernier créneau du midi : 14h30).
Le frontend lit ces horaires via GET /api/opening-hours/.
"""
from datetime import datetime, time, timedelta

from django.utils import timezone

SLOT_MINUTES = 15
PREP_MINUTES = 20          # délai minimum entre la commande et le retrait
MAX_DAYS_AHEAD = 14        # au-delà, le créneau est refusé

# Clé : datetime.weekday() (0 = lundi ... 6 = dimanche)
_LUNCH = (time(12, 0), time(14, 30))
OPENING_HOURS = {
    0: [_LUNCH, (time(19, 15), time(21, 45))],
    1: [_LUNCH, (time(19, 15), time(21, 45))],
    2: [_LUNCH, (time(19, 15), time(21, 45))],
    3: [_LUNCH, (time(19, 15), time(21, 45))],
    4: [_LUNCH, (time(19, 15), time(22, 0))],
    5: [],
    6: [],
}

_DAYS_FR = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]


class PickupError(ValueError):
    """Créneau refusé ; le message est destiné au client."""


def _is_on_slot_grid(local_dt: datetime) -> bool:
    t = local_dt.time().replace(second=0, microsecond=0)
    if local_dt.second or local_dt.microsecond:
        return False
    for start, end in OPENING_HOURS[local_dt.weekday()]:
        if start <= t <= end:
            minutes_from_start = (t.hour * 60 + t.minute) - (start.hour * 60 + start.minute)
            return minutes_from_start % SLOT_MINUTES == 0
    return False


def parse_pickup(value: str, now: datetime | None = None) -> datetime:
    """Transforme le créneau envoyé par le checkout en datetime aware (Europe/Paris).

    Formats acceptés :
    - "AAAA-MM-JJ HH:MM" (format actuel du site)
    - "HH:MM" (ancienne version du site, en cache chez un client) : aujourd'hui
    """
    now = timezone.localtime(now or timezone.now())
    raw = (value or "").strip()
    try:
        if len(raw) == 5:
            naive = datetime.combine(now.date(), datetime.strptime(raw, "%H:%M").time())
        else:
            naive = datetime.strptime(raw, "%Y-%m-%d %H:%M")
    except ValueError:
        raise PickupError("Créneau de retrait invalide.")

    local_dt = timezone.make_aware(naive, timezone.get_current_timezone())

    if not OPENING_HOURS[local_dt.weekday()]:
        raise PickupError("Le restaurant est fermé ce jour-là. Choisissez un créneau du lundi au vendredi.")
    if not _is_on_slot_grid(local_dt):
        raise PickupError("Ce créneau est en dehors des horaires de retrait.")
    if local_dt < now + timedelta(minutes=PREP_MINUTES):
        raise PickupError(
            f"Ce créneau est trop proche : prévoyez au moins {PREP_MINUTES} minutes de préparation."
        )
    if local_dt.date() > (now + timedelta(days=MAX_DAYS_AHEAD)).date():
        raise PickupError(f"Les commandes sont possibles jusqu'à {MAX_DAYS_AHEAD} jours à l'avance.")
    return local_dt


def pickup_label(order) -> str:
    """Libellé français du retrait : "ven. 21/11 à 12h30".

    Les commandes passées avant l'ajout de pickup_at n'ont que l'heure.
    """
    if getattr(order, "pickup_at", None):
        d = timezone.localtime(order.pickup_at)
        return f"{_DAYS_FR[d.weekday()]} {d:%d/%m} à {d:%H}h{d:%M}"
    return (order.pickup_time or "").replace(":", "h")


def public_schedule() -> dict:
    """Horaires exposés au frontend pour construire les créneaux."""
    return {
        "timezone": "Europe/Paris",
        "slot_minutes": SLOT_MINUTES,
        "prep_minutes": PREP_MINUTES,
        "max_days_ahead": MAX_DAYS_AHEAD,
        # Clé : jour JavaScript (0 = dimanche ... 6 = samedi)
        "days": {
            str((weekday + 1) % 7): [[f"{s:%H:%M}", f"{e:%H:%M}"] for s, e in services]
            for weekday, services in OPENING_HOURS.items()
        },
    }
