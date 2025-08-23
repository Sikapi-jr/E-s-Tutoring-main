# Generated migration for phone number and tutor complaints

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('playground', '0022_user_email_notifications'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='phone_number',
            field=models.CharField(blank=True, help_text='Contact phone number', max_length=20, null=True),
        ),
        migrations.CreateModel(
            name='TutorComplaint',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.TextField(help_text="Student's complaint message")),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('reviewed', 'Reviewed'), ('resolved', 'Resolved')], default='pending', max_length=20)),
                ('admin_reply', models.TextField(blank=True, help_text='Admin response to complaint', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('reviewed_by', models.ForeignKey(blank=True, limit_choices_to={'is_superuser': True}, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='complaints_reviewed', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(limit_choices_to={'roles': 'student'}, on_delete=django.db.models.deletion.CASCADE, related_name='complaints_filed', to=settings.AUTH_USER_MODEL)),
                ('tutor', models.ForeignKey(limit_choices_to={'roles': 'tutor'}, on_delete=django.db.models.deletion.CASCADE, related_name='complaints_received', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]