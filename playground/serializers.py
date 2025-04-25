from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from django.core.validators import validate_email
from django.core.exceptions import ValidationError  # Useful for validating form/models/serializer data
from .models import Note
from rest_framework import serializers
from .models import TutoringRequest  # Import the Request model from models.py
from .models import TutorResponse


User = get_user_model()  # Move this outside the class definition for better performance

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username", "password", "roles", "email", "parent"] 
        extra_kwargs = {
            "password": {"write_only": True},
            "email": {"required": True},
            "username": {"required": True}
        }
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already in use.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long")
        return value
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        try:
            validate_email(value)
        except ValidationError:
            raise serializers.ValidationError("Verify email format")
        return value
    
    def validate_parent(self, value):
        if value in [None, '']:
            return None
        elif not User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This Parent does not exist")
        return value

    def create(self, validated_data):
        parent_username = validated_data.pop('parent', None)
        parent_user = ''
        if not parent_username in [None, '']:
            try:
                parent_user = User.objects.get(username=parent_username)
            except User.DoesNotExist:
                raise serializers.ValidationError({"parent": "Parent user not found."})

        student_user = User.objects.create_user(**validated_data, parent=parent_user)
        return student_user


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "title", "content", "created_at", "author"]
        extra_kwargs = {"author": {"read_only": True}}


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
