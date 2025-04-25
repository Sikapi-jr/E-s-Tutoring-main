from django.conf import settings
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    # Additional custom fields
    roles = models.CharField(max_length=100, default='parent')
    email = models.EmailField(unique=True, blank=True, null=True)
    ##parent = models.ForeignKey(
        ##'self',
        ##on_delete=models.SET_NULL,
        ##null=True,
        ##blank=True,
        ##related_name='children',
        ##default=None
    ##)
    parent = models.CharField(max_length=100, default=None, blank=True, null=True)

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

    def __str__(self):
        return f"{self.parent.username} - {self.subject}"


class TutorResponse(models.Model):
    request = models.CharField(max_length=50)
    tutor = models.CharField(max_length=50)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Response by {self.tutor.username} to {self.request.subject}"


class AcceptedTutor(models.Model):
    request = models.ForeignKey(
        TutoringRequest,
        on_delete=models.CASCADE,
        related_name="accepted_tutors"
    )
    tutor = models.CharField(max_length=50)
    accepted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tutor.username} accepted for {self.request.subject}"
