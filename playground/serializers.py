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
from .models import TutorResponse, AcceptedTutor, Hours, WeeklyHours, Announcements
from datetime import timedelta
from playground.models import AiChatSession


User = get_user_model()  # Move this outside the class definition for better performance

class UserSerializer(serializers.ModelSerializer):
    parent = serializers.CharField(required=False, allow_blank=True) #Temporarily turn parent into a string for username checking.

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "password",
            "firstName",
            "lastName",
            "address",
            "city",
            "roles",
            "email",
            "parent",
            "rateOnline",
            "rateInPerson",
            "stripe_account_id",
            "is_active",
            "is_superuser",
        ]
        extra_kwargs = {
            "id": {"read_only": True},
            "password": {"write_only": True, "required": True},
            "email": {"required": True},
            "username": {"required": True},
            "firstName": {"required": False, "allow_blank": True},
            "lastName": {"required": False, "allow_blank": True},
            "address": {"required": False, "allow_blank": True},
            "city": {"required": False, "allow_blank": True},
            "roles": {"required": False, "allow_blank": True},
            "parent": {"required": False, "allow_null": True},
            "rateOnline": {"required": False},
            "rateInPerson": {"required": False},
        }
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        return value
    
    def validate(self, attrs):
        value = attrs.get('email')
        role = attrs.get('roles')
        parent_user = attrs.get('parent')

        # Validate email format first
        try:
            validate_email(value)
        except DjangoValidationError:
            raise serializers.ValidationError("Verify email format")

        # Parent and tutor must have unique email
        if role in ['parent', 'tutor']:
            if User.objects.filter(email=value).exists():
                raise serializers.ValidationError("This email is already in use.")

        # Student must validate parent username and email combo
        if role == 'student':
            try:
                parent_obj_by_username = User.objects.get(username=parent_user)
                parent_obj_by_email = User.objects.filter(email=value).first()
            except User.DoesNotExist:
                raise serializers.ValidationError("Invalid parent username or email")

            if parent_obj_by_username.email != value or parent_obj_by_email.username != parent_user:
                raise serializers.ValidationError("Parent email and parent username do not match")

        return attrs
    
    def validate_parent(self, value):
        if value in [None, '']:
            return None

        try:
            if not User.objects.filter(username=value).exists():
                raise serializers.ValidationError("This Parent does not exist")

            parent_data = User.objects.filter(username=value).values('roles').first()
            if not parent_data:
                raise serializers.ValidationError("Unable to retrieve parent information")

            parent_role = parent_data.get('roles')
            if parent_role != 'parent':
                raise serializers.ValidationError("Invalid Username: Must be a parent")

        except Exception as e:
            raise serializers.ValidationError(f"Error validating parent: {str(e)}")

        return value


    def create(self, validated_data):
        parent_username = validated_data.pop('parent', None)
        parent_user = None
        if not parent_username in [None, '']:
            try:
                parent_user = User.objects.get(username=parent_username)
            except User.DoesNotExist:
                raise serializers.ValidationError({"parent": "Parent user not found."})
        validated_data['parent'] = parent_user
        student_user = User.objects.create_user(**validated_data)
        return student_user


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcements
        fields = '__all__'

class RequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = TutoringRequest
        fields = ['id', 'parent', 'student', 'subject', 'grade', 'service', 'description', 'is_accepted', 'created_at']
        extra_kwargs = {
            "parent": {"required": True},
            "subject": {"required": True},
            "grade": {"required": True},
            "service": {"required": True},
        }

        def create(self, validated_data):
            return TutoringRequest.objects.create(**validated_data)

class RequestReplySerializer(serializers.ModelSerializer):
    class Meta:
        model = TutorResponse
        fields = ['id', 'request', 'tutor', 'message', 'created_at']
        extra_kwargs = {
            "request": {"required": True},
            "tutor": {"required": True},
            "message": {"required": True},
            "created_at": {"required": True},
        }

        def create(self, validated_data):
            return TutorResponse.objects.create(**validated_data)

class AcceptedTutorSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source='student.username', read_only=True)
    class Meta:
        model = AcceptedTutor
        fields = ['id', 'request','parent', 'student', 'student_username', 'tutor', 'accepted_at', 'status']
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
    class Meta:
        model = Hours
        fields = ['id', 'student','parent', 'tutor', 'date', 'startTime', 'endTime', 'totalTime', 'location', 'subject', 'notes', 'created_at']
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