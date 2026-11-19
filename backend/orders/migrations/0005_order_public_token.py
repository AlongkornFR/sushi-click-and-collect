"""Ajoute Order.public_token en trois étapes, sans perte de données.

1. colonne nullable, sans contrainte (les lignes existantes restent valides)
2. un UUID distinct pour chaque commande existante
3. contrainte unique + non nulle, avec valeur par défaut pour les nouvelles

Reprend l'approche du commit 01b7b4d (branche origin/local), renumérotée
après 0004 pour suivre l'historique de main.
"""
import uuid

from django.db import migrations, models


def fill_tokens(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.filter(public_token__isnull=True).only("id").iterator():
        Order.objects.filter(pk=order.pk).update(public_token=uuid.uuid4())


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_order_pickup_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="public_token",
            field=models.UUIDField(editable=False, null=True),
        ),
        migrations.RunPython(fill_tokens, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="order",
            name="public_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
