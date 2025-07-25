from django.db import models
from django.conf import settings
import os
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.forms.models import model_to_dict
from cryptography.fernet import Fernet

print("LOADING MODELS.PY...")


class User(AbstractUser):
    CITY_CHOICES = [
        ('Ajax', 'Ajax'),
        ('Aurora', 'Aurora'),
        ('Barrie', 'Barrie'),
        ('Belleville', 'Belleville'),
        ('Brampton', 'Brampton'),
        ('Brantford', 'Brantford'),
        ('Burlington', 'Burlington'),
        ('Cambridge', 'Cambridge'),
        ('Chatham-Kent', 'Chatham-Kent'),
        ('Clarington', 'Clarington'),
        ('Collingwood', 'Collingwood'),
        ('Cornwall', 'Cornwall'),
        ('Dryden', 'Dryden'),
        ('Georgina', 'Georgina'),
        ('Grimsby', 'Grimsby'),
        ('Guelph', 'Guelph'),
        ('Hamilton', 'Hamilton'),
        ('Huntsville', 'Huntsville'),
        ('Innisfil', 'Innisfil'),
        ('Kawartha Lakes', 'Kawartha Lakes'),
        ('Kenora', 'Kenora'),
        ('Kingston', 'Kingston'),
        ('Kitchener', 'Kitchener'),
        ('Leamington', 'Leamington'),
        ('London', 'London'),
        ('Markham', 'Markham'),
        ('Midland', 'Midland'),
        ('Milton', 'Milton'),
        ('Mississauga', 'Mississauga'),
        ('Newmarket', 'Newmarket'),
        ('Niagara Falls', 'Niagara Falls'),
        ('Niagara-on-the-Lake', 'Niagara-on-the-Lake'),
        ('North Bay', 'North Bay'),
        ('Oakville', 'Oakville'),
        ('Orangeville', 'Orangeville'),
        ('Orillia', 'Orillia'),
        ('Oshawa', 'Oshawa'),
        ('Ottawa', 'Ottawa'),
        ('Peterborough', 'Peterborough'),
        ('Pickering', 'Pickering'),
        ('Quinte West', 'Quinte West'),
        ('Richmond Hill', 'Richmond Hill'),
        ('Sarnia', 'Sarnia'),
        ('St. Catharines', 'St. Catharines'),
        ('St. Thomas', 'St. Thomas'),
        ('Stratford', 'Stratford'),
        ('Sudbury', 'Sudbury'),
        ('Tecumseh', 'Tecumseh'),
        ('Thunder Bay', 'Thunder Bay'),
        ('Timmins', 'Timmins'),
        ('Toronto', 'Toronto'),
        ('Vaughan', 'Vaughan'),
        ('Wasaga Beach', 'Wasaga Beach'),
        ('Waterloo', 'Waterloo'),
        ('Welland', 'Welland'),
        ('Whitby', 'Whitby'),
        ('Windsor', 'Windsor'),
        ('Woodstock', 'Woodstock'),
    ]

    # Additional custom fields
    firstName = models.CharField(max_length=50, default="None", null=False, blank=True)
    lastName = models.CharField(max_length=50, default="None", null=False, blank=True)
    address = models.CharField(max_length=60, default="Unknown", null=False, blank=True)
    city = models.CharField(max_length=20, choices=CITY_CHOICES, default="None", blank=True)
    roles = models.CharField(max_length=20, default='parent', blank=True)
    email = models.EmailField(unique=False, blank=True, null=True)
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )
    rateOnline = models.DecimalField(max_digits=10, decimal_places=2, default=35.00, blank=False, null=False)
    rateInPerson = models.DecimalField(max_digits=10, decimal_places=2, default=60.00, blank=False, null=False)
    stripe_account_id = models.CharField(max_length=100, blank=True, null=True)
    last_login = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    _encrypted_google_access_token = models.TextField(blank=True, null=True)
    _encrypted_google_refresh_token = models.TextField(blank=True, null=True)

    def _get_fernet(self):
        return Fernet(settings.FERNET_SECRET)

    @property
    def access_token(self):
        if self._encrypted_access_token:
            return self._get_fernet().decrypt(self._encrypted_access_token.encode()).decode()
        return None

    @access_token.setter
    def access_token(self, value):
        if value:
            self._encrypted_access_token = self._get_fernet().encrypt(value.encode()).decode()

    @property
    def refresh_token(self):
        if self._encrypted_refresh_token:
            return self._get_fernet().decrypt(self._encrypted_refresh_token.encode()).decode()
        return None

    @refresh_token.setter
    def refresh_token(self, value):
        if value:
            self._encrypted_refresh_token = self._get_fernet().encrypt(value.encode()).decode()

    def __str__(self):
        return self.id


class Announcements(models.Model):
    name = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)

    address = models.CharField(max_length=255, blank=True)
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)

    image = models.ImageField(upload_to='announcements/', blank=True, null=True)
    link = models.URLField(blank=True)

    audience_choices = [
        ('all', 'Everyone'),
        ('parent', 'Parents'),
        ('student', 'Students'),
        ('tutor', 'Tutors'),
    ]
    audience = models.CharField(max_length=20, choices=audience_choices, default='all')

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return self.name or f"Announcement #{self.id}"
        
class Session(models.Model):
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('disputed', 'Disputed'),
    ]
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_sessions'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_sessions'
    )
    date = models.DateField(default=timezone.now)
    start_time = models.TimeField()
    end_time = models.TimeField()
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='completed')

    def __str__(self):
        return f"Session on {self.date} between {self.tutor} and {self.student}"


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('pending', 'Pending'),
        ('overdue', 'Overdue'),
    ]
    invoice_id = models.AutoField(primary_key=True)
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    due_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')

    def __str__(self):
        return f"Invoice {self.invoice_id} - {self.status}"
    
class TutoringRequest(models.Model):
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutoring_requests_as_parent'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutoring_requests_as_student'
    )
    GRADE_CHOICES = [
        ('Kindergarten', 'Kindergarten'),
        ('1', '1'),
        ('2', '2'),
        ('3', '3'),
        ('4', '4'),
        ('5', '5'),
        ('6', '6'),
        ('7', '7'),
        ('8', '8'),
        ('9', '9'),
        ('10', '10'),
        ('11', '11'),
        ('12', '12'),
        ('College', 'College'),
        ('University', 'University'),
    ]

    SERVICE_CHOICES = [
        ('Online', 'online'),
        ('In-Person', 'in-person'),
        ('Both (Online & In-Person)', 'both (online & in-person)'),
    ]

    ACCEPTED_CHOICES = [
        ("Accepted", "Accepted"),
        ("Not Accepted", "Not Accepted"),
        ("Renew", "Renew"),
    ]
    subject = models.CharField(max_length=100)
    grade = models.CharField(max_length=15, choices=GRADE_CHOICES, default='Kindergarten')
    service = models.CharField(max_length=30, choices=SERVICE_CHOICES, default='Online')
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_accepted = models.CharField(max_length=15, choices=ACCEPTED_CHOICES, default='Not Accepted')


class TutorResponse(models.Model):
    request = models.ForeignKey(TutoringRequest, on_delete=models.CASCADE)
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_responses'
    )
    message = models.TextField()
    rejected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Response by {self.tutor.username} to {self.request.subject}"


class AcceptedTutor(models.Model):
    STATUS_CHOICES = [
        ('Accepted', 'ACCEPTED'),
        ('Disputed', 'DISPUTED'),
        ('Resolved', 'RESOLVED'),
        ('Void', 'VOID'),
    ]
    request = models.ForeignKey(
        TutoringRequest,
        on_delete=models.CASCADE,
        related_name="accepted_tutorsRequest"  # Used to access the relation from the other side
    )
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='accepted_tutors_as_parent'
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='accepted_tutors_as_student'
    )
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='accepted_tutors_as_tutor'
    )

    @property
    def student_user(self):
        return self.student.username 
    
    accepted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Accepted')


class Hours(models.Model):
    LOCATION_CHOICES = [
        ('Online', 'online'),
        ('In-Person', 'in-person'),
        ('---', '---'),
    ]

    STATUS_CHOICES = [
        ('Accepted', 'ACCEPTED'),
        ('Disputed', 'DISPUTED'),
        ('Resolved', 'RESOLVED'),
        ('Void', 'VOID'),
    ]

    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hours_as_student'
    )
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hours_as_parent'
    )
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hours_as_tutor'
    )
    date = models.DateField()
    startTime = models.TimeField()
    endTime = models.TimeField()
    totalTime = models.DecimalField(max_digits=5, decimal_places=2)
    location = models.CharField(max_length=15, choices=LOCATION_CHOICES, default='---')
    subject = models.CharField(max_length=50)
    notes = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='Accepted')
    created_at = models.DateTimeField(auto_now_add=True)


class WeeklyHours(models.Model):
    date = models.DateField()
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weekly_hours'
    )
    email = models.CharField(max_length=70, default='None')
    OnlineHours = models.DecimalField(max_digits=5, decimal_places=2)
    InPersonHours = models.DecimalField(max_digits=5, decimal_places=2)
    TotalBeforeTax = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)


class MonthlyHours(models.Model):
    date = models.DateField()  # Enddate
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='monthly_hours'
    )
    email = models.CharField(max_length=70, default='None')
    OnlineHours = models.DecimalField(max_digits=5, decimal_places=2)
    InPersonHours = models.DecimalField(max_digits=5, decimal_places=2)
    TotalBeforeTax = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)


class AiChatSession(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_last_request(self):
        """"Gets most recent request linked to current session"""
        return self.airequest_set.all().order_by('-created_at').first()

    def _create_message(self, message, role="user"):
        return {"role": role, "content": message}

    def create_first_message(self, message):
        return [
            self._create_message(
                "You are a support bot for EGS Tutoring", "system"
            ),
            self._create_message(message, "user")
        ]

    def messages(self):
        all_messages = []
        request = self.get_last_request()  # Get last request made for this session

        if request:
            all_messages.extend(request.messages)  # extend adds items of the list into the list, append adds a nested list
            try:
                all_messages.append(request.response["choices"][0]["message"])  # API returns a list of choices, pick first
            except (KeyError, TypeError, IndexError):
                pass
        return all_messages

    def send(self, message):
        last_request = self.get_last_request()  # Fetching last request.

        if not last_request:
            AiRequest.objects.create(
                session=self, messages=self.create_first_message(message)
            )
        elif last_request.status in [AiRequest.COMPLETE, AiRequest.FAILED]:
            AiRequest.objects.create(
                session=self,
                messages=self.messages() + [  # existing messages + new message
                    self._create_message(message, "user")
                ]
            )
        else:
            return

       
class AiRequest(models.Model):
    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETE = 'complete'
    FAILED = 'failed'
    STATUS_OPTIONS = (
        (PENDING, 'Pending'),
        (RUNNING, 'Running'),
        (COMPLETE, 'Complete'),
        (FAILED, 'Failed'),
    )

    status = models.CharField(max_length=50, choices=STATUS_OPTIONS, default=PENDING)
    session = models.ForeignKey(
        'AiChatSession',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    messages = models.JSONField()
    response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def _queue_job(self):
        from playground.tasks import handle_ai_request_job
        print("Queueing Job Sikapi...")
        handle_ai_request_job.delay(self.id)

    def handle(self):
        from openai import OpenAI
        print("Starting handle...")

        if self.status in [self.RUNNING, self.COMPLETE, self.FAILED]:
            print("Already handled or in progress.")
            return
        
        self.status = self.RUNNING
        self.save(update_fields=["status"])

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Create instance of OpenAI client

        try:
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=self.messages
            )
            self.response = completion.model_dump()  # Store response dict
            self.status = self.COMPLETE
            print("HANDLE DONE")
        except Exception as e:
            print(f"HANDLE FAILED: {e}")
            self.status = self.FAILED

        self.save(update_fields=["response", "status"])

class AiRequest(models.Model):

    PENDING = 'pending'
    RUNNING = 'running'
    COMPLETE = 'complete'
    FAILED = 'failed'
    STATUS_OPTIONS = (
        (PENDING, 'Pending'),
        (RUNNING, 'Running'),
        (COMPLETE, 'Complete'),
        (FAILED, 'Failed'),
    )

    status = models.CharField(max_length=50, choices=STATUS_OPTIONS, default=PENDING)
    session = models.ForeignKey(
        'AiChatSession',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    messages = models.JSONField()
    response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def _queue_job(self):
        from playground.tasks import handle_ai_request_job
        print("Queueing Job Sikapi...")
        handle_ai_request_job.delay(self.id)

    def handle(self):
        from openai import OpenAI
        print("Starting handle...")

        if self.status in [self.RUNNING, self.COMPLETE, self.FAILED]:
            print("Already handled or in progress.")
            return
        
        self.status = self.RUNNING
        self.save(update_fields=["status"])

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))  # Create instance of OpenAI client

        try:
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=self.messages
            )
            self.response = completion.model_dump()  # Store response dict
            self.status = self.COMPLETE
            print("HANDLE DONE")
        except Exception as e:
            print(f"HANDLE FAILED: {e}")
            self.status = self.FAILED

        self.save(update_fields=["response", "status"])