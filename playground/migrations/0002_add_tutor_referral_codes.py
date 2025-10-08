# Generated migration for tutor referral codes
from django.db import migrations, models
import random
import string


def generate_unique_code(apps):
    """Generate a unique 6-digit alphanumeric code"""
    User = apps.get_model('playground', 'User')
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not User.objects.filter(tutor_referral_code=code).exists():
            return code


def add_referral_codes_to_tutors(apps, schema_editor):
    """Add referral codes to all existing tutors"""
    User = apps.get_model('playground', 'User')
    tutors = User.objects.filter(roles='tutor', tutor_referral_code__isnull=True)

    for tutor in tutors:
        tutor.tutor_referral_code = generate_unique_code(apps)
        tutor.save(update_fields=['tutor_referral_code'])

    print(f"Added referral codes to {tutors.count()} tutors")


def reverse_codes(apps, schema_editor):
    """Remove all referral codes if migration is reversed"""
    User = apps.get_model('playground', 'User')
    User.objects.filter(roles='tutor').update(tutor_referral_code=None)


class Migration(migrations.Migration):

    dependencies = [
        ('playground', '0001_initial'),  # Replace with your latest migration
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='tutor_referral_code',
            field=models.CharField(
                blank=True,
                help_text='6-digit referral code for tutors',
                max_length=6,
                null=True,
                unique=True
            ),
        ),
        migrations.RunPython(add_referral_codes_to_tutors, reverse_codes),
    ]
