from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="printed",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="printed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
