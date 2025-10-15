from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError  # Useful for validating form/models/serializer data
from rest_framework import serializers
from .models import TutoringRequest  # Import the Request model from models.py
from .models import TutorResponse, AcceptedTutor, Hours, WeeklyHours, Announcements, UserDocument, ErrorTicket, MonthlyReport, Referral, HourDispute, TutorComplaint, TutorReferralRequest, Popup, PopupDismissal
from datetime import timedelta
from playground.models import AiChatSession


User = get_user_model()  # Move this outside the class definition for better performance

class UserRegistrationSerializer(serializers.ModelSerializer):
    """Secure serializer for user registration - only exposes safe fields"""
    parent = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    class Meta:
        model = User
        fields = [
            "username", "password",
            "firstName", "lastName", "address", "city",
            "roles", "email", "parent", "phone_number"
        ]
        extra_kwargs = {
            "password": {"write_only": True, "min_length": 8},
            "email": {"required": True},
            "username": {"required": True},
            "roles": {"required": False},
        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_parent(self, value):
        """Make sure the supplied username belongs to a *parent* account."""
        if value in ("", None):
            return ""
        qs = User.objects.filter(username=value, roles="parent")
        if not qs.exists():
            raise serializers.ValidationError("Parent user not found or not a parent.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        return value

    def validate(self, attrs):
        email = attrs.get("email")
        roles = attrs.get("roles", "parent")

        try:
            validate_email(email)
        except DjangoValidationError:
            raise serializers.ValidationError({"email": "Invalid e-mail format."})

        if roles in ("parent", "tutor") and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "E-mail already in use."})

        # For student: cross-check that the parent username's e-mail matches
        if roles == "student" and attrs.get("parent"):
            parent = User.objects.get(username=attrs["parent"])
            if parent.email != email:
                raise serializers.ValidationError(
                    {"parent": "Parent username and e-mail do not match."}
                )
        return attrs

    def create(self, validated):
        parent_username = validated.pop("parent", "")
        if parent_username:
            parent_instance = User.objects.get(username=parent_username)
            validated["parent"] = parent_instance
        else:
            validated["parent"] = None
        return User.objects.create_user(**validated)

class UserDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDocument
        fields = ['id','user', 'file', 'uploaded_at']

    def create(self, validated_data):
        return UserDocument.objects.create(**validated_data)
    
class UserSerializer(serializers.ModelSerializer):
    parent = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )

    parent_id = serializers.PrimaryKeyRelatedField(
        read_only=True, source="parent"
    )

    documents = UserDocumentSerializer(many=True, read_only=True)
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            "id", "username", "password",
            "firstName", "lastName", "address", "city",
            "roles", "email",
            "parent",          # write-only username
            "parent_id",       # read-only integer id
            "rateOnline", "rateInPerson",
            "stripe_account_id", "is_active", "is_superuser",
            "documents",
            "profile_picture",
            "tutor_referral_code",
        ]
        extra_kwargs = {
            "password": {"write_only": True, "min_length": 8},
            "email":    {"required": True},
            "username": {"required": True},
            "roles":    {"required": False},
        }


    def get_profile_picture(self, obj):
        if obj.profile_picture and hasattr(obj.profile_picture, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.profile_picture.url)
            # Fallback for when request context is not available
            from django.conf import settings
            base_url = getattr(settings, 'SITE_URL', 'http://localhost:8000')
            return base_url + obj.profile_picture.url
        return None
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_parent(self, value):
        """Make sure the supplied username belongs to a *parent* account."""
        if value in ("", None):
            return ""

        qs = User.objects.filter(username=value, roles="parent")
        if not qs.exists():
            raise serializers.ValidationError("Parent user not found or not a parent.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        return value

    # -----------------------------------------------------------
    # object-level validation (e-mail uniqueness rules)
    # -----------------------------------------------------------
    def validate(self, attrs):
        email  = attrs.get("email")
        roles  = attrs.get("roles", "parent")

        try:
            validate_email(email)
        except DjangoValidationError:
            raise serializers.ValidationError({"email": "Invalid e-mail format."})

        if roles in ("parent", "tutor") and User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "E-mail already in use."})

        # For student: cross-check that the parent username's e-mail matches
        if roles == "student" and attrs.get("parent"):
            parent = User.objects.get(username=attrs["parent"])
            if parent.email != email:
                raise serializers.ValidationError(
                    {"parent": "Parent username and e-mail do not match."}
                )

        return attrs

    # -----------------------------------------------------------
    # create
    # -----------------------------------------------------------
    def create(self, validated):
        parent_username = validated.pop("parent", "")      # string from JSON
        if parent_username:
            parent_instance = User.objects.get(username=parent_username)
            validated["parent"] = parent_instance          # FK instance
        else:
            validated["parent"] = None                     # NULL is fine

        return User.objects.create_user(**validated)
class ReferralSerializer(serializers.ModelSerializer):
    class Meta:
        model = Referral
        fields = ['id', 'referrer', 'referred', 'created_at', 'prospective_email', 'reward_applied']
        extra_kwargs = {
            "referrer": {"required": True},
            "referred": {"required": True},
            "reward_applied": {"required": False, "default": "False"},
        }

    def create(self, validated_data):
        return Referral.objects.create(**validated_data)
    
class ErrorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ErrorTicket
        fields = ['id', 'user', 'message', 'created_at', 'file']
        extra_kwargs = {
            "user": {"required": True},
            "message": {"required": True},
            "file": {"required": False},
        }

    def create(self, validated_data):
        return ErrorTicket.objects.create(**validated_data)
    
class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcements
        fields = '__all__'

class MonthlyReportSerializer(serializers.ModelSerializer):
    tutor_name = serializers.CharField(source='tutor.firstName', read_only=True)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = MonthlyReport
        fields = [
            'id', 'tutor', 'tutor_name', 'student', 'student_name', 'month', 'year',
            'status', 'due_date', 'submitted_at',
            'overall_progress', 'strengths', 'challenges', 'work_habits',
            'confidence_attitude', 'homework_practice', 'parent_support', 'looking_ahead',
            'created_at'
        ]
        extra_kwargs = {
            'tutor': {'required': True},
            'student': {'required': True},
            'month': {'required': True},
            'year': {'required': True},
            'overall_progress': {'required': True},
            'strengths': {'required': True},
            'challenges': {'required': True},
            'work_habits': {'required': True},
            'confidence_attitude': {'required': True},
            'homework_practice': {'required': True},
            'parent_support': {'required': True},
            'looking_ahead': {'required': True},
        }
    
    def get_student_name(self, obj):
        return f"{obj.student.firstName} {obj.student.lastName}"
    
    def validate(self, attrs):
        # Validate that tutor has taught this student for at least 3 hours in the given month
        tutor = attrs.get('tutor')
        student = attrs.get('student')
        month = attrs.get('month')
        year = attrs.get('year')
        
        if tutor and student and month and year:
            from datetime import datetime
            from django.db.models import Sum
            
            # Calculate total hours for this tutor-student pair in the given month
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date()
            else:
                end_date = datetime(year, month + 1, 1).date()
            
            total_hours = Hours.objects.filter(
                tutor=tutor,
                student=student,
                date__gte=start_date,
                date__lt=end_date,
                status='Accepted'
            ).aggregate(total=Sum('totalTime'))['total']
            
            if not total_hours or total_hours < 3:
                raise serializers.ValidationError({
                    'non_field_errors': ['Tutor must have at least 3 hours with this student in the specified month to submit a report.']
                })
        
        return attrs
    
class RequestSerializer(serializers.ModelSerializer):
    accepted_tutor_name = serializers.SerializerMethodField()
    accepted_tutor_message = serializers.SerializerMethodField()
    student_details = serializers.SerializerMethodField()
    parent_email = serializers.CharField(source='parent.email', read_only=True)
    parent_firstName = serializers.CharField(source='parent.firstName', read_only=True)
    parent_lastName = serializers.CharField(source='parent.lastName', read_only=True)
    parent_phone_number = serializers.CharField(source='parent.phone_number', read_only=True)
    student_firstName = serializers.CharField(source='student.firstName', read_only=True)
    student_lastName = serializers.CharField(source='student.lastName', read_only=True)

    def get_accepted_tutor_name(self, obj):
        """Get the name of the accepted tutor for this request"""
        try:
            accepted_tutor = AcceptedTutor.objects.get(request=obj)
            return f"{accepted_tutor.tutor.firstName} {accepted_tutor.tutor.lastName}"
        except AcceptedTutor.DoesNotExist:
            return None

    def get_accepted_tutor_message(self, obj):
        """Get the message from the accepted tutor"""
        try:
            accepted_tutor = AcceptedTutor.objects.get(request=obj)
            # Get the tutor's response for this request
            tutor_response = TutorResponse.objects.filter(
                request=obj,
                tutor=accepted_tutor.tutor,
                rejected=False
            ).first()
            return tutor_response.message if tutor_response else None
        except AcceptedTutor.DoesNotExist:
            return None

    def get_student_details(self, obj):
        """Get the student details with firstName and lastName"""
        if obj.student:
            return {
                'id': obj.student.id,
                'firstName': obj.student.firstName,
                'lastName': obj.student.lastName,
                'email': obj.student.email
            }
        return None

    class Meta:
        model = TutoringRequest
        fields = ['id', 'parent', 'student', 'student_details', 'subject', 'grade', 'service', 'city', 'description', 'is_accepted', 'created_at', 'accepted_tutor_name', 'accepted_tutor_message', 'parent_email', 'parent_firstName', 'parent_lastName', 'parent_phone_number', 'student_firstName', 'student_lastName']
        extra_kwargs = {
            "parent": {"required": True},
            "subject": {"required": True},
            "grade": {"required": True},
            "service": {"required": True},
        }

        def create(self, validated_data):
            return TutoringRequest.objects.create(**validated_data)
        
class RequestReplySerializer(serializers.ModelSerializer):
    # Client posts IDs; DRF resolves them to instances.
    request = serializers.PrimaryKeyRelatedField(queryset=TutoringRequest.objects.all())
    tutor = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    tutor_firstName = serializers.CharField(source='tutor.firstName', read_only=True)
    tutor_lastName = serializers.CharField(source='tutor.lastName', read_only=True)
    tutor_email = serializers.CharField(source='tutor.email', read_only=True)

    class Meta:
        model = TutorResponse
        fields = [
            "id",
            "request",
            "tutor",
            "tutor_firstName",
            "tutor_lastName",
            "tutor_email",
            "message",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")

    def validate_message(self, value):
        if not value:
            raise serializers.ValidationError("Message cannot be empty.")
        if len(value) > 500:
            raise serializers.ValidationError("Message cannot exceed 500 characters.")
        return value
    
    def create(self, validated_data):

        return TutorResponse.objects.create(**validated_data)


class AcceptedTutorSerializer(serializers.ModelSerializer):
    student_firstName = serializers.CharField(source='student.firstName', read_only=True)
    student_lastName = serializers.CharField(source='student.lastName', read_only=True)
    parent_email = serializers.CharField(source='parent.email', read_only=True)
    parent_firstName = serializers.CharField(source='parent.firstName', read_only=True)
    parent_lastName = serializers.CharField(source='parent.lastName', read_only=True)
    tutor_firstName = serializers.CharField(source='tutor.firstName', read_only=True)
    subject = serializers.CharField(source='request.subject', read_only=True)
    class Meta:
        model = AcceptedTutor
        fields = ['id', 'request','parent', 'parent_email', 'parent_firstName', 'parent_lastName', 'student', 'student_firstName', 'student_lastName', 'tutor', 'tutor_firstName', 'subject', 'accepted_at', 'status']
        extra_kwargs = {
            "request": {"required": True},
            "tutor": {"required": True},
            "student": {"required": True},
            "parent": {"required": True},
            "accepted_at": {"required": True},
            "status": {"required": False},
        }

        def create(self, validated_data):
            return AcceptedTutor.objects.create(**validated_data)
        
class HoursSerializer(serializers.ModelSerializer):
    student_firstName = serializers.CharField(source='student.firstName', read_only=True)
    student_lastName = serializers.CharField(source='student.lastName', read_only=True)
    student_username = serializers.CharField(source='student.username', read_only=True)
    tutor_firstName = serializers.CharField(source='tutor.firstName', read_only=True)
    tutor_lastName = serializers.CharField(source='tutor.lastName', read_only=True)
    parent_firstName = serializers.CharField(source='parent.firstName', read_only=True)
    parent_lastName = serializers.CharField(source='parent.lastName', read_only=True)
    has_disputes = serializers.SerializerMethodField()
    dispute_id = serializers.SerializerMethodField()
    
    class Meta:
        model = Hours
        fields = ['id', 'student','parent', 'tutor', 'date', 'startTime', 'endTime', 'totalTime', 'location', 'subject', 'notes', 'status', 'eligible', 'created_at', 'edited_at', 'edit_history', 'tutor_reply', 'student_firstName', 'student_lastName', 'student_username', 'tutor_firstName', 'tutor_lastName', 'parent_firstName', 'parent_lastName', 'has_disputes', 'dispute_id']
        extra_kwargs = {
            "student": {"required": True},
            "parent": {"required": False},
            "tutor": {"required": True},
            "date": {"required": True},
            "startTime": {"required": True},
            "endTime": {"required": True},
            "totalTime": {"required": True},
            "location": {"required": True},
            "subject": {"required": True},
            "notes": {"required": True},
        }
    
    def get_has_disputes(self, obj):
        return obj.disputes.filter(status='pending').exists()
    
    def get_dispute_id(self, obj):
        # Get the current user's pending dispute ID for this hour (if any)
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            pending_dispute = obj.disputes.filter(complainer=request.user, status='pending').first()
            return pending_dispute.id if pending_dispute else None
        return None

        def validate_totalTime(self, value):
            if value < timedelta(0):
                raise serializers.ValidationError("Total time cannot be negative.")
            if value > timedelta(hours=10):
                raise serializers.ValidationError("Total time cannot exceed 10 hours.")
            return value
    
        def create(self, validated_data):
            return Hours.objects.create(**validated_data)

class WeeklyCounterSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hours
        fields = ['id','parent','totalTime', 'location',]
        extra_kwargs = {
     
            "parent": {"required": False},
           
        }

        def create(self, validated_data):
            return WeeklyHours.objects.create(**validated_data)
        
class WeeklyHoursSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyHours
        fields = '__all__'

class AiChatSessionMessagesSerializer(serializers.Serializer):
    role = serializers.CharField()
    content = serializers.CharField()

class AiChatSessionSerializer(serializers.ModelSerializer): #Model Serializer, auto-generates serializer class based on model, fields, validation, methods included

    messages = AiChatSessionMessagesSerializer(many=True)

    def to_representation(self, instance):
        representation = super().to_representation(instance) #to_representation is native to DRF, method controling how model instance is turned into JSON when sending API responses
        representation['messages'] = [
            msg for msg in representation["messages"]   #List of messages only returns non system messages.
            if msg['role'] != 'system'
        ]
        return representation

    class Meta:
        model = AiChatSession
        fields = ['id', 'messages']
        read_only_fields=['messages'] #Dont want users to be able to write data from serializer

class HourDisputeSerializer(serializers.ModelSerializer):
    complainer_name = serializers.CharField(source='complainer.firstName', read_only=True)
    complainer_username = serializers.CharField(source='complainer.username', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.firstName', read_only=True)
    hour_details = serializers.SerializerMethodField()
    
    class Meta:
        model = HourDispute
        fields = [
            'id', 'hour', 'complainer', 'complainer_name', 'complainer_username',
            'message', 'status', 'admin_reply', 'resolved_by', 'resolved_by_name',
            'created_at', 'resolved_at', 'hour_details'
        ]
        extra_kwargs = {
            'complainer': {'read_only': True},
            'resolved_by': {'read_only': True},
            'resolved_at': {'read_only': True},
        }
    
    def get_hour_details(self, obj):
        hour = obj.hour
        return {
            'id': hour.id,
            'date': hour.date,
            'startTime': hour.startTime,
            'endTime': hour.endTime,
            'totalTime': hour.totalTime,
            'location': hour.location,
            'subject': hour.subject,
            'student_name': f"{hour.student.firstName} {hour.student.lastName}",
            'tutor_name': f"{hour.tutor.firstName} {hour.tutor.lastName}",
        }

class TutorComplaintSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.firstName', read_only=True)
    student_lastname = serializers.CharField(source='student.lastName', read_only=True)
    tutor_name = serializers.CharField(source='tutor.firstName', read_only=True)
    tutor_lastname = serializers.CharField(source='tutor.lastName', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.firstName', read_only=True)

    class Meta:
        model = TutorComplaint
        fields = [
            'id', 'student', 'tutor', 'student_name', 'student_lastname',
            'tutor_name', 'tutor_lastname', 'message', 'status', 'admin_reply',
            'reviewed_by', 'reviewed_by_name', 'created_at', 'reviewed_at'
        ]
        extra_kwargs = {
            'student': {'read_only': True},
            'reviewed_by': {'read_only': True},
            'reviewed_at': {'read_only': True},
        }


class TutorReferralRequestSerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source='parent.firstName', read_only=True)
    parent_lastname = serializers.CharField(source='parent.lastName', read_only=True)
    parent_email = serializers.CharField(source='parent.email', read_only=True)
    student_name = serializers.CharField(source='student.firstName', read_only=True)
    student_lastname = serializers.CharField(source='student.lastName', read_only=True)
    tutor_name = serializers.CharField(source='tutor.firstName', read_only=True)
    tutor_lastname = serializers.CharField(source='tutor.lastName', read_only=True)

    class Meta:
        model = TutorReferralRequest
        fields = [
            'id', 'parent', 'parent_name', 'parent_lastname', 'parent_email',
            'student', 'student_name', 'student_lastname',
            'tutor', 'tutor_name', 'tutor_lastname',
            'subject', 'grade', 'service', 'city', 'description',
            'referral_code_used', 'status', 'token', 'tutoring_request',
            'created_at', 'responded_at'
        ]
        extra_kwargs = {
            'token': {'read_only': True},
            'tutoring_request': {'read_only': True},
            'responded_at': {'read_only': True},
        }


class PopupSerializer(serializers.ModelSerializer):
    """Serializer for Popup model"""
    class Meta:
        model = Popup
        fields = '__all__'


class PopupDismissalSerializer(serializers.ModelSerializer):
    """Serializer for PopupDismissal model"""
    class Meta:
        model = PopupDismissal
        fields = ['id', 'popup', 'user', 'dismissed_at']
        extra_kwargs = {
            'user': {'read_only': True},
            'dismissed_at': {'read_only': True},
        }