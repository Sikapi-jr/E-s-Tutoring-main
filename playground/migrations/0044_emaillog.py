from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('playground', '0043_add_header_image_to_group_class'),
    ]

    operations = [
        migrations.CreateModel(
            name='EmailLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('recipient_email', models.EmailField(max_length=254)),
                ('recipient_name', models.CharField(blank=True, max_length=255)),
                ('subject', models.CharField(max_length=500)),
                ('email_type', models.CharField(
                    choices=[
                        ('weekly_hours',         'Weekly Hours Summary'),
                        ('monthly_hours',        'Monthly Hours Summary'),
                        ('invoice',              'Invoice Notification'),
                        ('invoice_reminder',     'Invoice Reminder'),
                        ('verification',         'Email Verification'),
                        ('welcome_tutor',        'Tutor Welcome'),
                        ('welcome_parent',       'Parent Welcome'),
                        ('tutor_reply',          'Tutor Reply'),
                        ('new_request',          'New Request'),
                        ('monthly_report',       'Monthly Report'),
                        ('hour_dispute',         'Hour Dispute'),
                        ('dispute_admin',        'Dispute Admin Notification'),
                        ('referral_bonus',       'Referral Bonus'),
                        ('referral_admin',       'Referral Admin Notification'),
                        ('tutor_transfer',       'Tutor Transfer'),
                        ('parent_registration',  'Parent Registration'),
                        ('health_check',         'Health Check'),
                        ('bulk_parent',          'Bulk Parent Email'),
                        ('bulk_tutor',           'Bulk Tutor Email'),
                        ('bulk_custom',          'Bulk Custom Email'),
                        ('hours_reminder',       'Hours Reminder'),
                        ('test',                 'Test Email'),
                        ('other',                'Other'),
                    ],
                    default='other',
                    max_length=50,
                )),
                ('status', models.CharField(
                    choices=[('sent', 'Sent'), ('failed', 'Failed'), ('skipped', 'Skipped')],
                    default='sent',
                    max_length=20,
                )),
                ('from_email', models.EmailField(blank=True, max_length=254)),
                ('error_message', models.TextField(blank=True)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-sent_at'],
            },
        ),
    ]
