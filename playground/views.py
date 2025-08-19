from zoneinfo import ZoneInfo

from django.dispatch import receiver
from .models import UserDocument
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models.signals import post_save
from django.shortcuts import render
from django.db.models import Exists, OuterRef, Q
import requests, os
from django.db import transaction
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model  # Correct way to import the user model
from rest_framework import generics, status
from .serializers import UserSerializer, UserRegistrationSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from decimal import Decimal, InvalidOperation
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseRedirect
from .models import TutoringRequest, TutorResponse, AcceptedTutor, Hours, WeeklyHours, AiChatSession, MonthlyHours, Announcements, StripePayout, Referral, MonthlyReport
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import make_aware, now
from rest_framework.parsers import MultiPartParser, FormParser
import json
import logging
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from django.views.generic.edit import UpdateView
from rest_framework.response import Response
from .serializers import RequestSerializer, AiChatSessionSerializer, AnnouncementSerializer, ReferralSerializer, ErrorSerializer
from .serializers import RequestReplySerializer, AcceptedTutorSerializer, HoursSerializer, WeeklyHoursSerializer , MonthlyReportSerializer, UserDocumentSerializer
from rest_framework.decorators import api_view, permission_classes
from datetime import datetime, timedelta, timezone
from django.db.models import Sum, Q
from decimal import Decimal, InvalidOperation
#Email verification
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.conf import settings
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import googleapiclient.errors
from google.oauth2.credentials import Credentials
from django.db.models import F


import stripe

User = get_user_model()
current_time = now()
stripe.api_key = settings.STRIPE_SECRET_KEY


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    if request.user and request.user.is_authenticated:
        user_data = {
            "account_id": request.user.id,
            "firstName": request.user.firstName,
            "lastName": request.user.lastName,
            "username": request.user.username,
            "email": request.user.email,
            "roles": request.user.roles,
            "is_active": request.user.is_active,
            "is_superuser": request.user.is_superuser,
            "profile_picture": (
                request.user.profile_picture.url
                if request.user.profile_picture and hasattr(request.user.profile_picture, 'url')
                else None
            )
        }

        # Add parent if not None
        if request.user.parent is not None:
            user_data["parent"] = request.user.parent.id

        request.user.last_login = now()
        return Response(user_data)

    return Response({"error": "User is not authenticated"}, status=401)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        from django.db import transaction
        from django.core.exceptions import ValidationError
        
        role = serializer.validated_data.get('roles')
        email = serializer.validated_data.get('email')
        parent = serializer.validated_data.get('parent')
        ref_code = self.request.query_params.get("ref")
        
        print("validated data", serializer.validated_data)
        
        # Pre-validate all data before creating anything
        parentUser = None
        ref = None
        
        if role == 'student':
            try:
                parentUser = User.objects.get(email=email, username=parent)
            except User.DoesNotExist:
                raise ValidationError(f"Parent user with email {email} and username {parent} not found")
        
        if ref_code:
            ref = Referral.objects.filter(code=ref_code, referred__isnull=True).first()
        
        # Use atomic transaction to ensure all database operations succeed or none do
        with transaction.atomic():
            if parentUser:
                serializer.validated_data['parent'] = parentUser
                
            user = serializer.save(is_active=False)
            
            # Handle referral logic within transaction
            if role == 'tutor' and ref:
                ref.referred = user
                ref.save(update_fields=["referred"])
                _apply_receiver_discount(user)    
                ref.referrer.pending_rewards = F("pending_rewards") + 1
                ref.referrer.save(update_fields=["pending_rewards"])

        # Post-creation actions (outside transaction to avoid rollback on email failures)
        from playground.tasks import send_verification_email_async, create_stripe_account_async
        from kombu.exceptions import OperationalError
        from django.core.mail import send_mail
        
        # Generate verification email data
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
        
        # Send verification email (don't fail if this fails)
        try:
            try:
                send_verification_email_async.delay(user.id, verify_url)
            except OperationalError:
                # Fallback to synchronous email sending if Celery broker is unavailable
                subject = 'Verify Your EGS Tutoring Account'
                message = f"""
        Hello {user.firstName},
        
        Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:
        
        {verify_url}
        
        If you didn't create this account, please ignore this email.
        
        Best regards,
        EGS Tutoring Team
        """
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=True,  # Don't fail registration if email fails
                )
        except Exception as e:
            # Log error but don't fail registration
            print(f"Email sending failed: {e}")

        # Handle Stripe account creation for tutors (don't fail if this fails)
        if role == 'tutor':
            try:
                create_stripe_account_async.delay(user.id)
            except (OperationalError, Exception) as e:
                # Log error but don't fail registration
                print(f"Stripe account creation failed: {e}")

    

    def send_verification_email(self, user, request):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        domain = get_current_site(request).domain
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
        send_mail(
            "Verify your email",
            f"Click the link to verify your account: {verify_url}",
            settings.DEFAULT_FROM_EMAIL,
            [user.email]
        )
    def send_stripe_onboarding_email(self, user, link):
        send_mail(
            subject="Complete Your Stripe Setup",
            message=f"Welcome! Click the link to complete your Stripe account setup:\n\n{link}\n\nThis is required to receive payouts.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email]
        )
    
@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def change_settings_parent(request, pk):
  
    requester = request.user

    if requester.roles != "parent" and requester.roles != "tutor" and not requester.is_superuser:
        return Response({"error": "Only parents can change these settings."}, status=403)

    if not requester.is_superuser and requester.id != pk:
        return Response({"error": "Cannot edit another user's profile."}, status=403)

    profile = get_object_or_404(User, pk=pk)

    update_fields = []
    for attr in ("firstName", "lastName", "address", "city"):
        if attr in request.data:
            new_val = request.data[attr].strip()
            if getattr(profile, attr) != new_val:
                setattr(profile, attr, new_val)
                update_fields.append(attr)

    if "profile_picture" in request.FILES:
        new_picture = request.FILES["profile_picture"]
        if profile.profile_picture != new_picture:
            profile.profile_picture = new_picture
            update_fields.append("profile_picture")

    if not update_fields:
        return Response({"message": "Nothing to update."}, status=200)

    profile.save(update_fields=update_fields)
    
    # Return updated user data including profile picture URL
    response_data = {"message": "Settings updated successfully."}
    if "profile_picture" in update_fields:
        response_data["profile_picture"] = profile.profile_picture.url if profile.profile_picture else None
    
    return Response(response_data, status=200)


@api_view(['POST'])
@permission_classes([AllowAny])
def upload_tutor_document(request):
    user = request.user
    if user.roles != 'tutor' and not user.is_superuser:
        return Response({'error': 'Only tutors can upload documents.'}, status=403)
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided.'}, status=400)
    file = request.FILES['file']
    doc = UserDocument.objects.create(user=user, file=file)
    return Response({'id': doc.id, 'file': doc.file.url, 'uploaded_at': doc.uploaded_at}, status=201)

@api_view(['GET'])
@permission_classes([AllowAny])
def get_tutor_documents(request):
    user_id = request.query_params.get('id')
    if not user_id:
        return Response({'error': 'User ID is required.'}, status=400)
    
    try:
        # Use the user ID directly to filter UserDocument
        # The user_id should be the primary key from the tutor field in replies
        user = User.objects.get(id=user_id)
        
        if user.roles != 'tutor' and not user.is_superuser:
            return Response({'error': 'Only tutors can access documents.'}, status=403)
        
        # Filter UserDocument by user primary key directly
        documents = UserDocument.objects.filter(user_id=user_id).order_by('-uploaded_at')
        serializer = UserDocumentSerializer(documents, many=True)
        return Response(serializer.data, status=200)
    except User.DoesNotExist:
        return Response({'error': 'User not found.'}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_tutor_document(request, document_id):
    """
    Delete a tutor's document
    """
    user = request.user
    
    # Verify user is a tutor
    if user.roles != 'tutor' and not user.is_superuser:
        return Response({'error': 'Only tutors can delete documents.'}, status=403)
    
    try:
        # Get the document and verify ownership
        document = UserDocument.objects.get(id=document_id, user=user)
        
        # Delete the file from storage and database
        if document.file:
            try:
                document.file.delete()  # This deletes the actual file
            except Exception as e:
                print(f"Error deleting file: {e}")
        
        document.delete()  # This deletes the database record
        
        return Response({'message': 'Document deleted successfully.'}, status=200)
        
    except UserDocument.DoesNotExist:
        return Response({'error': 'Document not found or you do not have permission to delete it.'}, status=404)
    except Exception as e:
        return Response({'error': f'Failed to delete document: {str(e)}'}, status=500)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI") or f"{settings.BACKEND_URL}/api/google/oauth2callback"
GOOGLE_AUTH_SCOPE = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.events.readonly"

class GoogleOAuthInitView(APIView):
    permission_classes=[AllowAny]
    def get(self, request):
        raw_token = request.query_params.get("token")
        if not raw_token:
            return Response({"error": "Missing token"}, status=403)

        try:
            validated_token = AccessToken(raw_token)
            user_id = validated_token["user_id"]
        except Exception:
            return Response({"error": "Invalid token"}, status=403)

        request.session["oauth_user_id"] = user_id
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={GOOGLE_CLIENT_ID}&"
            f"redirect_uri={GOOGLE_REDIRECT_URI}&"
            f"response_type=code&"
            f"scope={GOOGLE_AUTH_SCOPE}&"
            f"access_type=offline&prompt=consent"
        )
        return HttpResponseRedirect(auth_url)

class GoogleOAuthCallbackView(APIView):
    permission_classes = [AllowAny]
    def get(self, request):
        code = request.GET.get("code")
        user_id = request.session.get("oauth_user_id")

        token_data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        r = requests.post("https://oauth2.googleapis.com/token", data=token_data)
        if r.status_code != 200:
            return JsonResponse({"error": "Token exchange failed", "details": r.json()}, status=400)

        tokens = r.json()
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")

        profile = User.objects.get(id=user_id)
        profile._encrypted_google_access_token = access_token
        profile._encrypted_google_refresh_token = refresh_token
        profile.save()

        return redirect(f"{settings.FRONTEND_URL}/calendarConnect")

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_status(request):
    user_id = request.query_params.get('id', None)
    profile = User.objects.get(id=user_id)
    return Response({"connected": bool(profile._encrypted_google_access_token)})

def refresh_google_access_token(user):
    import logging
    logger = logging.getLogger(__name__)
    refresh_token = user.refresh_token
    if not refresh_token:
        logger.error("No Google refresh token found for user. User must reconnect Google account.")
        return "RECONNECT_GOOGLE"
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    response = requests.post("https://oauth2.googleapis.com/token", data=data)
    logger.info(f"Google token refresh response status: {response.status_code}")
    try:
        tokens = response.json()
        logger.debug(f"Google token refresh response: {tokens}")
    except Exception as e:
        logger.error(f"Failed to parse token refresh response: {e}")
        return None

    if response.status_code == 200 and "access_token" in tokens:
        user.access_token = tokens["access_token"]  # Use property to encrypt and store
        user.google_token_expiry = datetime.now(timezone.utc) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
        user.save()
        logger.info("Google access token refreshed and saved.")
        return tokens["access_token"]
    else:
        logger.error(f"Google token refresh failed: {tokens}")
        return None


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_event(request):
    user_id = request.data.get('id')
    profile = User.objects.get(id=user_id)
    # Check if token is expired before API call
    if hasattr(profile, 'google_token_expiry') and profile.google_token_expiry:
        if profile.google_token_expiry < datetime.now(timezone.utc):
            refreshed_token = refresh_google_access_token(profile)
            if refreshed_token == "RECONNECT_GOOGLE":
                return Response({"error": "Google account needs to be reconnected."}, status=403)
            if refreshed_token:
                access_token = refreshed_token
            else:
                return Response({"error": "Google token expired and refresh failed."}, status=403)
        else:
            access_token = profile._encrypted_google_access_token
    else:
        access_token = profile._encrypted_google_access_token

    if not access_token:
        return Response({"error": "Google not connected for this user."}, status=403)

    data = request.data

    try:
        start = datetime.fromisoformat(f"{data['date']}T{data['startTime']}")
        end = datetime.fromisoformat(f"{data['date']}T{data['endTime']}")
    except Exception:
        return Response({"error": "Invalid date/time."}, status=400)

    recurrence = data.get("recurrence")
    recurrence_rule = None
    if recurrence == "weekly":
        recurrence_rule = "RRULE:FREQ=WEEKLY"
    elif recurrence == "biweekly":
        recurrence_rule = "RRULE:FREQ=WEEKLY;INTERVAL=2"

    event = {
        "summary": f"EGS TUTORING - {data['subject']}",
        "description": data.get("description", ""),
        "start": {
            "dateTime": start.isoformat(),
            "timeZone": "America/Toronto"
        },
        "end": {
            "dateTime": end.isoformat(),
            "timeZone": "America/Toronto"
        },
        "attendees": [{"email": data["parentEmail"]}],
        "conferenceData": {
            "createRequest": {
                "requestId": f"meet-{datetime.now().timestamp()}",
                "conferenceSolutionKey": {"type": "hangoutsMeet"}
            }
        },
        "extendedProperties": {
            "shared": {
                "egs_tutoring": "true"
            }
        }
    }

    if recurrence_rule:
        event["recurrence"] = [recurrence_rule]

    def post_event(token):
        return requests.post(
            "https://www.googleapis.com/calendar/v3/calendars/primary/events",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            params={"conferenceDataVersion": 1},
            data=json.dumps(event)
        )

    response = post_event(access_token)

    if response.status_code == 401:
        new_token = refresh_google_access_token(profile)
        if new_token == "RECONNECT_GOOGLE":
            return Response({"error": "Google account needs to be reconnected."}, status=403)
        if new_token:
            response = post_event(new_token)
        else:
            return Response({"error": "Google token expired and refresh failed."}, status=403)

    return Response(response.json())

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def list_egs_tutoring_events(request):
    user_id = request.query_params.get('id')

    if not user_id:
        return Response({"error": "Missing user ID."}, status=400)

    try:
        profile = User.objects.get(id=user_id)
        # Check if token is expired before API call
        access_token = None
        if hasattr(profile, 'google_token_expiry') and profile.google_token_expiry:
            if profile.google_token_expiry < datetime.now(timezone.utc):
                refresh_result = refresh_google_access_token(profile)
                print(f"Google token refresh result: {refresh_result}")
                if refresh_result == "RECONNECT_GOOGLE":
                    return Response({"error": "Google account needs to be reconnected."}, status=403)
                if refresh_result:
                    access_token = refresh_result
                else:
                    return Response({"error": "Google token expired and refresh failed."}, status=403)
            else:
                access_token = profile.access_token
        else:
            access_token = profile.access_token

        # If no access token, force re-authentication
        if not access_token:
            return Response({"error": "Google account needs to be reconnected."}, status=403)

    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

    if(profile.roles == 'parent' or profile.roles == 'student'):
        params = {
            "sharedExtendedProperty": "egs_tutoring=true",
            "privateExtendedProperty": "cant_attend=false",
            "privateExtendedProperty": "disputed=false", 
            "timeMin": datetime.now(timezone.utc).isoformat(),
            "singleEvents": True,
            "ordserBy": "startTime",
            "maxResults": 50
        }
    else:
        params = {
            "sharedExtendedProperty": "egs_tutoring=true",
            "timeMin": datetime.now(timezone.utc).isoformat(),
            "singleEvents": True,
            "orderBy": "startTime",
            "maxResults": 50
        }

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
    except requests.exceptions.RequestException as req_err:
        return Response({"error": "Google API request failed", "details": str(req_err)}, status=502)
    try:
        json_response = response.json()
    except Exception as parse_error:
        return Response({"error": "Invalid JSON from Google"}, status=500)

    if response.status_code in [200, 201]:
        # Defensive: always return an 'items' array
        if 'items' not in json_response:
            json_response['items'] = []
        return Response(json_response)
    else:
        logger.warning("[EGS EVENTS] Google API returned an error")
        error_message = json_response.get('error', {}).get('message', 'Failed to retrieve events')
        return Response(
            {"error": error_message, "details": json_response},
            status=response.status_code
        )

STATUS_MAP = {
    "accept": "accepted",
    "accepted": "accepted",
    "cant_attend": "declined",
    "decline": "declined",
    "disputed": "declined",        # custom => decline on GCal
    "tentative": "tentative",
    "needs_action": "needsAction",
}

ALLOWED_PASSTHRU = {
    "timeMin", "timeMax", "maxResults", "q", "orderBy", "pageToken",
    "privateExtendedProperty", "sharedExtendedProperty", "singleEvents"
}

@api_view(["GET"])
@permission_classes([AllowAny])
def list_egs_tutoring_events_unfiltered(request):
    """
    GET /api/google/events/all?id=<user_id>&timeMin=...&timeMax=...&maxResults=...
    Always enforces sharedExtendedProperty=egs_tutoring=true.
    Front-end handles any further filtering.
    """
    user_id = request.query_params.get("id")
    if not user_id:
        return Response({"error": "Missing user ID."}, status=400)

    try:
        profile = User.objects.get(id=user_id)

        # ensure we have a valid access token
        access_token = None
        if getattr(profile, "google_token_expiry", None):
            if profile.google_token_expiry < datetime.now(timezone.utc):
                refresh_result = refresh_google_access_token(profile)
                if refresh_result == "RECONNECT_GOOGLE":
                    return Response({"error": "Google account needs to be reconnected."}, status=403)
                if refresh_result:
                    access_token = refresh_result
                else:
                    return Response({"error": "Google token expired and refresh failed."}, status=403)
            else:
                access_token = getattr(profile, "access_token", None)
        else:
            access_token = getattr(profile, "access_token", None)

        if not access_token:
            return Response({"error": "Google account needs to be reconnected."}, status=403)

    except User.DoesNotExist:
        return Response({"error": "User not found."}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

    params = {
        "sharedExtendedProperty": "egs_tutoring=true",
        "singleEvents": True,
        "orderBy": "startTime",
        "maxResults": 250,
    }

    default_time_min = datetime.now(timezone.utc).isoformat()
    params["timeMin"] = default_time_min

    # Allow caller to override/extend certain Google params
    for key in ALLOWED_PASSTHRU:
        if key in request.query_params:
            # support multiple values (e.g. multiple privateExtendedProperty)
            values = request.query_params.getlist(key)
            # if single value, let it be a string; requests will handle both
            params[key] = values if len(values) > 1 else values[0]

    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
    headers = {"Authorization": f"Bearer {access_token}"}

    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
    except requests.exceptions.RequestException as req_err:
        return Response({"error": "Google API request failed", "details": str(req_err)}, status=502)

    try:
        json_response = response.json()
    except Exception:
        return Response({"error": "Invalid JSON from Google"}, status=500)

    if response.status_code in (200, 201):
        if "items" not in json_response:
            json_response["items"] = []
        return Response(json_response)
    else:
        error_message = json_response.get("error", {}).get("message", "Failed to retrieve events")
        return Response(
            {"error": error_message, "details": json_response},
            status=response.status_code
        )

class UpdateEventRsvpView(APIView):
    """
    GET /api/google/update-rsvp/?event_id=xyz&status=disputed
    Optional: ?calendar_id=primary  (defaults to 'primary')
    """
    permission_classes = [AllowAny]

    def get(self, request):
        event_id   = request.query_params.get("event_id")
        status_str = request.query_params.get("status", "").lower()
        calendar_id = request.query_params.get("calendar_id", "primary")
        user_id = request.query_params.get("user_id")


        if not event_id or not status_str:
            return Response({"detail": "event_id and status are required"}, status=status.HTTP_400_BAD_REQUEST)

        if status_str not in STATUS_MAP:
            return Response({"detail": f"Unsupported status '{status_str}'"}, status=status.HTTP_400_BAD_REQUEST)

        # Build the calendar service for this user (you must implement this)
        try:
            user = User.objects.get(id=user_id)
            service = self.build_service_for_user(user)  # returns googleapiclient.discovery.Resource
        except Exception as e:
            return Response({"detail": f"Auth error: {e}"}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            event = service.events().get(calendarId=calendar_id, eventId=event_id).execute()
        except googleapiclient.errors.HttpError as e:
            return Response({"detail": f"Fetch failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        # Update attendee RSVP for the current user
        me = user.email.lower()
        g_status = STATUS_MAP[status_str]

        attendees = event.get("attendees", [])
        found = False
        for a in attendees:
            if a.get("email", "").lower() == me:
                a["responseStatus"] = g_status
                found = True
                break

        if not found:
            # add self as attendee with the new status if missing
            attendees.append({"email": me, "responseStatus": g_status})
        event["attendees"] = attendees

        # Optionally mark with extendedProperties / color when “disputed”
        if status_str == "disputed":
            event.setdefault("extendedProperties", {}).setdefault("private", {})["disputed"] = "true"
            event["colorId"] = "11"  # red-ish

        # Patch event
        try:
            updated = service.events().patch(
                calendarId=calendar_id,
                eventId=event_id,
                body=event,
                sendUpdates="all"  # notify others
            ).execute()
        except googleapiclient.errors.HttpError as e:
            return Response({"detail": f"Update failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "detail": "RSVP updated",
            "event_id": updated.get("id"),
            "status_set": g_status
        }, status=status.HTTP_200_OK)
    
    def build_service_for_user(self, user):
    # Pull decrypted tokens from your user model
        creds = Credentials(
            token=user._encrypted_google_access_token,
            refresh_token=user._encrypted_google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        return build("calendar", "v3", credentials=creds, cache_discovery=False)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def stripe_reauth_token(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except:
        return Response({"error": "Invalid user ID"}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({"error": "Invalid or expired token"}, status=400)

    if not user.stripe_account_id:
        return Response({"error": "No Stripe account"}, status=400)

    account_link = stripe.AccountLink.create(
        account=user.stripe_account_id,
        refresh_url=f'{settings.FRONTEND_URL}/stripe-reauth/{{uid}}/{{token}}',
        return_url=f'{settings.FRONTEND_URL}/login',
        type='account_onboarding',
    )
    print(account_link.url)

    return Response({'url': account_link.url})
    
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid UID"}, status=400)

        if default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"message": "Email verified."}, status=200)
        return Response({"error": "Invalid token"}, status=400)

class ParentHomeCreateView(generics.ListCreateAPIView):
    permission_classes=[AllowAny]

    def get(self, request):
        user_id = request.query_params.get('id', None)

        if not user_id:
            return Response({"error": "Missing 'id' query parameter"}, status=400)
        try:
            user = User.objects.get(id=user_id)
            user_role = user.roles
            user_email = user.email
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)

        if not user_role:
            return Response({"error": "Missing 'role' query parameter"}, status=400)
        if not user_email:
            return Response({"error": "Missing 'email' query parameter"}, status=400)

        if user_role == 'parent':
            # Get ALL students that belong to this parent
            all_students = User.objects.filter(parent=user_id, roles='student')
            
            # Get accepted tutors for students
            accepted_tutors = AcceptedTutor.objects.filter(parent=user_id)
            
            # Create a combined dataset with student info and tutor status
            students_with_tutors = []
            for student in all_students:
                # Find if this student has an accepted tutor
                tutor_relation = accepted_tutors.filter(student=student.id).first()
                if tutor_relation:
                    students_with_tutors.append({
                        'id': student.id,
                        'student_firstName': student.firstName,
                        'student_lastName': student.lastName,
                        'tutor_firstName': tutor_relation.tutor.firstName,
                        'tutor_lastName': tutor_relation.tutor.lastName,
                        'has_tutor': True
                    })
                else:
                    students_with_tutors.append({
                        'id': student.id,
                        'student_firstName': student.firstName,
                        'student_lastName': student.lastName,
                        'tutor_firstName': None,
                        'tutor_lastName': None,
                        'has_tutor': False
                    })
            
            hours = Hours.objects.filter(parent=user_id).order_by('-created_at')
            responseHours = HoursSerializer(hours, many=True).data
            
            # Get invoices from Stripe if customer exists
            resultStripe = stripe.Customer.list(email=user_email)
            if not resultStripe.data:
                # If no Stripe customer, return empty invoices but include students and hours
                return Response({
                    "invoices": [],
                    "students": students_with_tutors,
                    "hours": responseHours
                })

            customer = resultStripe.data[0]
            invoices = stripe.Invoice.list(customer=customer.id, limit=55)

            return Response({
                "invoices": invoices.data,
                "students": students_with_tutors,
                "hours": responseHours
            })
        else:
            # Handle non-parent users
            return Response({
                "error": f"This endpoint is only available for parent users. Current role: {user_role}"
            }, status=403)
class ErrorView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ErrorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class AnnouncementCreateView(APIView):
    permission_classes=[AllowAny]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        serializer = AnnouncementSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MonthlyReportCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Create a new monthly report for a tutor-student pair"""
        data = request.data.copy()
        data['tutor'] = request.user.id
        
        serializer = MonthlyReportSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MonthlyReportListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get monthly reports based on user role"""
        user = request.user
        
        if user.roles == 'tutor':
            # Tutors see reports they've created
            reports = MonthlyReport.objects.filter(tutor=user).order_by('-year', '-month', '-created_at')
        elif user.roles == 'parent':
            # Parents see reports for their children
            children = User.objects.filter(parent=user)
            reports = MonthlyReport.objects.filter(student__in=children).order_by('-year', '-month', '-created_at')
        else:
            return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = MonthlyReportSerializer(reports, many=True)
        return Response(serializer.data)


class MonthlyReportDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        """Get a specific monthly report"""
        try:
            report = MonthlyReport.objects.get(id=report_id)
            user = request.user
            
            # Check permissions
            if user.roles == 'tutor' and report.tutor != user:
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            elif user.roles == 'parent' and report.student.parent != user:
                return Response({"error": "Access denied"}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = MonthlyReportSerializer(report)
            return Response(serializer.data)
            
        except MonthlyReport.DoesNotExist:
            return Response({"error": "Report not found"}, status=status.HTTP_404_NOT_FOUND)


class TutorStudentHoursView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get tutoring hours for validation before report submission"""
        tutor_id = request.query_params.get('tutor_id')
        student_id = request.query_params.get('student_id')
        month = request.query_params.get('month')
        year = request.query_params.get('year')
        
        if not all([tutor_id, student_id, month, year]):
            return Response({"error": "Missing required parameters"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            month = int(month)
            year = int(year)
            
            # Calculate date range for the month
            from datetime import datetime
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date()
            else:
                end_date = datetime(year, month + 1, 1).date()
            
            # Get total hours for this tutor-student pair in the given month
            hours = Hours.objects.filter(
                tutor_id=tutor_id,
                student_id=student_id,
                date__gte=start_date,
                date__lt=end_date,
                status='Accepted'
            )
            
            total_hours = hours.aggregate(total=Sum('totalTime'))['total'] or 0
            
            return Response({
                'total_hours': float(total_hours),
                'eligible_for_report': total_hours >= 3,
                'sessions_count': hours.count(),
                'month': month,
                'year': year
            })
            
        except ValueError:
            return Response({"error": "Invalid month or year"}, status=status.HTTP_400_BAD_REQUEST)
    
class AnnouncementListView(APIView):
    permission_classes=[AllowAny]
    def get(self, request):
        user_id = request.query_params.get('id', None)
        user_role = None
        try:
            user_role = User.objects.get(id=user_id).roles
        except User.DoesNotExist:
            user_role = None
        
        if user_role == 'parent':
            announcements = Announcements.objects.filter(Q(audience='all') | Q(audience='parent') | Q(audience='student')).order_by('-created_at')[:7]
            serializer = AnnouncementSerializer(announcements, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif user_role == 'tutor' or user_role == 'admin':  # Fixed case sensitivity
            announcements = Announcements.objects.filter(Q(audience='all') | Q(audience='tutor')).order_by('-created_at')[:7]
            serializer = AnnouncementSerializer(announcements, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            # Default case: return all announcements for unknown/invalid roles
            announcements = Announcements.objects.filter(audience='all').order_by('-created_at')[:7]
            serializer = AnnouncementSerializer(announcements, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

class ReferralCreateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        sender_user = User.objects.get(id=request.data.get('sender_id'))
        receiver_email = request.data.get('receiver_email')
        if User.objects.filter(email=receiver_email).exists():
            return Response({"error": "This user already exists."}, status=status.HTTP_400_BAD_REQUEST)
        if sender_user == receiver_email:
            return Response({"error": "You cannot refer yourself."}, status=status.HTTP_400_BAD_REQUEST)
        if Referral.objects.filter(prospective_email=receiver_email).exists():
            return Response({"error": "This user already received a referral code."}, status=status.HTTP_400_BAD_REQUEST)
        if not sender_user or not receiver_email:
            return Response({"error": "Invalid sender or receiver email."}, status=status.HTTP_400_BAD_REQUEST)
        if not sender_user.is_active:
            return Response({"error": "Sender account must be active."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            ref = Referral.objects.create(
                referrer=request.user,
                prospective_email=receiver_email,
            )
            ref.generate_code()
            ref.save()

            invite_link = f"{settings.BACKEND_URL}/api/register?ref={ref.code}"
            serializer = ReferralSerializer(ref)
            
            # Send referral email asynchronously
            from playground.tasks import send_referral_email_async
            send_referral_email_async.delay(
                sender_user.firstName, 
                sender_user.email, 
                receiver_email
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)  

class ReferralListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.query_params.get('id', None)
        if not user_id:
            return Response({"error": "Missing 'id' query parameter"}, status=400)

        try:
            user = User.objects.get(id=user_id)
            referrals = Referral.objects.filter(referrer=user).order_by('-created_at')
            serializer = ReferralSerializer(referrals, many=True)
            return Response(serializer.data, status=200)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)     

class RequestListCreateView(generics.ListCreateAPIView):
    serializer_class = RequestSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        serializer.save()

       
class RequestResponseCreateView(generics.ListCreateAPIView):
    serializer_class = RequestReplySerializer
    permission_classes = [AllowAny]
    queryset = (
        TutorResponse.objects
        .select_related("request__parent", "request__student", "tutor")
        .prefetch_related("tutor__documents")  # if your serializer exposes tutor_documents
        .order_by("-created_at")
    )

    def perform_create(self, serializer):
        reply = serializer.save()  # returns a RequestReply instance

        parent = reply.request.parent
        student = reply.request.student
        parent_email = getattr(parent, "email", None)
        student_first = getattr(student, "firstName", "")

        if parent_email:
            # Send reply notification email asynchronously (temporarily disabled to avoid getaddrinfo error)
            try:
                from playground.tasks import send_reply_notification_email_async
                tutor_name = f"{reply.tutor.firstName} {reply.tutor.lastName}"
                send_reply_notification_email_async.delay(
                    parent_email, 
                    tutor_name, 
                    reply.request.subject
                )
            except Exception as e:
                # Log the error but don't fail the request
                print(f"Email sending failed: {e}")
                pass

    def _send_reply_email(self, to_email, subject, body):
        send_mail(
            subject,
            body,
            settings.DEFAULT_FROM_EMAIL,
            [to_email],
            fail_silently=False,
        )

class StudentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id = request.query_params.get('parent', None)
        if not parent_id:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        students = User.objects.filter(roles='student', parent=parent_id)
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)


class TutorStudentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tutor_id = request.query_params.get('tutor', None)
        if not tutor_id:
            return Response({"error": "Missing 'tutor' query parameter."}, status=400)

        students = AcceptedTutor.objects.filter(tutor=tutor_id)
        unique_students = {}
        for student in students:
            if student.student not in unique_students:
                unique_students[student.student] = student
        serializer = AcceptedTutorSerializer(unique_students.values(), many=True)
        return Response(serializer.data)


class PersonalRequestListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id = request.query_params.get('id', None)
        if not parent_id:
            return Response({"error": "Missing 'parent_id' query parameter."}, status=400)

        request_qs = TutoringRequest.objects.filter(
            parent=parent_id,
            is_accepted="Not Accepted"
        ).order_by('-created_at')
        serializer = RequestSerializer(request_qs, many=True)
        return Response(serializer.data)


class ReplyListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id = request.query_params.get('parent', None)
        tutoring_request_id = request.query_params.get('selectedRequestID')
        if not parent_id:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        replies = TutorResponse.objects.filter(
            request__id=tutoring_request_id,
            request__parent=parent_id,
            rejected=False
        )
        serializer = RequestReplySerializer(replies, many=True)
        return Response(serializer.data)


class RequestListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user = request.user

        # base queryset
        qs = TutoringRequest.objects.all().order_by("-created_at")

        # superuser: return ALL, no filters
        if user.is_authenticated and user.is_superuser:
            serializer = RequestSerializer(qs, many=True, context={"request": request})
            return Response(serializer.data)

        # everyone else: only "not accepted"
        qs = qs.filter(Q(is_accepted=False) | Q(is_accepted="Not Accepted"))

        # tutor: exclude requests already replied to by THIS tutor
        if user.is_authenticated and getattr(user, "roles", None) == "tutor":
            replies_by_me = TutorResponse.objects.filter(
                request=OuterRef("pk"),
                tutor=user,
            )
            qs = qs.annotate(already_replied=Exists(replies_by_me)).filter(already_replied=False)

        serializer = RequestSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data)



class AcceptReplyCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = AcceptedTutorSerializer

    def perform_create(self, serializer):
        accepted_tutor = serializer.save()
        requestID = accepted_tutor.request_id
        try:
            tutoring_request = TutoringRequest.objects.get(id=requestID)
            tutoring_request.is_accepted = "Accepted"
            tutoring_request.save()
        except TutoringRequest.DoesNotExist:
            pass

    def get(self, request):
        parent_id = request.query_params.get("id")
        tutorsList = AcceptedTutor.objects.filter(parent=parent_id)
        serializer = AcceptedTutorSerializer(tutorsList, many=True)
        return Response(serializer.data)


class RejectUpdateView(APIView):
    permission_classes = [AllowAny]
    serializer_class = AcceptedTutorSerializer

    def post(self, request):
        replyID = request.query_params.get('replyID')
        try:
            reply = TutorResponse.objects.get(id=replyID)
            reply.rejected = True
            reply.save()
        except TutorResponse.DoesNotExist:
            pass

        return Response("Success! Reply has been deleted")


class ChangeTutor(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        student = request.data.get('student')
        value = request.data.get('value')
        try:
            change = AcceptedTutor.objects.get(student__username=student)
            currentStatus = change.status

            if value == False:
                change.status = "DISPUTED"
                change.save()
                return Response({
                    "message": "Success! Status changed.",
                    "student": student,
                    "previous_status": currentStatus,
                    "new_status": change.status,
                })

            if value == True:
                change.status = "ACCEPTED"
                change.save()
                return Response({
                    "message": "Changed to ACCEPTED",
                    "student": student,
                    "current_status": currentStatus,
                })
        except AcceptedTutor.DoesNotExist:
            pass

        return Response("END of POST")

TZ = ZoneInfo("America/Toronto")

def week_start(d):  # Monday anchor
    return d - timedelta(days=d.weekday())

class LogHoursCreateView(APIView):
    queryset = Hours.objects.all()
    serializer_class = HoursSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        data = request.data.copy()  # QueryDict is immutable
        student_id = data.get("student_id")
        if not student_id:
            raise ValidationError("Missing 'student_id' field")

        student = User.objects.get(pk=student_id)
        parent = student.parent_id

        # Expecting 'start' or 'date' in payload. Adjust name accordingly.
        raw_dt = data.get("start_time") or data.get("date")
        if not raw_dt:
            raise ValidationError("Missing 'start' (or 'date') field")

        # Let DRF parse it the same way serializer would:
        session_dt = HoursSerializer().fields["start_time"].to_internal_value(raw_dt)
        session_date = session_dt.astimezone(TZ).date()

        now_local = timezone.now().astimezone(TZ).date()
        cur_ws = week_start(now_local)
        cur_we = cur_ws + timedelta(days=6)

        eligible = cur_ws <= session_date <= cur_we
        status = "submitted" if eligible else "late"

        data.update({
            "parent": parent,
            "eligible": eligible,
            "submitted_at": timezone.now().astimezone(TZ)
        })

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=201, headers=headers)
    
@receiver(post_save, sender=Hours)
def maybe_issue_referral_credit(sender, instance, created, **kwargs):
    if instance.status not in ("Accepted", "accepted"):
        return                              
    try:
        ref = (Referral.objects
               .select_for_update()         # lock row, prevent races
               .get(referred=instance.student.parent,
                    reward_given=False))
    except Referral.DoesNotExist:
        return
    total = (Hours.objects
             .filter(student=instance.student,
                     status__in=("Accepted"))
             .aggregate(Sum("totalTime"))
             .get("totalTime__sum") or 0)

    if total < 3:
        return                              # threshold not met yet

    # ---- issue $80 credit exactly once ----
    stripe.Customer.create_balance_transaction(
        customer   = ref.referrer.stripe_account_id,
        amount     = -6000,                 # –$60 CAD credit
        currency   = "cad",
        description= "Referral reward – $60",
        idempotency_key=f"referral-{ref.id}"
    )

    ref.reward_given = True
    ref.reward_date  = timezone.now()
    ref.save(update_fields=["reward_given", "reward_date"])

    
class ParentHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id= request.query_params.get("id")
        parent = User.objects.get(id=parent_id)
        records = Hours.objects.filter(parent=parent).order_by('-created_at')
        serializer = HoursSerializer(records, many=True)
        return Response(serializer.data)

class DisputeHours(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        dispute_id = request.data.get('eventId')
        email = request.data.get('email')
        dispute_message = request.data.get('message')

        Hours.objects.filter(id=dispute_id).update(status='DISPUTE')
        
        # Send dispute email asynchronously
        from playground.tasks import send_dispute_email_async
        admin_emails = [settings.ADMIN_EMAIL]  # Configure admin emails
        send_dispute_email_async.delay(admin_emails, email, f"Hours ID: {dispute_id}")
        
        return Response("Status changed to 'DISPUTE'")

    def send_dispute_email(self, to_email):
        subject = "Dispute Received!"
        message = "Our team is currently reviewing your dispute. Thank you for bringing this to our attention."
        from_email = settings.DEFAULT_FROM_EMAIL
        send_mail(subject, message, from_email, [to_email])

class WeeklyHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        start_date_raw = request.data.get("start_date")
        end_date_raw = request.data.get("end_date")
        start_date = make_aware(datetime.strptime(start_date_raw, "%Y-%m-%d"))
        end_date = make_aware(datetime.strptime(end_date_raw, "%Y-%m-%d"))

        start_date = (start_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = (end_date - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=999999)

        weekly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date')
        serializer = HoursSerializer(weekly_hours, many=True)
        return Response(serializer.data)

    def post(self, request):
        entries = request.data
        created = False

        for entry in entries:

            exists = WeeklyHours.objects.filter(
                date=entry['date'],
                parent=entry['parent'],
                OnlineHours=entry['OnlineHours'],
                InPersonHours=entry['InPersonHours']
            ).exists()

            if not exists:
                WeeklyHours.objects.create(
                    date=entry['date'],
                    parent=entry['parent'],
                    OnlineHours=entry['OnlineHours'],
                    InPersonHours=entry['InPersonHours'],
                    TotalBeforeTax=entry['TotalBeforeTax']
                )
                created = True

        if created:
            return Response({"status": "created"}, status=201)
        return Response({"status": "Not Created, Duplicate"}, status=200)

class calculateTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("currentDay")
        target_date = make_aware(datetime.strptime(date_str, "%Y-%m-%d"))

        start_date = (target_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = (target_date - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=999999)

        weekly_hours = Hours.objects.filter(date__range=(start_date, end_date))
        parents = set(weekly_hours.values_list('parent', flat=True))

        rate_data = User.objects.filter(id__in=parents, roles='parent', is_active=True).values('id', 'rateOnline', 'rateInPerson')
        online_rate_dict = {item['id']: Decimal(item['rateOnline'] or 0) for item in rate_data}
        inperson_rate_dict = {item['id']: Decimal(item['rateInPerson'] or 0) for item in rate_data}

        results = []

        for parent_id in parents:
            parent_hours = weekly_hours.filter(parent_id=parent_id)
            online_hours = Decimal(parent_hours.filter(location='Online').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)
            inperson_hours = Decimal(parent_hours.filter(location='In-Person').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)

            total_online = online_hours * online_rate_dict.get(parent_id, Decimal('0'))
            total_inperson = inperson_hours * inperson_rate_dict.get(parent_id, Decimal('0'))
            total_before_tax = total_online + total_inperson

            results.append({
                "date": target_date.date(),
                "parent": parent_id,
                "OnlineHours": float(online_hours),
                "InPersonHours": float(inperson_hours),
                "TotalBeforeTax": float(total_before_tax),
            })

        return Response(results)

class CreateInvoiceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from playground.tasks import bulk_invoice_generation_async
        
        today_str = request.query_params.get('currentDay')
        if not today_str:
            return Response({"error": "Missing 'currentDay' query parameter"}, status=400)

        try:
            today = datetime.strptime(today_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        # Get all customer emails for today
        customers_email_qs = WeeklyHours.objects.filter(date=today).values_list('email', flat=True).distinct()

        customer_data_list = []
        for email_str in customers_email_qs:
            # Find stripe customers by email
            result = stripe.Customer.list(email=email_str)
            if result and result.data:
                customer = result.data[0]
                
                # Get the total before tax amount for this customer's email and date
                amount_dict = WeeklyHours.objects.filter(date=today, email=customer.email).values('TotalBeforeTax').first()
                if amount_dict and 'TotalBeforeTax' in amount_dict:
                    # Convert amount to cents as integer
                    amount_cents = int(Decimal(amount_dict['TotalBeforeTax']) * 100)
                    
                    customer_data_list.append({
                        'customer_id': customer.id,
                        'amount': amount_cents,
                        'description': 'Tutoring Sessions'
                    })

        if customer_data_list:
            # Process invoices asynchronously
            bulk_invoice_generation_async.delay(
                customer_data_list,
                {'date': today_str, 'currency': 'cad'}
            )
            return Response({
                "message": f"Bulk invoice generation started for {len(customer_data_list)} customers",
                "customers_count": len(customer_data_list)
            })
        else:
            return Response({"message": "No customers found for invoice generation"})


class InvoiceListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        customer_email = request.query_params.get("email")
        if not customer_email:
            return Response({"error": "Missing 'email' query parameter"}, status=400)

        result = stripe.Customer.list(email=customer_email)
        if not result.data:
            return Response({"error": "No Stripe customer found with this email"}, status=404)

        customer = result.data[0]
        invoices = stripe.Invoice.list(customer=customer.id, limit=55)

        response = []
        for invoice in invoices.auto_paging_iter():
            created_dt = datetime.fromtimestamp(invoice.created)
            due_dt = datetime.fromtimestamp(invoice.due_date) if invoice.due_date else None

            response.append({
                "id": invoice.id,
                "date": created_dt,
                "amount": invoice.amount_due,
                "due_date": due_dt,
                "status": invoice.status,
                "link": invoice.hosted_invoice_url,
            })

        return Response(response)


#Ran without consequence to view hours before submitting them.
class MonthlyHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):

        last_date_raw = request.query_params.get("end")
        start_date_raw = request.query_params.get("start")
        last_date = datetime.strptime(last_date_raw, "%Y-%m-%d")
        start_date = datetime.strptime(start_date_raw, "%Y-%m-%d")
        end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        monthly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date')
        serializer = HoursSerializer(monthly_hours, many=True)
        return Response(serializer.data)

    def post(self, request):
        entries = request.data
        created = False

        for entry in entries:
            stripeID_qs = User.objects.filter(id=entry.get('tutor')).values('stripe_account_id')
            stripeID = stripeID_qs.first()['stripe_account_id'] if stripeID_qs.exists() else None
            if not stripeID:
                continue

            exists = MonthlyHours.objects.filter(
                end_date=entry.get('end_date'),
                start_date=entry.get('start_date'),
                tutor=entry.get('tutor'),
                OnlineHours=entry.get('OnlineHours'),
                InPersonHours=entry.get('InPersonHours')
            ).exists()

            if not exists:
                MonthlyHours.objects.create(
                    end_date=entry.get('end_date'),
                    start_date=entry.get('start_date'),
                    tutor=entry.get('tutor'),
                    OnlineHours=entry.get('OnlineHours'),
                    InPersonHours=entry.get('InPersonHours'),
                    TotalBeforeTax=entry.get('TotalBeforeTax')
                )
                created = True

        if created:
            return Response({"status": "created"}, status=201)
        else:
            return Response({"status": "Not Created, Duplicate"}, status=200)

#Ran once hours are calculate and sent
class calculateMonthlyTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            last_date_raw = request.query_params.get("end")
            start_date_raw = request.query_params.get("start")
            last_date = datetime.strptime(last_date_raw, "%Y-%m-%d")
            start_date = datetime.strptime(start_date_raw, "%Y-%m-%d")
            start_date = (start_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        except Exception:
            return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        monthly_hours = Hours.objects.filter(date__range=(start_date, end_date), eligible='Eligible').order_by('date')
        tutors = set(monthly_hours.values_list('tutor', flat=True))

        results = []
        for tutor in tutors:
            tutor_hours = monthly_hours.filter(tutor=tutor)
            online_hours = Decimal(tutor_hours.filter(location='Online').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)
            inperson_hours = Decimal(tutor_hours.filter(location='In-Person').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)
            rate_data = User.objects.filter(id__in=tutors, roles='tutor', is_active=True).values('id', 'rateOnline', 'rateInPerson')
            online_rate_dict = {item['id']: Decimal(item['rateOnline'] or 0) for item in rate_data}
            inperson_rate_dict = {item['id']: Decimal(item['rateInPerson'] or 0) for item in rate_data}


            total_online = online_hours * online_rate_dict.get(tutor, Decimal('0'))
            total_inperson = inperson_hours * inperson_rate_dict.get(tutor, Decimal('0'))
            total_before_tax = total_online + total_inperson

            results.append({
                "end_date": target_date.date(),
                "tutor": tutor,
                "OnlineHours": float(online_hours),
                "InPersonHours": float(inperson_hours),
                "TotalBeforeTax": float(total_before_tax)
            })

        return Response(results)

class BatchMonthlyHoursPayoutView(APIView):
    """
    POST body:
    {
      "start_date": "2025-07-01",
      "end_date":   "2025-07-31"
    }
    (Both required, YYYY-MM-DD)
    Only admins/superusers can call.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from playground.tasks import batch_payout_processing_async
        
        start_date = request.data.get("start_date")
        end_date   = request.data.get("end_date")

        if not start_date or not end_date:
            return Response({"detail": "start_date and end_date required."}, status=status.HTTP_400_BAD_REQUEST)

        rows = (MonthlyHours.objects
                .filter(end_date=end_date, start_date=start_date))

        if not rows.exists():
            return Response({"detail": "No MonthlyHours in that range."}, status=status.HTTP_404_NOT_FOUND)

        # Prepare payout data for async processing
        payout_data_list = []
        skipped = []

        for mh in rows:
            tutor = mh.tutor
            if not tutor.stripe_account_id:
                skipped.append({
                    "monthly_hours_id": mh.id,
                    "tutor_id": tutor.id,
                    "reason": "no_stripe_account"
                })
                continue

            # Avoid double-paying same row
            if StripePayout.objects.filter(monthly_hours=mh).exists():
                skipped.append({
                    "monthly_hours_id": mh.id,
                    "tutor_id": tutor.id,
                    "reason": "already_paid"
                })
                continue

            amount_cents = int(Decimal(mh.TotalBeforeTax) * 100)

            payout_data_list.append({
                'tutor_id': tutor.id,
                'stripe_account_id': tutor.stripe_account_id,
                'amount': amount_cents,
                'currency': 'cad',
                'description': f"MonthlyHours #{mh.id} payout",
                'metadata': {
                    "monthly_hours_id": mh.id,
                    "tutor_id": tutor.id,
                    "period_date": str(mh.date),
                }
            })

        if payout_data_list:
            # Process payouts asynchronously
            batch_payout_processing_async.delay(payout_data_list)
            return Response({
                "message": f"Batch payout processing started for {len(payout_data_list)} tutors",
                "payouts_queued": len(payout_data_list),
                "skipped": skipped
            }, status=status.HTTP_202_ACCEPTED)
        else:
            return Response({
                "message": "No payouts to process",
                "skipped": skipped
            })
    
@api_view(['POST'])
@permission_classes([AllowAny])
def create_chat_session(request):
    session = AiChatSession.objects.create()
    serializer = AiChatSessionSerializer(session)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def chat_session(request, session_id):
    session = get_object_or_404(AiChatSession, id=session_id)
    serializer = AiChatSessionSerializer(session)

    if request.method == 'POST':
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        session.send(message)

    return Response(serializer.data)
