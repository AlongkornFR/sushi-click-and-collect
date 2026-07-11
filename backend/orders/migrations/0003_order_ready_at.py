from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0002_order_printed"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="ready_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
