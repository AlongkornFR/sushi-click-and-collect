import uuid

from django.db import migrations, models


def gen_tokens(apps, schema_editor):
    """Attribue un UUID distinct à chaque commande existante."""
    Order = apps.get_model("orders", "Order")
    for order in Order.objects.filter(public_token__isnull=True).iterator():
        order.public_token = uuid.uuid4()
        order.save(update_fields=["public_token"])


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        # 1) champ nullable (pas de contrainte unique sur les lignes existantes)
        migrations.AddField(
            model_name="order",
            name="public_token",
            field=models.UUIDField(editable=False, null=True),
        ),
        # 2) remplissage avec des valeurs distinctes
        migrations.RunPython(gen_tokens, migrations.RunPython.noop),
        # 3) contrainte finale : unique + non-null
        migrations.AlterField(
            model_name="order",
            name="public_token",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
