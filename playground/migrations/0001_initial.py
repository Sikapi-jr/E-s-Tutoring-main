# Generated by Django 5.1.3 on 2025-06-18 01:37

import django.contrib.auth.models
import django.contrib.auth.validators
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='AiChatSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('password', models.CharField(max_length=128, verbose_name='password')),
                ('is_superuser', models.BooleanField(default=False, help_text='Designates that this user has all permissions without explicitly assigning them.', verbose_name='superuser status')),
                ('username', models.CharField(error_messages={'unique': 'A user with that username already exists.'}, help_text='Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.', max_length=150, unique=True, validators=[django.contrib.auth.validators.UnicodeUsernameValidator()], verbose_name='username')),
                ('first_name', models.CharField(blank=True, max_length=150, verbose_name='first name')),
                ('last_name', models.CharField(blank=True, max_length=150, verbose_name='last name')),
                ('is_staff', models.BooleanField(default=False, help_text='Designates whether the user can log into this admin site.', verbose_name='staff status')),
                ('date_joined', models.DateTimeField(default=django.utils.timezone.now, verbose_name='date joined')),
                ('firstName', models.CharField(blank=True, default='None', max_length=50)),
                ('lastName', models.CharField(blank=True, default='None', max_length=50)),
                ('address', models.CharField(blank=True, default='Unknown', max_length=60)),
                ('city', models.CharField(blank=True, choices=[('Ajax', 'Ajax'), ('Aurora', 'Aurora'), ('Barrie', 'Barrie'), ('Belleville', 'Belleville'), ('Brampton', 'Brampton'), ('Brantford', 'Brantford'), ('Burlington', 'Burlington'), ('Cambridge', 'Cambridge'), ('Chatham-Kent', 'Chatham-Kent'), ('Clarington', 'Clarington'), ('Collingwood', 'Collingwood'), ('Cornwall', 'Cornwall'), ('Dryden', 'Dryden'), ('Georgina', 'Georgina'), ('Grimsby', 'Grimsby'), ('Guelph', 'Guelph'), ('Hamilton', 'Hamilton'), ('Huntsville', 'Huntsville'), ('Innisfil', 'Innisfil'), ('Kawartha Lakes', 'Kawartha Lakes'), ('Kenora', 'Kenora'), ('Kingston', 'Kingston'), ('Kitchener', 'Kitchener'), ('Leamington', 'Leamington'), ('London', 'London'), ('Markham', 'Markham'), ('Midland', 'Midland'), ('Milton', 'Milton'), ('Mississauga', 'Mississauga'), ('Newmarket', 'Newmarket'), ('Niagara Falls', 'Niagara Falls'), ('Niagara-on-the-Lake', 'Niagara-on-the-Lake'), ('North Bay', 'North Bay'), ('Oakville', 'Oakville'), ('Orangeville', 'Orangeville'), ('Orillia', 'Orillia'), ('Oshawa', 'Oshawa'), ('Ottawa', 'Ottawa'), ('Peterborough', 'Peterborough'), ('Pickering', 'Pickering'), ('Quinte West', 'Quinte West'), ('Richmond Hill', 'Richmond Hill'), ('Sarnia', 'Sarnia'), ('St. Catharines', 'St. Catharines'), ('St. Thomas', 'St. Thomas'), ('Stratford', 'Stratford'), ('Sudbury', 'Sudbury'), ('Tecumseh', 'Tecumseh'), ('Thunder Bay', 'Thunder Bay'), ('Timmins', 'Timmins'), ('Toronto', 'Toronto'), ('Vaughan', 'Vaughan'), ('Wasaga Beach', 'Wasaga Beach'), ('Waterloo', 'Waterloo'), ('Welland', 'Welland'), ('Whitby', 'Whitby'), ('Windsor', 'Windsor'), ('Woodstock', 'Woodstock')], default='None', max_length=20)),
                ('roles', models.CharField(blank=True, default='parent', max_length=20)),
                ('email', models.EmailField(blank=True, max_length=254, null=True, unique=True)),
                ('rateOnline', models.DecimalField(decimal_places=2, default=35.0, max_digits=10)),
                ('rateInPerson', models.DecimalField(decimal_places=2, default=60.0, max_digits=10)),
                ('last_login', models.DateTimeField(default=django.utils.timezone.now)),
                ('is_active', models.BooleanField(default=True)),
                ('groups', models.ManyToManyField(blank=True, help_text='The groups this user belongs to. A user will get all permissions granted to each of their groups.', related_name='user_set', related_query_name='user', to='auth.group', verbose_name='groups')),
                ('parent', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='children', to=settings.AUTH_USER_MODEL)),
                ('user_permissions', models.ManyToManyField(blank=True, help_text='Specific permissions for this user.', related_name='user_set', related_query_name='user', to='auth.permission', verbose_name='user permissions')),
            ],
            options={
                'verbose_name': 'user',
                'verbose_name_plural': 'users',
                'abstract': False,
            },
            managers=[
                ('objects', django.contrib.auth.models.UserManager()),
            ],
        ),
        migrations.CreateModel(
            name='AiRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('running', 'Running'), ('complete', 'Complete'), ('failed', 'Failed')], default='pending', max_length=50)),
                ('messages', models.JSONField()),
                ('response', models.JSONField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('session', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='playground.aichatsession')),
            ],
        ),
        migrations.CreateModel(
            name='Hours',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('startTime', models.TimeField()),
                ('endTime', models.TimeField()),
                ('totalTime', models.DecimalField(decimal_places=2, max_digits=5)),
                ('location', models.CharField(choices=[('Online', 'online'), ('In-Person', 'in-person'), ('---', '---')], default='---', max_length=15)),
                ('subject', models.CharField(max_length=50)),
                ('notes', models.TextField()),
                ('status', models.CharField(choices=[('Accepted', 'ACCEPTED'), ('Disputed', 'DISPUTED'), ('Resolved', 'RESOLVED'), ('Void', 'VOID')], default='Accepted', max_length=15)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='hours_as_parent', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='hours_as_student', to=settings.AUTH_USER_MODEL)),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='hours_as_tutor', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Invoice',
            fields=[
                ('invoice_id', models.AutoField(primary_key=True, serialize=False)),
                ('amount', models.DecimalField(decimal_places=2, max_digits=10)),
                ('due_date', models.DateField(default=django.utils.timezone.now)),
                ('status', models.CharField(choices=[('paid', 'Paid'), ('pending', 'Pending'), ('overdue', 'Overdue')], default='pending', max_length=10)),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invoices', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='MonthlyHours',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('email', models.CharField(default='None', max_length=70)),
                ('OnlineHours', models.DecimalField(decimal_places=2, max_digits=5)),
                ('InPersonHours', models.DecimalField(decimal_places=2, max_digits=5)),
                ('TotalBeforeTax', models.DecimalField(decimal_places=2, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='monthly_hours', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='Session',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('notes', models.TextField(blank=True, null=True)),
                ('status', models.CharField(choices=[('completed', 'Completed'), ('cancelled', 'Cancelled'), ('disputed', 'Disputed')], default='completed', max_length=10)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='student_sessions', to=settings.AUTH_USER_MODEL)),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tutor_sessions', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='TutoringRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('subject', models.CharField(max_length=100)),
                ('grade', models.CharField(choices=[('Kindergarten', 'Kindergarten'), ('1', '1'), ('2', '2'), ('3', '3'), ('4', '4'), ('5', '5'), ('6', '6'), ('7', '7'), ('8', '8'), ('9', '9'), ('10', '10'), ('11', '11'), ('12', '12'), ('College', 'College'), ('University', 'University')], default='Kindergarten', max_length=15)),
                ('service', models.CharField(choices=[('Online', 'online'), ('In-Person', 'in-person'), ('Both (Online & In-Person)', 'both (online & in-person)')], default='Online', max_length=30)),
                ('description', models.TextField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('is_accepted', models.CharField(choices=[('Accepted', 'Accepted'), ('Not Accepted', 'Not Accepted'), ('Renew', 'Renew')], default='Not Accepted', max_length=15)),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tutoring_requests_as_parent', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tutoring_requests_as_student', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='AcceptedTutor',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('accepted_at', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('Accepted', 'ACCEPTED'), ('Disputed', 'DISPUTED'), ('Resolved', 'RESOLVED'), ('Void', 'VOID')], default='Accepted', max_length=20)),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accepted_tutors_as_parent', to=settings.AUTH_USER_MODEL)),
                ('student', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accepted_tutors_as_student', to=settings.AUTH_USER_MODEL)),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accepted_tutors_as_tutor', to=settings.AUTH_USER_MODEL)),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='accepted_tutorsRequest', to='playground.tutoringrequest')),
            ],
        ),
        migrations.CreateModel(
            name='TutorResponse',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message', models.TextField()),
                ('rejected', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('request', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='playground.tutoringrequest')),
                ('tutor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='tutor_responses', to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name='WeeklyHours',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('email', models.CharField(default='None', max_length=70)),
                ('OnlineHours', models.DecimalField(decimal_places=2, max_digits=5)),
                ('InPersonHours', models.DecimalField(decimal_places=2, max_digits=5)),
                ('TotalBeforeTax', models.DecimalField(decimal_places=2, max_digits=5)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('parent', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='weekly_hours', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
