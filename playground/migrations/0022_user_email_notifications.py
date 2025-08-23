# Generated migration for email notification preferences

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('playground', '0021_hourdispute'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='email_notifications_enabled',
            field=models.BooleanField(default=True, help_text='Enable all email notifications'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_new_requests',
            field=models.BooleanField(default=True, help_text='Email when new requests are created (tutors only)'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_replies',
            field=models.BooleanField(default=True, help_text='Email when tutors reply to requests (parents only)'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_disputes',
            field=models.BooleanField(default=True, help_text='Email when disputes are created'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_monthly_hours',
            field=models.BooleanField(default=True, help_text='Email when monthly hours are available'),
        ),
        migrations.AddField(
            model_name='user',
            name='email_monthly_reports',
            field=models.BooleanField(default=True, help_text='Email when monthly reports are submitted'),
        ),
    ]