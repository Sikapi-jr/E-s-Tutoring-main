# Generated by Django 5.1.3 on 2025-05-31 18:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('playground', '0003_monthlyhours'),
    ]

    operations = [
        migrations.AddField(
            model_name='hours',
            name='status',
            field=models.CharField(choices=[('Accepted', 'ACCEPTED'), ('Disputed', 'DISPUTED'), ('Resolved', 'RESOLVED'), ('Void', 'VOID')], default='ACCPETED', max_length=15),
        ),
    ]
