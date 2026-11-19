"""python manage.py expire_pending_orders

Annule les commandes non payées depuis plus de 60 minutes (après
vérification auprès de Payplug). Utilisable en tâche planifiée (Render Cron
Job) ; l'écran staff la déclenche aussi, au plus une fois par minute.
"""
from django.core.management.base import BaseCommand

from orders.services import expire_stale_pending_orders


class Command(BaseCommand):
    help = "Annule les commandes non payées depuis plus de 60 minutes."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200)

    def handle(self, *args, **options):
        cancelled, paid = expire_stale_pending_orders(limit=options["limit"])
        self.stdout.write(f"{len(cancelled)} annulée(s), {len(paid)} finalement payée(s).")
