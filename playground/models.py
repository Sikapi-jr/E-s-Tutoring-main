from django.conf import settings
import os
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from openai import OpenAI
from playground.tasks import handle_ai_request_job
from django.forms.models import model_to_dict


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
    email = models.EmailField(unique=True, blank=True, null=True)
    parent = models.CharField(max_length=100, default=None, blank=True, null=True)
    rateOnline = models.DecimalField(max_digits=10, decimal_places=2, default=35.00 ,blank=False, null=False)
    rateInPerson = models.DecimalField(max_digits=10, decimal_places=2, default = 60.00, blank=False, null=False)
    last_login = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)


    def __str__(self):
        return self.username


class Note(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notes"
    )

    def __str__(self):
        return self.title


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


class Dispute(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('resolved', 'Resolved'),
    ]
    dispute_id = models.AutoField(primary_key=True)
    session = models.ForeignKey(
        'Session',
        on_delete=models.CASCADE,
        related_name='disputes'
    )
    raised_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='raised_disputes'
    )
    reason = models.TextField()
    resolution_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')

    def __str__(self):
        return f"Dispute {self.dispute_id} - {self.resolution_status}"


class Message(models.Model):
    message_id = models.AutoField(primary_key=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_messages'
    )
    content = models.TextField()
    sent_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Message from {self.sender} to {self.receiver} at {self.sent_at}"


class Performance(models.Model):
    tutor = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='performance',
        limit_choices_to={'roles': 'tutor'}
    )
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)
    disputes_resolved = models.IntegerField(default=0)
    client_feedback = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"Performance for {self.tutor}"


class Announcement(models.Model):
    announcement_id = models.AutoField(primary_key=True)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='announcements',
        limit_choices_to={'roles': 'manager'}
    )
    content = models.TextField()
    target_roles = models.CharField(max_length=10, choices=[
        ('all', 'All'),
        ('tutors', 'Tutors'),
        ('parents', 'Parents'),
        ('students', 'Students'),
    ])
    sent_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return f"Announcement {self.announcement_id} - {self.target_roles}"


class TutoringRequest(models.Model):
    parent = models.CharField(max_length=50)
    student = models.CharField(max_length=50)
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

    ACCEPTED_CHOICES = [("Accepted", "Accepted"), 
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
    tutor = models.CharField(max_length=50)
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
        related_name="accepted_tutorsRequest" #Used to access the relation from the other side of the relationship
    )
    parent = models.CharField(max_length=50, default="ERROR")
    student = models.CharField(max_length=50, default="ERROR")
    tutor = models.CharField(max_length=50, default="ERROR")
    accepted_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACCEPTED')

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
    
    student = models.CharField(max_length=50)
    parent = models.CharField(max_length=50)
    tutor = models.CharField(max_length=50)
    date = models.DateField()
    startTime = models.TimeField()
    endTime = models.TimeField()
    totalTime = models.DecimalField(max_digits=5, decimal_places=2)
    location = models.CharField(max_length=15, choices=LOCATION_CHOICES, default='---')
    subject = models.CharField(max_length=50)
    notes = models.TextField()
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='ACCPETED')
    created_at = models.DateTimeField(auto_now_add=True)

class WeeklyHours(models.Model):
    date = models.DateField()
    parent = models.CharField(max_length=50)
    email = models.CharField(max_length=70, default='None')
    OnlineHours = models.DecimalField(max_digits=5, decimal_places=2)
    InPersonHours = models.DecimalField(max_digits=5, decimal_places=2)
    TotalBeforeTax = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

class MonthlyHours(models.Model):
    date = models.DateField() #Enddate
    tutor = models.CharField(max_length=50)
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
        return{"role":role, "content":message}
    
    def create_first_message(self, message):
        return [
            self._create_message(
                "You are a support bot for EGS Tutoring", "system"
            ),
            self._create_message(message, "user")]
    
    def messages(self):
        all_messages=[]
        request = self.get_last_request() #Get last request made for this session

        if request:
            all_messages.extend(request.messages) #exend adds items of the list into the list, while append adds the whole list as a nested list
            try:
                all_messages.append(request.response["choices"][0]["message"]) #API returns a list of choices, we pick the first one
            except (KeyError, TypeError, IndexError):
                pass
        return all_messages
    
    def send(self, message):
        last_request=self.get_last_request() #Fetching last request. Want to determine is this first message or are there existing messages? (Different logic)

        if not last_request: #If no last request, assume this is first request and create a new request
            AiRequest.objects.create(
                session=self, messages=self.create_first_message(message) 
            )
        elif last_request.status in [AiRequest.COMPLETE, AiRequest.FAILED]: #Make sure last request isnt pending/running
            AiRequest.objects.create(
                session=self,
                messages=self.messages() + [ #Pass in existing messages + new message to be sent
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
        AiChatSession,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )
    messages = models.JSONField()
    response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def _queue_job(self):
        print("Qeueing Job Sikapi...")
        handle_ai_request_job.delay(self.id)

    def handle(self):
        print("Starting handle...")

        if self.status in [self.RUNNING, self.COMPLETE, self.FAILED]:
            print("Already handled or in progress.")
            return
        
        self.status=self.RUNNING
        self.save(update_fields=["status"])
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY")) #Create instance of openAi client
        try: #Code to create a new request
            completion = client.chat.completions.create(
                model = "gpt-4o-mini",
                messages=self.messages
            )
            self.response = completion.model_dump() #When we get a response its stored into a dictionary, allowing the contents to be extracted
            self.status=self.COMPLETE #Update status of this request to complete
            print("HANDLE DONE")
        except Exception:
            print("HANDLE FAILED")
            self.status = self.FAILED

        self.save(update_fields=["response", "status"])

    
    #def save(self, **kwargs):
        #print("Starting Save...")
        #is_new = self.pk is None #tells us if the request is a new model
        #super().save(**kwargs) #Save is always ran whenever an object is created/updated. Super().save calls the original save method
        #if is_new:
            #print("Starting New...")
            #self._queue_job() #WIth this logic, new requests are always saved, but jobs ar eonly queued if they are new
