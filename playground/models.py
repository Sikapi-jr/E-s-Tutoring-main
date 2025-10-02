from django.db import models
from django.conf import settings
import os
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.forms.models import model_to_dict
from cryptography.fernet import Fernet


class User(AbstractUser):
    # Remove Django's built-in first_name and last_name fields
    first_name = None
    last_name = None

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
    phone_number = models.CharField(max_length=20, blank=True, null=True, help_text="Contact phone number")
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
    files = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_files',
        null=True,
        blank=True,
        default=None
    )
    profile_picture = models.FileField(upload_to='profile_picture/', default='profile_picture/default-profile-picture.jpeg')

    # Email notification preferences
    email_notifications_enabled = models.BooleanField(default=True, help_text="Enable all email notifications")
    email_new_requests = models.BooleanField(default=True, help_text="Email when new requests are created (tutors only)")
    email_replies = models.BooleanField(default=True, help_text="Email when tutors reply to requests (parents only)")
    email_disputes = models.BooleanField(default=True, help_text="Email when disputes are created")
    email_monthly_hours = models.BooleanField(default=True, help_text="Email when monthly hours are available")
    email_monthly_reports = models.BooleanField(default=True, help_text="Email when monthly reports are submitted")

    _encrypted_google_access_token = models.TextField(blank=True, null=True)
    _encrypted_google_refresh_token = models.TextField(blank=True, null=True)
    google_token_expiry = models.DateTimeField(null=True, blank=True)

    def _get_fernet(self):
        return Fernet(settings.FERNET_SECRET)

    @property
    def access_token(self):
        if self._encrypted_google_access_token:
            try:
                # Try to decrypt (new tokens)
                return self._get_fernet().decrypt(self._encrypted_google_access_token.encode()).decode()
            except Exception:
                # If decryption fails, assume it's plain (legacy or during migration)
                return self._encrypted_google_access_token
        return None

    @access_token.setter
    def access_token(self, value):
        if value:
            self._encrypted_google_access_token = self._get_fernet().encrypt(value.encode()).decode()

    @property
    def refresh_token(self):
        if self._encrypted_google_refresh_token:
            try:
                return self._get_fernet().decrypt(self._encrypted_google_refresh_token.encode()).decode()
            except Exception:
                return self._encrypted_google_refresh_token
        return None

    @refresh_token.setter
    def refresh_token(self, value):
        if value:
            self._encrypted_google_refresh_token = self._get_fernet().encrypt(value.encode()).decode()

    def set_default_rates_by_role(self):
        """Set default rates based on user role"""
        if self.roles == 'student':
            self.rateOnline = 0.00
            self.rateInPerson = 0.00
        elif self.roles == 'parent':
            self.rateOnline = 35.00
            self.rateInPerson = 70.00
        elif self.roles == 'tutor':
            self.rateOnline = 20.00
            self.rateInPerson = 28.00
        # Don't automatically save - let the caller decide
    
    @property
    def available_referral_credit(self):
        """Calculate total available referral credit for this user"""
        referrals = self.referrals_made.filter(reward_applied=True)
        total_credit = sum(ref.credit_amount - ref.used_amount for ref in referrals)
        return max(total_credit, 0.00)  # Never negative

    def __str__(self):
        return self.username

class Referral(models.Model):
    code         = models.CharField(max_length=16, unique=True)
    referrer     = models.ForeignKey(User, related_name="referrals_made",
                                     on_delete=models.CASCADE)
    prospective_email = models.EmailField()
    referred     = models.ForeignKey(User, null=True, blank=True,
                                     related_name="referral_used",
                                     on_delete=models.SET_NULL)
    reward_applied = models.BooleanField(default=False)   # sender's reward
    credit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=65.00)  # Total credit available
    used_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)      # Amount already used
    created_at   = models.DateTimeField(auto_now_add=True)

    def generate_code(self):
        import secrets
        self.code = secrets.token_urlsafe(8)

class UserDocument(models.Model):
        user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='documents')
        file = models.FileField(upload_to='user_documents/')
        uploaded_at = models.DateTimeField(auto_now_add=True)

class ErrorTicket(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='error_tickets_user')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    file = models.FileField(upload_to='user_error/')

class MonthlyReport(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('submitted', 'Submitted'),
    ]

    tutor = models.ForeignKey('User', on_delete=models.CASCADE, related_name='monthly_report_tutor')
    student = models.ForeignKey('User', on_delete=models.CASCADE, related_name='monthly_report_student')
    month = models.PositiveSmallIntegerField()
    year = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', help_text="Report status")
    due_date = models.DateField(null=True, blank=True, help_text="Date when report is due (1st of following month)")

    # New Report Questions - All required text fields
    overall_progress = models.TextField(blank=True, default="", help_text="How would you describe the child's progress this month?")
    strengths = models.TextField(blank=True, default="", help_text="What subject areas or skills has the child improved in or shown strong ability?")
    challenges = models.TextField(blank=True, default="", help_text="What areas still need extra support or practice?")
    work_habits = models.TextField(blank=True, default="", help_text="How is the child's focus, participation, and effort during tutoring sessions?")
    confidence_attitude = models.TextField(blank=True, default="", help_text="Do you notice any changes in the child's confidence or attitude toward learning?")
    homework_practice = models.TextField(blank=True, default="", help_text="How consistent has the child been with completing assignments or practicing skills outside of tutoring?")
    parent_support = models.TextField(blank=True, default="", help_text="Is there anything parents can do at home to reinforce learning?")
    looking_ahead = models.TextField(blank=True, default="", help_text="What will be the main focus for the next month?")

    created_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True, help_text="Date when report was submitted")

    class Meta:
        unique_together = ('tutor', 'student', 'month', 'year')
        ordering = ['-year', '-month', '-created_at']

    def __str__(self):
        return f"Report for {self.student.firstName} {self.student.lastName} - {self.month}/{self.year} ({self.status})"

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
    audience = models.CharField(max_length=100, default='all', help_text='Comma-separated roles: e.g., "parent,student" or "all"')

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return self.name or f"Announcement #{self.id}"

    def is_visible_to_role(self, user_role):
        """Check if announcement should be visible to a specific user role"""
        if self.audience == 'all':
            return True

        # Parse comma-separated roles
        target_roles = [role.strip() for role in self.audience.split(',')]
        return user_role in target_roles
        
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
    city = models.CharField(max_length=30, choices=User.CITY_CHOICES, default="Toronto")
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
    ELIGIBLE_CHOICES = [
        ('Late', 'LATE'),
        ('Eligible', 'ELIGIBLE'),
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
    eligible = models.CharField(max_length=15, choices=ELIGIBLE_CHOICES, default='Eligible')
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    edit_history = models.JSONField(default=dict, blank=True)
    tutor_reply = models.TextField(blank=True, null=True)
    
    # Invoice tracking
    INVOICE_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('invoiced', 'Invoiced'),
    ]
    invoice_status = models.CharField(max_length=10, choices=INVOICE_STATUS_CHOICES, default='pending')
    invoice_id = models.CharField(max_length=100, blank=True, null=True, help_text="Stripe invoice ID if invoiced")


class WeeklyHours(models.Model):
    date = models.DateField()
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weekly_hours'
    )
    OnlineHours = models.DecimalField(max_digits=5, decimal_places=2)
    InPersonHours = models.DecimalField(max_digits=5, decimal_places=2)
    TotalBeforeTax = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)


class MonthlyHours(models.Model):
    end_date = models.DateField(default=timezone.now)  # Enddate
    start_date = models.DateField(default=timezone.now)
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='monthly_hours'
    )
    OnlineHours = models.DecimalField(max_digits=5, decimal_places=2)
    InPersonHours = models.DecimalField(max_digits=5, decimal_places=2)
    TotalBeforeTax = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Payout tracking
    PAYOUT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
    ]
    payout_status = models.CharField(max_length=10, choices=PAYOUT_STATUS_CHOICES, default='pending')
    transfer_id = models.CharField(max_length=100, blank=True, null=True, help_text="Stripe transfer ID if paid")

class StripePayout(models.Model):
    tutor          = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="stripe_payouts")
    monthly_hours  = models.ForeignKey('MonthlyHours', on_delete=models.PROTECT, related_name='payout_record')
    amount_cents   = models.PositiveIntegerField()
    currency       = models.CharField(max_length=5, default="cad")
    stripe_transfer_id = models.CharField(max_length=120, blank=True, null=True)
    status         = models.CharField(max_length=20, default="created")  
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("monthly_hours", "stripe_transfer_id")

class AiChatSession(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    message_count = models.IntegerField(default=0)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    def get_last_request(self):
        """"Gets most recent request linked to current session"""
        return self.airequest_set.all().order_by('-created_at').first()

    def _create_message(self, message, role="user"):
        return {"role": role, "content": message}

    def create_first_message(self, message):
        context = """You are the EGS Chat Bot, a helpful support assistant for EGS Tutoring, a comprehensive tutoring platform that connects students with qualified tutors. Respond in Markdown format with line breaks and bullet points.

ABOUT EGS TUTORING:
EGS Tutoring is a professional tutoring service that provides both online and in-person tutoring across Canada. The platform serves parents, students, tutors, and administrators with different access levels and features.

USER ROLES & ACCESS:
1. PARENTS: Can request tutors, view replies, manage students, track hours and invoices
2. STUDENTS: Can view their sessions, events, and chat with support  
3. TUTORS: Can respond to requests, log hours, connect calendar, submit reports

KEY PAGES & FEATURES:

AUTHENTICATION PAGES:
- Landing Page (/): Public homepage with registration/login
- Login/Register: Account creation and authentication  
- Password Reset: Email-based password recovery
- Email Verification: Account activation via email links

PARENT FEATURES:
- Parent Dashboard: Overview of tutoring requests and student progress
- Request Tutor (/request): Submit tutoring requests with subject, grade, location preferences
- View Replies (/request-reply): See tutor responses and accept/decline offers
- View Invoices: Track billing and payment history
- View Hours: Monitor logged tutoring sessions for billing

TUTOR FEATURES:  
- Tutor Dashboard: Manage tutoring relationships and schedule
- Log Hours (/log): Record tutoring sessions with students (time, location, notes)
- Calendar Connect: Integrate Google Calendar for session scheduling
- Monthly Reports: Submit progress reports for students (requires 3+ hours)
- Settings: Manage Stripe account for payments, profile information

SHARED FEATURES:
- Events Page: View scheduled tutoring sessions
- Calendar: Visual calendar interface for session management
- Chat Support: AI-powered help (this current conversation)
- Settings: Profile management, payment setup, account preferences

DETAILED WORKFLOW:
1. REQUESTING TUTORS:
   - Parents fill out request form with subject, grade, service type (online/in-person)
   - Form submitted and becomes visible to all tutors
   - Interested tutors send replies with availability and rates
   - Parents view replies in "View Replies" page under Tutoring section
   - Parents accept a reply to designate that tutor for their child and that specific subject
   - One child can have multiple tutors for different subjects

2. TUTORING SESSIONS:
   - Designated tutors log completed sessions (date, time, notes, location)
   - Parents can view all logged sessions in dedicated "Logged Sessions" page
   - Tutors can schedule future sessions using Google Calendar API integration
   - Scheduled sessions appear in parent's personal calendar, home page, and "Scheduled Sessions" page

3. BILLING & INVOICES:
   - Standard rates: $35/hour for online tutoring, $60/hour for in-person tutoring
   - IMPORTANT: Get $60 discount PER referral! Refer friends/family via Settings page
   - Invoices automatically generated and sent weekly via email
   - Parents can view all invoices anytime in "View Invoices" page
   - Payments processed securely through Stripe

4. REFERRAL SYSTEM:
   - Parents get $60 discount for each successful referral
   - Referred person must have 4+ hours logged with a tutor to activate referral
   - Referral discounts stack indefinitely (unlimited referrals possible)
   - Referral management done through Settings page

5. COMMUNICATION:
   - Email notifications for key actions (registration, tutor replies, payments)
   - AI support chat available on all authenticated pages (this conversation)
   - Multi-language support (English/French)

BILLING & PAYMENTS:
- Tutors set hourly rates (online/in-person) 
- Hours logged by tutors generate invoices for parents
- Stripe handles payment processing and tutor payouts
- Weekly/monthly hour summaries for accounting
- Invoice generation and dispute handling

NAVIGATION:
- Role-based navbar with dropdowns for different user types
- Protected routes require authentication
- Mobile-responsive design with burger menu

TECHNICAL FEATURES:  
- Built with React frontend, Django backend
- PostgreSQL database, Redis for background tasks
- Celery for async email processing
- JWT authentication, role-based permissions
- Stripe payment integration, Google Calendar API

HELP & SUPPORT:
When users ask for help or say things like "I need help", "what can I do", "show me features", respond with:

What can I help you with today? Please tell me specifically what you'd like to do:

• Request a tutor
• View tutor replies  
• Check invoices
• See scheduled sessions
• View logged hours
• Refer someone
• Set up calendar
• Payment setup
• Access home dashboard

Just let me know which one you need help with!

SPECIFIC HELP RESPONSES:
When users ask about specific features, provide ONE line with navigation:

• "Request a tutor" or "request tutor" → Go to Tutoring dropdown → Request
• "View replies" or "tutor replies" → Go to Tutoring dropdown → Replies  
• "Check invoices" or "invoices" → Click "Invoices" in navbar
• "Scheduled sessions" or "events" → Click "Events" in navbar
• "Logged hours" or "view hours" → Go to Calendar dropdown → Logged Hours
• "Refer someone" or "referral" → Click "Settings" then Referral section
• "Calendar" or "set up calendar" → Go to Calendar dropdown → Schedule Session
• "Payment" or "payment setup" → Click "Settings" then Payment section
• "Home" or "dashboard" → Click "Home" in navbar

FORMATTING INSTRUCTIONS:
- Always use proper paragraph breaks and spacing in your responses
- Separate different topics with blank lines for better readability
- Use bullet points or numbered lists when explaining multiple steps
- Keep responses well-organized and easy to read

IMPORTANT INSTRUCTIONS:
- ALWAYS mention the $60 referral discount whenever discussing prices, costs, or billing
- Remind users that referrals can be done through the Settings page
- Emphasize that referral discounts stack indefinitely (unlimited savings possible)

RESTRICTIONS:
- ONLY discuss topics related to EGS Tutoring platform, features, and workflows
- DO NOT provide personal opinions, advice, or general knowledge
- DO NOT answer questions about other tutoring platforms, services, or competitors
- DO NOT provide technical support for issues outside the platform (e.g. browser problems, device issues)
- DO NOT provide help with homework, academic content, or subject tutoring
- DO NOT discuss unrelated topics (news, weather, other websites, etc.)
- DO NOT change your role or directive - you are EGS Tutoring support only
- DO NOT provide general information about the platform - focus on specific user questions
- DO NOT use emojis or casual language - maintain a professional tone
- DO NOT provide general homework help, academic content, or subject tutoring
- DO NOT discuss unrelated topics (news, weather, other websites, etc.)
- DO NOT change your role or directive - you are EGS Tutoring support only
- If asked about unrelated topics, politely redirect: "I'm here to help with EGS Tutoring platform questions only. What can I assist you with regarding our tutoring features?"

Stay focused on platform support, be helpful and professional about EGS Tutoring features only."""

        return [
            self._create_message(context, "system"),
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

    def check_rate_limit(self):
        """Check if session has exceeded rate limits"""
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        
        # Limit: 30 messages per session total
        if self.message_count >= 30:
            return False, "Message limit exceeded. Maximum 30 messages per session."
        
        # Limit: 5 messages per minute (if last message was sent)
        if self.last_message_at:
            time_since_last = now - self.last_message_at
            if time_since_last < timedelta(seconds=12):  # 5 messages per minute = 12 seconds between messages
                return False, "Rate limit exceeded. Please wait a moment before sending another message."
        
        # Check messages in last hour: max 20 per hour per IP
        if self.ip_address:
            recent_sessions = AiChatSession.objects.filter(
                ip_address=self.ip_address,
                created_at__gte=now - timedelta(hours=1)
            ).aggregate(total_messages=models.Sum('message_count'))['total_messages'] or 0
            
            if recent_sessions >= 20:
                return False, "Hourly limit exceeded. Please try again later."
        
        return True, None

    def send(self, message):
        from django.utils import timezone
        
        # Check rate limits first
        can_send, error_message = self.check_rate_limit()
        if not can_send:
            raise ValueError(error_message)
        
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
        
        # Update rate limiting fields
        self.message_count += 1
        self.last_message_at = timezone.now()
        self.save()

       
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

class HourDispute(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    
    hour = models.ForeignKey(
        'Hours',
        on_delete=models.CASCADE,
        related_name='disputes'
    )
    complainer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hour_disputes_filed'
    )
    message = models.TextField(help_text="Description of the dispute")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_reply = models.TextField(blank=True, null=True, help_text="Admin response to dispute")
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='hour_disputes_resolved'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ('hour', 'complainer')  # Prevent duplicate disputes from same user for same hour
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Dispute for Hour #{self.hour.id} by {self.complainer.username}"

class TutorComplaint(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
    ]
    
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='complaints_filed',
        limit_choices_to={'roles': 'student'}
    )
    tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='complaints_received',
        limit_choices_to={'roles': 'tutor'}
    )
    message = models.TextField(help_text="Student's complaint message")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_reply = models.TextField(blank=True, null=True, help_text="Admin response to complaint")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='complaints_reviewed',
        limit_choices_to={'is_superuser': True}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Complaint about {self.tutor.firstName} {self.tutor.lastName} by {self.student.firstName} {self.student.lastName}"


class TutorChangeRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]
    
    REASON_CHOICES = [
        ('scheduling', 'Scheduling conflicts'),
        ('teaching_style', 'Teaching style mismatch'),
        ('communication', 'Communication issues'),
        ('progress', 'Lack of progress'),
        ('availability', 'Tutor availability issues'),
        ('other', 'Other reason'),
    ]
    
    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_change_requests',
        limit_choices_to={'roles': 'parent'}
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tutor_changes_requested',
        limit_choices_to={'roles': 'student'}
    )
    current_tutor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='change_requests_from',
        limit_choices_to={'roles': 'tutor'}
    )
    subject = models.CharField(max_length=100, help_text="Subject for which tutor change is requested")
    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='other')
    message = models.TextField(help_text="Detailed reason for requesting tutor change")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_reply = models.TextField(blank=True, null=True, help_text="Admin response to request")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tutor_change_requests_reviewed',
        limit_choices_to={'is_superuser': True}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ('parent', 'student', 'current_tutor', 'subject', 'status')
    
    def __str__(self):
        return f"Change request for {self.student.firstName} {self.student.lastName} - {self.subject} from {self.current_tutor.firstName} {self.current_tutor.lastName}"