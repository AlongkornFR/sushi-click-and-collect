"""Chiffres de l'espace staff (lot A7).

Les prix sont saisis TTC ; le HT se déduit du taux de TVA figé sur chaque
ligne de commande au moment de l'achat : HT = TTC / (1 + taux).
Une commande compte dans le chiffre d'affaires dès qu'elle est payée et
n'est pas annulée, à la date de la commande (heure de Paris).
"""
from collections import defaultdict
from datetime import datetime, time, timedelta
from decimal import ROUND_HALF_UP, Decimal

from django.utils import timezone

from .models import Order, OrderItem

REVENUE_STATUSES = ("paid", "preparing", "ready", "collected")
PERIODS = ("today", "7d", "month", "custom")
MAX_CUSTOM_DAYS = 366


class PeriodError(ValueError):
    pass


def period_bounds(period, date_from=None, date_to=None, today=None):
    """Renvoie (début inclus, fin exclue, premier jour, dernier jour) en heure de Paris."""
    today = today or timezone.localdate()
    if period == "today":
        first, last = today, today
    elif period == "7d":
        first, last = today - timedelta(days=6), today
    elif period == "month":
        first, last = today.replace(day=1), today
    elif period == "custom":
        try:
            first = datetime.strptime(date_from or "", "%Y-%m-%d").date()
            last = datetime.strptime(date_to or "", "%Y-%m-%d").date()
        except ValueError:
            raise PeriodError("Dates invalides (format attendu : AAAA-MM-JJ).")
        if last < first:
            raise PeriodError("La date de fin est avant la date de début.")
        if (last - first).days >= MAX_CUSTOM_DAYS:
            raise PeriodError("Période trop longue (un an maximum).")
    else:
        raise PeriodError("Période inconnue.")
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime.combine(first, time.min), tz)
    end = timezone.make_aware(datetime.combine(last + timedelta(days=1), time.min), tz)
    return start, end, first, last


def _ht_cents(ttc_cents, rate):
    """HT d'un montant TTC en centimes, arrondi au centime."""
    ht = Decimal(ttc_cents) * Decimal(100) / (Decimal(100) + Decimal(rate))
    return int(ht.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def compute_stats(start, end, top_limit=10):
    orders = Order.objects.filter(status__in=REVENUE_STATUSES, created_at__gte=start, created_at__lt=end)
    items = OrderItem.objects.filter(order__in=orders).values(
        "product_id", "product_name", "unit_price_cents", "quantity", "vat_rate")

    ttc_by_rate = defaultdict(int)
    by_product = {}
    for it in items:
        line_ttc = it["unit_price_cents"] * it["quantity"]
        # « 10 », « 5.5 », « 20 » (format "f" : normalize() seul donnerait « 1E+1 »)
        rate_key = format(Decimal(it["vat_rate"]).normalize(), "f")
        ttc_by_rate[rate_key] += line_ttc

        p = by_product.setdefault(it["product_id"], {"name": it["product_name"], "quantity": 0, "ttc_cents": 0})
        p["quantity"] += it["quantity"]
        p["ttc_cents"] += line_ttc
        p["name"] = it["product_name"]

    # HT calculé une fois par taux, sur le total TTC du taux (comme une
    # facture) : arrondir ligne par ligne puis additionner décalait de
    # quelques centimes.
    vat_breakdown = []
    for rate, rate_ttc in sorted(ttc_by_rate.items(), key=lambda kv: Decimal(kv[0])):
        rate_ht = _ht_cents(rate_ttc, rate)
        vat_breakdown.append({"rate": rate, "ttc_cents": rate_ttc, "ht_cents": rate_ht, "vat_cents": rate_ttc - rate_ht})

    ttc = sum(r["ttc_cents"] for r in vat_breakdown)
    ht = sum(r["ht_cents"] for r in vat_breakdown)
    order_count = orders.count()

    top = sorted(by_product.values(), key=lambda p: (-p["quantity"], -p["ttc_cents"], p["name"]))[:top_limit]

    return {
        "order_count": order_count,
        "revenue_ttc_cents": ttc,
        "revenue_ht_cents": ht,
        "vat_cents": ttc - ht,
        "average_basket_cents": round(ttc / order_count) if order_count else 0,
        "vat_breakdown": vat_breakdown,
        "top_products": top,
    }
