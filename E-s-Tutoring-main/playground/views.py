from django.shortcuts import render
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model  # Correct way to import the user model
from rest_framework import generics
from .serializers import UserSerializer, NoteSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Note
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import TutoringRequest, TutorResponse, AcceptedTutor
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import RequestSerializer
from .serializers import RequestReplySerializer  # Assuming you have a serializer for the Request model
from rest_framework.decorators import api_view, permission_classes




# Use get_user_model() to reference the active user model.
User = get_user_model()

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):

    print("Request User:", request.user)  # Should print the username of the authenticated user
    print("User Data:", request.user.email)
    print("Is Authenticated:", request.user.is_authenticated)  # Should be True for authenticated users
    print("Auth Token:", request.auth)  # Should show the JWT token


    if request.user:
        user_data = {
            "username": request.user.username,
            "email": request.user.email,
            "roles": request.user.roles,
            "parent": request.user.parent,
            # Add any other user fields you want to include
        }
        print(request.user) 
        return Response(user_data)
    return Response({"error": "User is not authenticated"}, status=401)

class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Use the custom user model
        user = self.request.user
        return Note.objects.filter(author=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)

class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)

class CreateUserView(generics.CreateAPIView):
    # Use the custom user model's manager for queryset
    queryset = User.objects.all() #User Model
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

class RequestListCreateView(generics.ListCreateAPIView): #ListCreateAPIView can handle both GET and POST
    # Use the custom user model's manager for queryset
    queryset = TutoringRequest.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [AllowAny]
    null=True,
    blank=True

    def perform_create(self, serializer):
        serializer.save()
       

def accept_tutor(request, response_id):
    if request.method == "POST":
        response = get_object_or_404(TutorResponse, id=response_id)
        accepted_tutor = AcceptedTutor.objects.create(
            request=response.request,
            tutor=response.tutor
        )
        return JsonResponse({"message": "Tutor accepted successfully", "accepted_tutor_id": accepted_tutor.id})


class RequestResponseCreateView(generics.ListCreateAPIView):
    serializer_class = RequestReplySerializer
    #permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]
    def perform_create(self, serializer):
        serializer.save()
    
class StudentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Get the parent's username from query parameters
        parent_username = request.query_params.get('parent', None)
        if not parent_username:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        # Filter users with role 'student' whose parent's username matches the given username.
        # Adjust field names as needed based on your User model.
        students = User.objects.filter(roles='student', parent=parent_username)
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)
    
class RequestListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, requests):
        requests = TutoringRequest.objects.all()  # Fetch requests from the database
        serializer = RequestSerializer(requests, many=True)
        return Response(serializer.data)

