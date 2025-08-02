from django.db import migrations, models

class Migration(migrations.Migration):

    initial = True
    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Macro',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(help_text='Nome único para a macro.', max_length=100, unique=True)),
                ('description', models.TextField(blank=True, help_text='O que esta macro faz?', null=True)),
                ('steps', models.JSONField(help_text='A lista de passos de transformação.')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]