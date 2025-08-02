from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('application', 'initial'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Macro',
        ),
    ]