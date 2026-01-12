from zoneinfo import ZoneInfo

from django.dispatch import receiver
from .models import UserDocument
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models.signals import post_save
from django.shortcuts import render
from django.db.models import Exists, OuterRef, Q
import requests, os, shutil
from pathlib import Path
from django.db import transaction
from django.shortcuts import redirect
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model  # Correct way to import the user model
from rest_framework import generics, status
from .serializers import UserSerializer, UserRegistrationSerializer, TutorComplaintSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from decimal import Decimal, InvalidOperation
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponseRedirect
from .models import TutoringRequest, TutorResponse, AcceptedTutor, Hours, WeeklyHours, AiChatSession, MonthlyHours, Announcements, StripePayout, Referral, MonthlyReport, HourDispute, TutorComplaint, Popup, PopupDismissal, TutorReferralRequest
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.utils.timezone import make_aware, now
from rest_framework.parsers import MultiPartParser, FormParser
import json
import logging
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from django.views.generic.edit import UpdateView
from rest_framework.response import Response
from .serializers import RequestSerializer, AiChatSessionSerializer, AnnouncementSerializer, ReferralSerializer, ErrorSerializer, PopupSerializer, PopupDismissalSerializer
from .serializers import RequestReplySerializer, AcceptedTutorSerializer, HoursSerializer, WeeklyHoursSerializer , MonthlyReportSerializer, UserDocumentSerializer, HourDisputeSerializer
from rest_framework.decorators import api_view, permission_classes
from datetime import datetime, timedelta
from django.utils import timezone
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
import os

User = get_user_model()
current_time = now()
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

def copy_to_frontend_public(file_path, relative_path):
    """Copy uploaded file to frontend public directory for direct serving"""
    try:
        from django.conf import settings
        
        # Get the base directory (where manage.py is)
        base_dir = Path(settings.BASE_DIR)
        
        # Construct frontend public uploads path
        frontend_public = base_dir / "frontend" / "public" / "uploads" / relative_path
        
        # Create directory if it doesn't exist
        frontend_public.parent.mkdir(parents=True, exist_ok=True)
        
        # Copy the file
        if os.path.exists(file_path):
            shutil.copy2(file_path, frontend_public)
            print(f"Copied {file_path} to {frontend_public}")
            return True
    except Exception as e:
        print(f"Failed to copy file to frontend: {e}")
    return False


def wrap_message_in_html_template(message_text):
    """
    Wrap plain text message in HTML email template with logo and formatting
    """
    # Convert line breaks to HTML line breaks and wrap in paragraphs
    paragraphs = message_text.strip().split('\n')
    formatted_message = ''.join([f'<p>{paragraph}</p>' if paragraph.strip() else '<br>' for paragraph in paragraphs])

    html_template = f"""<!doctype html>
<html>
<body style="margin:0; padding:0; background:#f4f4f4;">
  <center style="width:100%; padding:20px 0; background:#f4f4f4;">
    <table width="100%" style="max-width:600px; background:#ffffff; border-radius:8px; padding:32px; font-family:Arial, Helvetica, sans-serif;">
      <tr>
        <td style="text-align:center;">
          <img src="https://static.wixstatic.com/media/b72034_63e58f49589147d987fde676e33ffef0~mv2.jpg" alt="EGS Tutoring" style="width:100%; max-height:260px; object-fit:cover; border-radius:6px; display:block; margin-bottom:16px;">
        </td>
      </tr>

      <tr>
        <td style="font-size:15px; line-height:1.5; color:#333333;">
          {formatted_message}

          <p style="font-size:12px; color:#777777; text-align:center; margin-top:20px;">
            EGS Tutoring · Bilingual Tutoring Across the GTA<br>
            Phone: 289-423-8434 · Email: info@egstutoring.ca<br>
            Website: <a href="https://www.egstutoring.ca/" style="color:#0066cc; text-decoration:none;">www.egstutoring.ca</a>
          </p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>"""
    return html_template


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
            "address": request.user.address,
            "city": request.user.city,
            "rateOnline": float(request.user.rateOnline),
            "rateInPerson": float(request.user.rateInPerson),
            "availableReferralCredit": float(request.user.available_referral_credit),
            "stripe_account_id": request.user.stripe_account_id,
            "profile_picture": (
                request.build_absolute_uri(request.user.profile_picture.url)
                if request.user.profile_picture and hasattr(request.user.profile_picture, 'url')
                else None
            ),
            "tutor_referral_code": request.user.tutor_referral_code,
            "has_seen_tour": request.user.has_seen_tour
        }

        # Add parent if not None
        if request.user.parent is not None:
            user_data["parent"] = request.user.parent.id

        request.user.last_login = now()
        return Response(user_data)

    return Response({"error": "User is not authenticated"}, status=401)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_tour_complete(request):
    """Mark the onboarding tour as complete for the current user"""
    if request.user and request.user.is_authenticated:
        request.user.has_seen_tour = True
        request.user.save(update_fields=['has_seen_tour'])
        return Response({"success": True, "message": "Tour marked as complete"})
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
            
            # Set default rates based on user role
            user.set_default_rates_by_role()
            user.save()
            
            # Handle referral logic within transaction
            if role == 'tutor' and ref:
                ref.referred = user
                ref.save(update_fields=["referred"])
                _apply_receiver_discount(user)    
                ref.referrer.pending_rewards = F("pending_rewards") + 1
                ref.referrer.save(update_fields=["pending_rewards"])

        # Post-creation actions (outside transaction to avoid rollback on email failures)
        from playground.tasks import send_verification_email_async, create_stripe_account_async, send_parent_registration_notification_async
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
        
        # Note: Stripe customers for parents are created on-demand during invoice generation
        
        # Send admin notification when parent registers (don't fail if this fails)
        if role == 'parent':
            try:
                # Prepare complete parent information for admin notification
                parent_info = {
                    'firstName': user.firstName,
                    'lastName': user.lastName,
                    'username': user.username,
                    'email': user.email,
                    'phone': getattr(user, 'phone', 'N/A'),
                    'address': getattr(user, 'address', 'N/A'),
                    'city': getattr(user, 'city', 'N/A'),
                    'date_joined': user.date_joined.strftime('%Y-%m-%d %H:%M:%S') if user.date_joined else 'N/A'
                }
                send_parent_registration_notification_async.delay(parent_info)
            except (OperationalError, Exception) as e:
                # Log error but don't fail registration
                print(f"Parent registration notification failed: {e}")

    

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
        if profile.profile_picture:
            response_data["profile_picture"] = request.build_absolute_uri(profile.profile_picture.url)
        else:
            response_data["profile_picture"] = None
    
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
GOOGLE_AUTH_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.events.readonly"

def get_google_redirect_uri(request):
    """Get the correct Google redirect URI based on the current request domain"""
    # Use the current request's host to build the redirect URI
    current_host = request.get_host()
    # Always use HTTPS for production domains
    scheme = 'https'
    return f"{scheme}://{current_host}/api/google/oauth2callback"

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
        redirect_uri = get_google_redirect_uri(request)
        auth_url = (
            f"https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={GOOGLE_CLIENT_ID}&"
            f"redirect_uri={redirect_uri}&"
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
        redirect_uri = get_google_redirect_uri(request)

        token_data = {
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
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
        # Set token expiry time
        from datetime import timezone as dt_timezone
        profile.google_token_expiry = datetime.now(dt_timezone.utc) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
        profile.save()

        return redirect(f"{settings.FRONTEND_URL}/events")

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def google_status(request):
    user_id = request.query_params.get('id', None)
    profile = User.objects.get(id=user_id)
    return Response({"connected": bool(profile._encrypted_google_access_token)})

def refresh_google_access_token(user):
    import logging
    logger = logging.getLogger(__name__)
    refresh_token = user._encrypted_google_refresh_token
    if not refresh_token:
        logger.error("No Google refresh token found for user. User must reconnect Google account.")
        return "RECONNECT_GOOGLE"
    data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
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
        user._encrypted_google_access_token = tokens["access_token"]  # Use encrypted property to store
        from datetime import timezone as dt_timezone
        user.google_token_expiry = datetime.now(dt_timezone.utc) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
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
        from datetime import timezone as dt_timezone
        if profile.google_token_expiry < datetime.now(dt_timezone.utc):
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
        recurrence_rule = "RRULE:FREQ=WEEKLY;COUNT=6"  # 6 weeks only
    elif recurrence == "biweekly":
        recurrence_rule = "RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=6"  # 6 occurrences, every 2 weeks (12 weeks total)

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
            from datetime import timezone as dt_timezone
            if profile.google_token_expiry < datetime.now(dt_timezone.utc):
                refresh_result = refresh_google_access_token(profile)
                print(f"Google token refresh result: {refresh_result}")
                if refresh_result == "RECONNECT_GOOGLE":
                    return Response({"error": "Google account needs to be reconnected."}, status=403)
                if refresh_result:
                    access_token = refresh_result
                else:
                    return Response({"error": "Google token expired and refresh failed."}, status=403)
            else:
                access_token = profile._encrypted_google_access_token
        else:
            access_token = profile._encrypted_google_access_token

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
            "timeMin": datetime.now(dt_timezone.utc).isoformat(),
            "singleEvents": True,
            "ordserBy": "startTime",
            "maxResults": 50
        }
    else:
        params = {
            "sharedExtendedProperty": "egs_tutoring=true",
            "timeMin": datetime.now(dt_timezone.utc).isoformat(),
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
            from datetime import timezone as dt_timezone
            if profile.google_token_expiry < datetime.now(dt_timezone.utc):
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

    from datetime import timezone as dt_timezone
    default_time_min = datetime.now(dt_timezone.utc).isoformat()
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
    POST /api/google/update-rsvp/ with JSON body
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

    def post(self, request):
        """Handle POST requests with cancellation reasons and email notifications"""
        event_id = request.data.get("event_id")
        status_str = request.data.get("status", "").lower()
        calendar_id = request.data.get("calendar_id", "primary")
        user_id = request.data.get("user_id")
        cancel_reason = request.data.get("cancel_reason", "")
        send_emails = request.data.get("send_emails", False)

        if not event_id or not status_str:
            return Response({"detail": "event_id and status are required"}, status=status.HTTP_400_BAD_REQUEST)

        if status_str not in STATUS_MAP:
            return Response({"detail": f"Unsupported status '{status_str}'"}, status=status.HTTP_400_BAD_REQUEST)

        # Build the calendar service for this user
        try:
            user = User.objects.get(id=user_id)
            service = self.build_service_for_user(user)
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
            attendees.append({"email": me, "responseStatus": g_status})
        event["attendees"] = attendees

        # Store cancellation details in extendedProperties
        if status_str == "cant_attend":
            event.setdefault("extendedProperties", {}).setdefault("private", {})
            event["extendedProperties"]["private"]["cant_attend"] = "true"
            event["extendedProperties"]["private"]["cancelled_by"] = user.email
            if cancel_reason:
                event["extendedProperties"]["private"]["cancel_reason"] = cancel_reason
            event["colorId"] = "11"  # red color for cancelled
        elif status_str == "accepted":
            # Clear cancellation data when re-accepting
            if event.get("extendedProperties", {}).get("private"):
                event["extendedProperties"]["private"].pop("cant_attend", None)
                event["extendedProperties"]["private"].pop("cancelled_by", None)
                event["extendedProperties"]["private"].pop("cancel_reason", None)
            event.pop("colorId", None)  # remove color

        # Patch event
        try:
            # Use sendUpdates="none" for cancellations since we send custom emails
            # Use sendUpdates="all" for acceptances so Google notifies attendees
            send_updates = "none" if status_str == "cant_attend" else "all"

            updated = service.events().patch(
                calendarId=calendar_id,
                eventId=event_id,
                body=event,
                sendUpdates=send_updates
            ).execute()
        except googleapiclient.errors.HttpError as e:
            return Response({"detail": f"Update failed: {e}"}, status=status.HTTP_400_BAD_REQUEST)

        # Send email notifications if requested
        if send_emails and status_str == "cant_attend":
            self.send_cancellation_emails(user, event, cancel_reason, attendees)

        return Response({
            "detail": "RSVP updated",
            "event_id": updated.get("id"),
            "status_set": g_status
        }, status=status.HTTP_200_OK)

    def send_cancellation_emails(self, cancelling_user, event, cancel_reason, attendees):
        """Send email notifications for cancellations"""
        try:
            from playground.email_utils import send_mailgun_email
            from django.conf import settings

            event_title = event.get("summary", "Tutoring Session")
            event_start = event.get("start", {}).get("dateTime", event.get("start", {}).get("date", ""))

            # Format date nicely
            if event_start:
                try:
                    if "T" in event_start:  # datetime format
                        event_datetime = datetime.fromisoformat(event_start.replace('Z', '+00:00'))
                        formatted_date = event_datetime.strftime("%B %d, %Y at %I:%M %p")
                    else:  # date only format
                        event_date = datetime.fromisoformat(event_start).date()
                        formatted_date = event_date.strftime("%B %d, %Y")
                except:
                    formatted_date = event_start
            else:
                formatted_date = "Unknown date"

            # Send confirmation email to cancelling user
            confirmation_subject = f"Cancellation Confirmation - {event_title}"
            confirmation_message = f"""
Hello,

You have successfully cancelled the following tutoring session:

Session: {event_title}
Date: {formatted_date}
Reason: {cancel_reason}

Both you and the other participant have been notified of this cancellation.

Best regards,
EGS Tutoring Team
            """

            send_mailgun_email(
                [cancelling_user.email],
                confirmation_subject,
                confirmation_message.strip()
            )

            # Send notification emails to other attendees
            for attendee in attendees:
                attendee_email = attendee.get("email", "").lower()
                if attendee_email != cancelling_user.email.lower():
                    # Determine role for better messaging
                    canceller_role = "tutor" if cancelling_user.roles == "tutor" else "student"

                    notification_subject = f"Session Cancelled - {event_title}"
                    notification_message = f"""
Hello,

The {canceller_role} has cancelled the following tutoring session:

Session: {event_title}
Date: {formatted_date}
Cancelled by: {cancelling_user.first_name} {cancelling_user.last_name} ({cancelling_user.email})
Reason: {cancel_reason}

Please contact the {canceller_role} if you need to reschedule or have any questions.

Best regards,
EGS Tutoring Team
                    """

                    send_mailgun_email(
                        [attendee_email],
                        notification_subject,
                        notification_message.strip()
                    )

        except Exception as e:
            # Log error but don't fail the request
            print(f"Error sending cancellation emails: {e}")

    def build_service_for_user(self, user):
    # Pull decrypted tokens from your user model
        creds = Credentials(
            token=user._encrypted_google_access_token,
            refresh_token=user._encrypted_google_refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=GOOGLE_CLIENT_ID,
            client_secret=GOOGLE_CLIENT_SECRET,
            scopes=["https://www.googleapis.com/auth/calendar"]
        )
        return build("calendar", "v3", credentials=creds, cache_discovery=False)
    
@api_view(['GET'])
@permission_classes([AllowAny])
def stripe_reauth_token(request, uidb64, token):
    from urllib.parse import unquote, quote
    from django.utils.http import urlsafe_base64_decode
    from django.contrib.auth.tokens import default_token_generator
    
    try:
        # URL decode the parameters
        decoded_uidb64 = unquote(uidb64)
        decoded_token = unquote(token)
        
        uid = urlsafe_base64_decode(decoded_uidb64).decode()
        user = User.objects.get(pk=uid)
    except Exception as e:
        print(f"Error decoding user parameters: {e}")
        return Response({"error": "Invalid user ID"}, status=400)

    if not default_token_generator.check_token(user, decoded_token):
        return Response({"error": "Invalid or expired token"}, status=400)

    if not user.stripe_account_id:
        return Response({"error": "No Stripe account"}, status=400)

    try:
        # Use the current encoded parameters for the refresh URL
        encoded_uid = quote(uidb64, safe='')
        encoded_token = quote(token, safe='')
        
        account_link = stripe.AccountLink.create(
            account=user.stripe_account_id,
            refresh_url=f'{settings.FRONTEND_URL}/stripe-reauth/{encoded_uid}/{encoded_token}',
            return_url=f'{settings.FRONTEND_URL}/settings',
            type='account_onboarding',
        )
        
        print(f"Stripe account link created: {account_link.url}")
        return Response({'url': account_link.url})
        
    except Exception as e:
        print(f"Error creating Stripe account link: {e}")
        return Response({"error": "Failed to create Stripe onboarding link"}, status=500)
    
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

class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required"}, status=400)
        
        try:
            user = User.objects.get(email=email)
            if user.is_active:
                return Response({"message": "Account is already verified"}, status=400)
            
            # Generate new verification token and send email
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            domain = get_current_site(request).domain
            verify_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
            
            send_mail(
                "Verify your EGS Tutoring Account",
                f"Click the link to verify your account: {verify_url}",
                settings.DEFAULT_FROM_EMAIL,
                [user.email]
            )
            
            return Response({"message": "Verification email resent successfully"}, status=200)
            
        except User.DoesNotExist:
            # Don't reveal if email exists or not for security
            return Response({"message": "If the email exists, a verification email has been sent"}, status=200)

class AdminResendVerificationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only allow superusers/admins to use this endpoint
        if not request.user.is_superuser:
            return Response({"error": "Only administrators can resend verification emails"}, status=403)
        
        username = request.data.get("username")
        if not username:
            return Response({"error": "Username is required"}, status=400)
        
        try:
            user = User.objects.get(username=username)
            
            # Generate verification token and URL
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            verify_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
            
            # Send the appropriate email based on user role
            from playground.tasks import send_verification_email_async, send_tutor_welcome_email_async
            from kombu.exceptions import OperationalError
            
            try:
                if user.roles == 'tutor':
                    # For tutors, send the full welcome email with verification
                    # Try to get Stripe onboarding link if possible
                    onboarding_link = None
                    try:
                        from playground.tasks import create_stripe_account_async
                        stripe_result = create_stripe_account_async.apply(args=[user.id])
                        if stripe_result.successful() and stripe_result.result.get('success'):
                            onboarding_link = stripe_result.result.get('onboarding_link')
                    except:
                        pass  # Continue without Stripe link if it fails
                    
                    send_tutor_welcome_email_async.delay(user.id, verify_url, onboarding_link)
                else:
                    # For parents and students, send regular verification email
                    send_verification_email_async.delay(user.id, verify_url)
                    
            except OperationalError:
                # Fallback to direct email sending if Celery is unavailable
                from django.core.mail import send_mail
                
                if user.roles == 'tutor':
                    subject = 'Welcome to EGS Tutoring - Verify Your Account'
                    message = f"""Hello {user.firstName},

Welcome to EGS Tutoring! Please click the link below to verify your email address:

{verify_url}

Best regards,
EGS Tutoring Team"""
                elif user.roles == 'parent':
                    subject = 'Verify Your EGS Tutoring Account'
                    message = f"""Hello {user.firstName},

Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:

{verify_url}

📋 GETTING STARTED - PARENT ONBOARDING GUIDE:

Welcome to EGS Tutoring! Here's how to get started as a parent:

1. REGISTER YOUR CHILDREN
   Visit the registration page to create accounts for your children:
   {settings.FRONTEND_URL}/register

2. SUBMIT A TUTORING REQUEST
   Once verified, submit a request specifying your child's tutoring needs:
   {settings.FRONTEND_URL}/request

3. REVIEW TUTORING REPLIES
   Check and accept tutor responses to your requests:
   {settings.FRONTEND_URL}/request-reply

Additional Resources:
• Access your dashboard: {settings.FRONTEND_URL}/home
• View invoices and billing: {settings.FRONTEND_URL}/viewinvoices
• Manage your profile: {settings.FRONTEND_URL}/profile

Best regards,
EGS Tutoring Team"""
                else:
                    subject = 'Verify Your EGS Tutoring Account'
                    message = f"""Hello {user.firstName},

Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:

{verify_url}

Best regards,
EGS Tutoring Team"""
                
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
            
            return Response({
                "message": f"Verification email resent successfully to {user.email}",
                "user_role": user.roles,
                "user_name": f"{user.firstName} {user.lastName}",
                "username": user.username
            }, status=200)
            
        except User.DoesNotExist:
            return Response({"error": "User with this username not found"}, status=404)
        except Exception as e:
            return Response({"error": f"Failed to resend verification email: {str(e)}"}, status=500)

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
            responseHours = HoursSerializer(hours, many=True, context={'request': request}).data
            
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
            announcement = serializer.save()
            
            # Copy announcement image to frontend public directory
            if announcement.image:
                try:
                    # Get the full file path
                    file_path = announcement.image.path
                    # Extract filename
                    filename = os.path.basename(file_path)
                    # Copy to frontend public directory
                    copy_to_frontend_public(file_path, f"announcements/{filename}")
                except Exception as e:
                    print(f"Failed to copy announcement image to frontend: {e}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MonthlyReportCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Create or update a monthly report for a tutor-student pair"""
        from datetime import datetime, timedelta

        data = request.data.copy()
        data['tutor'] = request.user.id

        # Validate minimum hours (4+ hours required)
        student_id = data.get('student')
        month = int(data.get('month'))
        year = int(data.get('year'))

        # Calculate date range for the month
        start_date = datetime(year, month, 1).date()
        if month == 12:
            end_date = datetime(year + 1, 1, 1).date()
        else:
            end_date = datetime(year, month + 1, 1).date()

        # Get total hours for validation
        hours = Hours.objects.filter(
            tutor_id=request.user.id,
            student_id=student_id,
            date__gte=start_date,
            date__lt=end_date,
            status='Accepted'
        )
        total_hours = hours.aggregate(total=Sum('totalTime'))['total'] or 0

        if total_hours < 4:
            return Response(
                {"error": f"Insufficient hours. Need 4+ hours, but only {total_hours} hours logged."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if report already exists
        try:
            existing_report = MonthlyReport.objects.get(
                tutor_id=request.user.id,
                student_id=student_id,
                month=month,
                year=year
            )
            # Update existing report
            data['status'] = 'submitted'
            data['submitted_at'] = timezone.now()
            serializer = MonthlyReportSerializer(existing_report, data=data, partial=False)
        except MonthlyReport.DoesNotExist:
            # Create new report
            data['status'] = 'submitted'
            data['submitted_at'] = timezone.now()
            # Calculate due date (1st of next month)
            if month == 12:
                due_date = datetime(year + 1, 1, 1).date()
            else:
                due_date = datetime(year, month + 1, 1).date()
            data['due_date'] = due_date
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
                'eligible_for_report': total_hours >= 4,
                'sessions_count': hours.count(),
                'month': month,
                'year': year
            })
            
        except ValueError:
            return Response({"error": "Invalid month or year"}, status=status.HTTP_400_BAD_REQUEST)


class TutorStudentsReportStatusView(APIView):
    """Get all students for a tutor with their monthly report statuses"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from datetime import datetime
        from dateutil.relativedelta import relativedelta

        tutor = request.user
        if tutor.roles != 'tutor':
            return Response({"error": "Only tutors can access this endpoint"}, status=status.HTTP_403_FORBIDDEN)

        # Get the previous month (reports are due for previous month on the 1st)
        today = datetime.now().date()
        previous_month_date = today - relativedelta(months=1)
        target_month = previous_month_date.month
        target_year = previous_month_date.year

        # Get all students for this tutor
        from .models import AcceptedTutor
        accepted_tutors = AcceptedTutor.objects.filter(tutor=tutor, status='Accepted').select_related('student')

        students_data = []
        for at in accepted_tutors:
            student = at.student

            # Calculate date range for the previous month
            start_date = datetime(target_year, target_month, 1).date()
            if target_month == 12:
                end_date = datetime(target_year + 1, 1, 1).date()
            else:
                end_date = datetime(target_year, target_month + 1, 1).date()

            # Get total hours for this student in the previous month
            hours = Hours.objects.filter(
                tutor=tutor,
                student=student,
                date__gte=start_date,
                date__lt=end_date,
                status='Accepted'
            )
            total_hours = hours.aggregate(total=Sum('totalTime'))['total'] or 0

            # Check if report exists
            try:
                report = MonthlyReport.objects.get(
                    tutor=tutor,
                    student=student,
                    month=target_month,
                    year=target_year
                )
                report_status = report.status
                report_id = report.id
            except MonthlyReport.DoesNotExist:
                # Report is needed if 4+ hours
                if total_hours >= 4:
                    report_status = 'pending'
                else:
                    report_status = 'not_required'
                report_id = None

            students_data.append({
                'student_id': student.id,
                'student_name': f"{student.firstName} {student.lastName}",
                'student_username': student.username,
                'hours_logged': float(total_hours),
                'report_month': target_month,
                'report_year': target_year,
                'report_status': report_status,
                'report_id': report_id,
                'requires_report': total_hours >= 4
            })

        return Response({
            'students': students_data,
            'target_month': target_month,
            'target_year': target_year,
            'month_name': datetime(target_year, target_month, 1).strftime('%B %Y')
        })


class AnnouncementListView(APIView):
    permission_classes=[AllowAny]
    def get(self, request):
        user_id = request.query_params.get('id', None)
        user_role = None
        try:
            user_role = User.objects.get(id=user_id).roles
        except User.DoesNotExist:
            user_role = None

        # Get all announcements first
        all_announcements = Announcements.objects.all().order_by('-created_at')[:20]  # Get more to filter

        # Filter announcements based on user role using the model method
        visible_announcements = []
        for announcement in all_announcements:
            if announcement.is_visible_to_role(user_role or 'guest'):
                visible_announcements.append(announcement)
                if len(visible_announcements) >= 7:  # Limit to 7 results
                    break

        serializer = AnnouncementSerializer(visible_announcements, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PopupCreateView(APIView):
    """Admin-only view to create popups"""
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, format=None):
        # Check if user is admin
        if not request.user.is_superuser:
            return Response(
                {"error": "Only administrators can create popups."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = PopupSerializer(data=request.data)
        if serializer.is_valid():
            # Deactivate all existing active popups before creating the new one
            # This ensures only one popup is active at a time
            Popup.objects.filter(is_active=True).update(is_active=False)

            popup = serializer.save()

            # Copy popup image to frontend public directory
            if popup.image:
                try:
                    # Get the full file path
                    file_path = popup.image.path
                    # Extract filename
                    filename = os.path.basename(file_path)
                    # Copy to frontend public directory
                    copy_to_frontend_public(file_path, f"popups/{filename}")
                except Exception as e:
                    print(f"Failed to copy popup image to frontend: {e}")

            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PopupListView(APIView):
    """Get active popups for a user that they haven't dismissed"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        user_role = user.roles

        # Get all active popups
        active_popups = Popup.objects.filter(is_active=True).order_by('-created_at')

        # Filter by expiration date
        now = timezone.now()
        active_popups = active_popups.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=now)
        )

        # Filter by user role
        visible_popups = []
        for popup in active_popups:
            if popup.is_visible_to_role(user_role):
                # Check if user has dismissed this popup
                has_dismissed = PopupDismissal.objects.filter(
                    popup=popup,
                    user=user
                ).exists()

                if not has_dismissed:
                    visible_popups.append(popup)

        serializer = PopupSerializer(visible_popups, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PopupDismissView(APIView):
    """Mark a popup as dismissed for the current user"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        popup_id = request.data.get('popup_id')

        if not popup_id:
            return Response(
                {"error": "popup_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            popup = Popup.objects.get(id=popup_id)
        except Popup.DoesNotExist:
            return Response(
                {"error": "Popup not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Create dismissal record (unique constraint prevents duplicates)
        dismissal, created = PopupDismissal.objects.get_or_create(
            popup=popup,
            user=request.user
        )

        if created:
            serializer = PopupDismissalSerializer(dismissal)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {"message": "Popup already dismissed"},
                status=status.HTTP_200_OK
            )


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

            # Send referral email asynchronously to receiver
            from playground.tasks import send_referral_email_async
            send_referral_email_async.delay(
                sender_user.firstName,
                sender_user.email,
                receiver_email
            )

            # Send notification to admin
            from playground.email_backends import send_admin_referral_notification
            try:
                admin_email = settings.ADMIN_EMAIL if hasattr(settings, 'ADMIN_EMAIL') else 'egstutor@gmail.com'
                send_admin_referral_notification(
                    admin_email,
                    f"{sender_user.firstName} {sender_user.lastName}",
                    sender_user.email,
                    receiver_email
                )
            except Exception as e:
                logger.error(f"Failed to send admin notification for referral: {e}")

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


class AdminReferralListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Check if user is superadmin
        if not request.user.is_authenticated or not request.user.is_superuser:
            return Response({"error": "Unauthorized - Admin access only"}, status=403)

        try:
            # Get all referrals with additional info
            referrals = Referral.objects.all().order_by('-created_at')

            referral_data = []
            for ref in referrals:
                data = {
                    'id': ref.id,
                    'referrer_name': f"{ref.referrer.firstName} {ref.referrer.lastName}" if ref.referrer else None,
                    'referrer_email': ref.referrer.email if ref.referrer else None,
                    'referred_name': f"{ref.referred.firstName} {ref.referred.lastName}" if ref.referred else None,
                    'referred_email': ref.referred.email if ref.referred else None,
                    'prospective_email': ref.prospective_email,
                    'created_at': ref.created_at,
                    'reward_applied': ref.reward_applied,
                }
                referral_data.append(data)

            return Response(referral_data, status=200)
        except Exception as e:
            logger.error(f"Error fetching all referrals: {e}")
            return Response({"error": str(e)}, status=500)     

class RequestListCreateView(generics.ListCreateAPIView):
    serializer_class = RequestSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        # Check if a tutor_code was provided in the request
        tutor_code = request.data.get('tutor_code')

        if tutor_code:
            # Handle tutor referral - create TutoringRequest AND TutorReferralRequest
            try:
                # Find the tutor with this referral code
                tutor = User.objects.get(tutor_referral_code=tutor_code.upper(), roles='tutor')

                # Generate unique token for approval link
                import secrets
                token = secrets.token_urlsafe(32)

                parent = User.objects.get(id=request.data.get('parent'))
                student = User.objects.get(id=request.data.get('student'))

                # FIRST: Create the TutoringRequest
                from playground.models import TutoringRequest, TutorReferralRequest

                tutoring_request = TutoringRequest.objects.create(
                    parent=parent,
                    student=student,
                    subject=request.data.get('subject'),
                    grade=request.data.get('grade'),
                    service=request.data.get('service'),
                    city=request.data.get('city'),
                    description=request.data.get('description'),
                    is_accepted='Not Accepted'  # Will be changed to Accepted if tutor accepts
                )

                # SECOND: Create TutorReferralRequest linked to the TutoringRequest
                referral_request = TutorReferralRequest.objects.create(
                    parent=parent,
                    student=student,
                    tutor=tutor,
                    subject=request.data.get('subject'),
                    grade=request.data.get('grade'),
                    service=request.data.get('service'),
                    city=request.data.get('city'),
                    description=request.data.get('description'),
                    referral_code_used=tutor_code.upper(),
                    status='pending',
                    token=token,
                    tutoring_request=tutoring_request  # Link to the TutoringRequest
                )

                # Send email notification to tutor with approval link
                try:
                    from playground.email_utils import send_mailgun_email
                    from django.conf import settings

                    if tutor.email:
                        # Create approval URL
                        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
                        approval_url = f"{frontend_url}/tutor-referral-approval/{token}"

                        subject = f"New Referral Request: {student.firstName} {student.lastName}"

                        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #192A88 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #192A88; border-radius: 5px; }}
        .button {{ display: inline-block; padding: 15px 30px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>New Referral Request!</h1>
        </div>
        <div class="content">
            <p>Dear {tutor.firstName},</p>
            <p>Great news! A parent has requested you as their tutor using your referral code!</p>

            <div class="info-box">
                <h3>Parent Information</h3>
                <p><strong>Name:</strong> {parent.firstName} {parent.lastName}<br>
                <strong>Email:</strong> {parent.email}</p>
            </div>

            <div class="info-box">
                <h3>Student Information</h3>
                <p><strong>Name:</strong> {student.firstName} {student.lastName}<br>
                <strong>Grade:</strong> {referral_request.grade}</p>
            </div>

            <div class="info-box">
                <h3>Tutoring Details</h3>
                <p><strong>Subject:</strong> {referral_request.subject}<br>
                <strong>Service Type:</strong> {referral_request.service}<br>
                <strong>City:</strong> {referral_request.city}</p>
                {f'<p><strong>Additional Details:</strong> {referral_request.description}</p>' if referral_request.description else ''}
            </div>

            <div style="text-align: center;">
                <a href="{approval_url}" class="button">Review and Respond</a>
            </div>

            <p style="margin-top: 20px; font-size: 14px; color: #666;">
                You can either accept or decline this request. If you accept, you will be paired with this student.
                If you decline, the request will be made available to other tutors.
            </p>
        </div>
        <div class="footer">
            <p>Best regards,<br>The EGS Tutoring Team</p>
        </div>
    </div>
</body>
</html>
                        """

                        # Plain text version for email clients that don't support HTML
                        text_message = f"""
Dear {tutor.firstName},

Great news! A parent has requested you as their tutor using your referral code!

Parent Information:
Name: {parent.firstName} {parent.lastName}
Email: {parent.email}

Student Information:
Name: {student.firstName} {student.lastName}
Grade: {referral_request.grade}

Tutoring Details:
Subject: {referral_request.subject}
Service Type: {referral_request.service}
City: {referral_request.city}
{f'Additional Details: {referral_request.description}' if referral_request.description else ''}

Please review this request and respond:
{approval_url}

You can either accept or decline this request. If you accept, you will be paired with this student.
If you decline, the request will be made available to other tutors.

Best regards,
The EGS Tutoring Team
                        """

                        send_mailgun_email(
                            to_emails=[tutor.email],
                            subject=subject,
                            text_content=text_message.strip(),
                            html_content=html_message
                        )
                        print(f"Sent referral notification email to tutor: {tutor.email}")
                except Exception as e:
                    print(f"Failed to send tutor notification email: {e}")

                # Send confirmation email to parent
                try:
                    from playground.email_utils import send_mailgun_email
                    from django.conf import settings

                    tutor_name = f"{tutor.firstName} {tutor.lastName}"

                    if parent.email:
                        subject = f"Referral Request Sent to {tutor_name}"

                        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #192A88 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #192A88; border-radius: 5px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Request Sent Successfully!</h1>
        </div>
        <div class="content">
            <p>Dear {parent.firstName} {parent.lastName},</p>
            <p>Your tutoring request for <strong>{student.firstName} {student.lastName}</strong> has been sent to <strong>{tutor_name}</strong>.</p>

            <div class="info-box">
                <h3>What Happens Next?</h3>
                <p>We've notified {tutor_name} about your request. They will review it and respond shortly.
                You'll receive an email notification once they respond.</p>
                <p>If {tutor_name} declines, your request will automatically be made available to all our tutors.</p>
            </div>

            <div class="info-box">
                <h3>Request Summary</h3>
                <p><strong>Subject:</strong> {referral_request.subject}<br>
                <strong>Grade:</strong> {referral_request.grade}<br>
                <strong>Service Type:</strong> {referral_request.service}</p>
            </div>
        </div>
        <div class="footer">
            <p>Best regards,<br>The EGS Tutoring Team</p>
        </div>
    </div>
</body>
</html>
                        """

                        # Plain text version for email clients that don't support HTML
                        text_message = f"""
Dear {parent.firstName} {parent.lastName},

Your tutoring request for {student.firstName} {student.lastName} has been sent to {tutor_name}.

What Happens Next?
We've notified {tutor_name} about your request. They will review it and respond shortly.
You'll receive an email notification once they respond.

If {tutor_name} declines, your request will automatically be made available to all our tutors.

Request Summary:
Subject: {referral_request.subject}
Grade: {referral_request.grade}
Service Type: {referral_request.service}

Best regards,
The EGS Tutoring Team
                        """

                        send_mailgun_email(
                            to_emails=[parent.email],
                            subject=subject,
                            text_content=text_message.strip(),
                            html_content=html_message
                        )
                        print(f"Sent confirmation email to parent: {parent.email}")
                except Exception as e:
                    print(f"Failed to send parent confirmation email: {e}")

                # Return success response
                from playground.serializers import TutorReferralRequestSerializer
                serializer = TutorReferralRequestSerializer(referral_request)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            except User.DoesNotExist:
                # Invalid tutor code, proceed with normal request creation
                print(f"Invalid tutor code: {tutor_code}")
                pass
            except Exception as e:
                print(f"Error creating referral request: {e}")
                # Proceed with normal request creation on any error
                pass

        # Normal request creation (no tutor code or invalid code)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        # Normal request creation
        request_obj = serializer.save()

        # Send email notifications to tutors about new requests
        try:
            from playground.tasks import send_new_request_notification_async

            # Get all tutors who have email notifications enabled
            tutors_with_notifications = User.objects.filter(
                roles='tutor',
                email_notifications_enabled=True,
                email_new_requests=True,
                email__isnull=False
            ).exclude(email='')

            if tutors_with_notifications.exists():
                tutor_emails = list(tutors_with_notifications.values_list('email', flat=True))
                parent_name = f"{request_obj.parent.firstName} {request_obj.parent.lastName}"
                student_name = f"{request_obj.student.firstName} {request_obj.student.lastName}"

                send_new_request_notification_async.delay(
                    tutor_emails,
                    parent_name,
                    student_name,
                    request_obj.subject,
                    request_obj.grade,
                    request_obj.service,
                    request_obj.city
                )
        except Exception as e:
            print(f"Failed to send new request notifications: {e}")
            pass

       
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

        if parent_email and parent.email_notifications_enabled and parent.email_replies:
            # Send enhanced reply notification email asynchronously
            try:
                from playground.tasks import send_tutor_reply_notification_async
                tutor_name = f"{reply.tutor.firstName} {reply.tutor.lastName}"
                
                # Get document file paths for email attachments
                document_paths = []
                for doc in reply.tutor.documents.all():
                    # Get the actual file path, not URL
                    if doc.file:
                        document_paths.append(doc.file.name)
                
                send_tutor_reply_notification_async.delay(
                    parent_email, 
                    tutor_name, 
                    reply.request.subject,
                    reply.message,
                    document_paths if document_paths else None
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


class StudentCreateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        # Only parents can create students
        if request.user.roles != 'parent':
            return Response({"error": "Only parents can create student accounts."}, status=403)

        # Extract data from request
        first_name = request.data.get('firstName', '').strip()
        last_name = request.data.get('lastName', '').strip()
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        profile_picture = request.FILES.get('profile_picture', None)

        # Validation
        if not first_name or not last_name:
            return Response({"error": "First name and last name are required."}, status=400)

        if not username or len(username) < 3:
            return Response({"error": "Username must be at least 3 characters."}, status=400)

        if not password or len(password) < 6:
            return Response({"error": "Password must be at least 6 characters."}, status=400)

        # Check username uniqueness
        if User.objects.filter(username=username).exists():
            return Response({"error": "Username already exists. Please choose another."}, status=400)

        try:
            # Create student account with parent's information auto-filled
            student = User.objects.create_user(
                username=username,
                password=password,
                firstName=first_name,
                lastName=last_name,
                roles='student',
                parent=request.user,
                # Auto-fill from parent
                address=request.user.address,
                city=request.user.city,
                phone_number=request.user.phone_number,
                email='',  # Email is not unique, so leave blank for students
                is_active=True,  # Students created by parents are immediately active
            )

            # Handle profile picture if provided
            if profile_picture:
                student.profile_picture = profile_picture
                student.save()

            # Set default rates for student (should be 0)
            student.set_default_rates_by_role()
            student.save()

            # Send confirmation email to parent
            try:
                from playground.tasks import send_student_creation_confirmation_async
                parent_name = f"{request.user.firstName} {request.user.lastName}"
                student_name = f"{first_name} {last_name}"
                send_student_creation_confirmation_async.delay(
                    request.user.email,
                    parent_name,
                    student_name
                )
            except Exception as email_error:
                # Log the error but don't fail the student creation
                logger.error(f"Failed to send student creation confirmation email: {email_error}")

            return Response({
                "message": "Student created successfully!",
                "student": {
                    "id": student.id,
                    "username": student.username,
                    "firstName": student.firstName,
                    "lastName": student.lastName,
                }
            }, status=201)

        except Exception as e:
            logger.error(f"Error creating student: {e}")
            return Response({"error": f"Failed to create student: {str(e)}"}, status=500)


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
        # Accept both 'id' and 'parent' parameter names for compatibility
        parent_id = request.query_params.get('id', None) or request.query_params.get('parent', None)
        if not parent_id:
            return Response({"error": "Missing 'parent_id' or 'parent' query parameter."}, status=400)

        # Get all requests for this parent
        request_qs = TutoringRequest.objects.filter(
            parent=parent_id
        ).order_by('-created_at')

        # Filter out tutor-specific requests that are still pending
        # (waiting for tutor to accept/decline via email)
        # Only show if: no referral_request OR referral_request status is 'declined' or 'accepted'
        filtered_requests = []
        for tutoring_request in request_qs:
            # Check if this request has a related tutor referral request
            referral_request = TutorReferralRequest.objects.filter(
                tutoring_request=tutoring_request
            ).first()

            if referral_request is None:
                # Regular request (not tutor-specific) - always show
                filtered_requests.append(tutoring_request)
            elif referral_request.status != 'pending':
                # Tutor-specific request where tutor has responded - show it
                # (Either 'declined' so parent can see rejection, or 'accepted' meaning it's linked)
                filtered_requests.append(tutoring_request)
            # If status is 'pending', don't add to filtered_requests (hide from parent)

        serializer = RequestSerializer(filtered_requests, many=True)
        return Response(serializer.data)
    
    def delete(self, request):
        """Delete a tutoring request (only by the parent who created it)"""
        request_id = request.query_params.get('request_id', None)
        parent_id = request.query_params.get('parent_id', None)
        
        if not request_id or not parent_id:
            return Response({"error": "Missing 'request_id' or 'parent_id' query parameter."}, status=400)

        try:
            # Find the request and verify it belongs to this parent
            tutoring_request = TutoringRequest.objects.get(
                id=request_id,
                parent=parent_id
            )
            
            # Delete related data first to avoid foreign key constraints
            # Delete tutor responses first
            TutorResponse.objects.filter(request=tutoring_request).delete()
            
            # Delete accepted tutors relationships
            AcceptedTutor.objects.filter(request=tutoring_request).delete()
            
            # Finally delete the request itself
            tutoring_request.delete()
            
            return Response({"success": "Request deleted successfully"}, status=200)
            
        except TutoringRequest.DoesNotExist:
            return Response({"error": "Request not found or you don't have permission to delete it"}, status=404)
        except Exception as e:
            return Response({"error": f"Failed to delete request: {str(e)}"}, status=500)


class ReplyListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id = request.query_params.get('parent', None)
        tutoring_request_id = request.query_params.get('selectedRequestID')

        # Allow admins to view replies for any request without parent check
        is_admin = request.user.is_authenticated and (request.user.is_superuser or request.user.roles == 'admin')

        if not is_admin and not parent_id:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        # Build the filter query
        filter_kwargs = {
            'request__id': tutoring_request_id,
            'rejected': False
        }

        # Only filter by parent if not admin
        if not is_admin:
            filter_kwargs['request__parent'] = parent_id

        replies = TutorResponse.objects.filter(**filter_kwargs)
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
    def post(self, request, *args, **kwargs):
        data = request.data.copy()  # QueryDict is immutable
        student_id = data.get("student_id")
        if not student_id:
            raise ValidationError("Missing 'student_id' field")

        student = User.objects.get(pk=student_id)
        parent = student.parent_id

        if not parent:
            raise ValidationError("Student does not have an associated parent. Please contact admin to link a parent account.")

        # Handle date and time fields
        date_str = data.get("date")
        start_time_str = data.get("start_time")
        end_time_str = data.get("end_time")
        
        if not date_str:
            raise ValidationError("Missing 'date' field")
        if not start_time_str:
            raise ValidationError("Missing 'start_time' field")
        if not end_time_str:
            raise ValidationError("Missing 'end_time' field")
            
        # Parse date and time for validation
        try:
            from datetime import datetime
            session_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
            end_time = datetime.strptime(end_time_str, "%H:%M").time()
            
            # Create full datetime for future time validation
            session_start_datetime = datetime.combine(session_date, start_time)
            session_end_datetime = datetime.combine(session_date, end_time)
            
        except ValueError as e:
            raise ValidationError(f"Invalid date/time format: {e}")

        # Get current time in local timezone
        now_local = now().astimezone(TZ)
        current_date = now_local.date()
        current_datetime = now_local.replace(tzinfo=None)
        
        # Validation 1: Cannot log hours in the future
        if session_start_datetime > current_datetime:
            raise ValidationError("Cannot log hours for future dates/times")
        
        if session_end_datetime > current_datetime:
            raise ValidationError("Cannot log hours that end in the future")
        
        # Validation 2: Can only log hours within current week (Monday to Sunday)
        cur_ws = week_start(current_date)  # Monday of current week
        cur_we = cur_ws + timedelta(days=6)  # Sunday of current week
        
        # Debug logging
        print(f"Current date: {current_date}")
        print(f"Session date: {session_date}")
        print(f"Current week start (Monday): {cur_ws}")
        print(f"Current week end (Sunday): {cur_we}")
        print(f"Is session date in range? {cur_ws <= session_date <= cur_we}")
        
        if not (cur_ws <= session_date <= cur_we):
            raise ValidationError(f"Can only log hours for the current week (Monday {cur_ws.strftime('%Y-%m-%d')} to Sunday {cur_we.strftime('%Y-%m-%d')}). You tried to log for {session_date.strftime('%Y-%m-%d')}.")
        
        # Validation 3: Check for duplicate hours
        tutor_id = data.get("tutor")
        existing_hours = Hours.objects.filter(
            tutor=tutor_id,
            student=student_id,
            date=date_str,
            startTime=start_time_str,
            endTime=end_time_str
        )
        
        if existing_hours.exists():
            raise ValidationError("Hours already logged for this tutor, student, date, and time slot")

        # Set eligibility status based on current week
        is_eligible = cur_ws <= session_date <= cur_we
        eligible_status = "Eligible" if is_eligible else "Late"
            
        data.update({
            "parent": parent,
            "student": student_id,
            "eligible": eligible_status,
            "date": date_str,
            "startTime": start_time_str,
            "endTime": end_time_str
        })

        serializer = self.serializer_class(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=201)
    
@receiver(post_save, sender=Hours)
def maybe_issue_referral_credit(sender, instance, created, **kwargs):
    if instance.status not in ("Accepted", "accepted"):
        return                              
    try:
        ref = (Referral.objects
               .select_for_update()         # lock row, prevent races
               .get(referred=instance.student.parent,
                    reward_applied=False))
    except Referral.DoesNotExist:
        return
    total = (Hours.objects
             .filter(student=instance.student,
                     status__in=("Accepted"))
             .aggregate(Sum("totalTime"))
             .get("totalTime__sum") or 0)

    if total < 4:
        return                              # threshold not met yet

    # ---- issue $65 credit exactly once ----
    stripe.Customer.create_balance_transaction(
        customer   = ref.referrer.stripe_account_id,
        amount     = -6500,                 # –$65 CAD credit
        currency   = "cad",
        description= "Referral reward – $65",
        idempotency_key=f"referral-{ref.id}"
    )

    ref.reward_applied = True
    ref.reward_date  = now()
    ref.credit_amount = 65.00
    ref.save(update_fields=["reward_applied", "reward_date", "credit_amount"])

    # Send congratulations email
    try:
        from playground.email_backends import send_referral_congratulations_email
        send_referral_congratulations_email(
            user_email=ref.referrer.email,
            user_name=ref.referrer.firstName,
            referral_amount=65.00
        )
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to send referral congratulations email: {e}")

    
class ParentHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = request.query_params.get("id")
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=404)
        
        # Filter hours based on user role
        if user.roles == 'parent':
            records = Hours.objects.filter(parent=user).order_by('-created_at')
        elif user.roles == 'student':
            records = Hours.objects.filter(student=user).order_by('-created_at')
        elif user.roles == 'tutor':
            records = Hours.objects.filter(tutor=user).order_by('-created_at')
        else:
            records = Hours.objects.none()  # Return empty queryset for unknown roles
            
        serializer = HoursSerializer(records, many=True, context={'request': request})
        return Response(serializer.data)

class EditHoursView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, hour_id):
        try:
            hour = Hours.objects.get(id=hour_id)
            
            # Only tutors can edit their own hours
            if request.user != hour.tutor:
                return Response({"detail": "Only the tutor can edit this hour record"}, status=403)
            
            # Store original values for edit history
            original_data = {
                'date': str(hour.date),
                'startTime': str(hour.startTime),
                'endTime': str(hour.endTime),
                'totalTime': str(hour.totalTime),
                'location': hour.location,
                'subject': hour.subject,
                'notes': hour.notes
            }
            
            # Update the hour record
            data = request.data.copy()
            edit_history = hour.edit_history or {}
            
            # Track changes
            for field in ['date', 'startTime', 'endTime', 'totalTime', 'location', 'subject', 'notes']:
                if field in data and str(data[field]) != original_data[field]:
                    edit_history[field] = {
                        'old': original_data[field],
                        'new': str(data[field]),
                        'timestamp': timezone.now().isoformat()
                    }
            
            # Apply updates
            for field, value in data.items():
                if hasattr(hour, field):
                    setattr(hour, field, value)
            
            hour.edit_history = edit_history
            hour.edited_at = timezone.now()
            hour.save()
            
            return Response({"detail": "Hours updated successfully"}, status=200)
            
        except Hours.DoesNotExist:
            return Response({"detail": "Hour record not found"}, status=404)
        except Exception as e:
            return Response({"detail": f"Error updating hours: {str(e)}"}, status=400)
    
    def delete(self, request, hour_id):
        try:
            hour = Hours.objects.get(id=hour_id)
            
            # Only tutors can delete their own hours
            if request.user != hour.tutor:
                return Response({"detail": "Only the tutor can delete this hour record"}, status=403)
            
            hour.delete()
            return Response({"detail": "Hours deleted successfully"}, status=200)
            
        except Hours.DoesNotExist:
            return Response({"detail": "Hour record not found"}, status=404)
        except Exception as e:
            return Response({"detail": f"Error deleting hours: {str(e)}"}, status=400)

class TutorReplyView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, hour_id):
        try:
            hour = Hours.objects.get(id=hour_id)
            
            # Only tutors can add replies to their own disputed hours
            if request.user != hour.tutor:
                return Response({"detail": "Only the tutor can reply to this dispute"}, status=403)
                
            if hour.status != "Disputed":
                return Response({"detail": "Can only reply to disputed hours"}, status=400)
            
            tutor_reply = request.data.get('tutor_reply', '').strip()
            if not tutor_reply:
                return Response({"detail": "Reply message is required"}, status=400)
            
            hour.tutor_reply = tutor_reply
            hour.save()
            
            return Response({"detail": "Reply submitted successfully"}, status=200)
            
        except Hours.DoesNotExist:
            return Response({"detail": "Hour record not found"}, status=404)
        except Exception as e:
            return Response({"detail": f"Error submitting reply: {str(e)}"}, status=400)

class DisputeHours(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        dispute_id = request.data.get('eventId')
        email = request.data.get('email')
        dispute_message = request.data.get('message')

        try:
            hour_record = Hours.objects.get(id=dispute_id)
            hour_record.status = 'Disputed'
            hour_record.save()
            
            # Send dispute email to parent asynchronously
            from playground.tasks import send_dispute_email_async, send_tutor_dispute_notification_async
            admin_emails = [settings.ADMIN_EMAIL]
            send_dispute_email_async.delay(admin_emails, email, f"Hours ID: {dispute_id}")
            
            # Send notification to tutor
            tutor_email = hour_record.tutor.email
            tutor_name = f"{hour_record.tutor.firstName} {hour_record.tutor.lastName}"
            student_name = f"{hour_record.student.firstName} {hour_record.student.lastName}"
            session_info = {
                'date': str(hour_record.date),
                'start_time': str(hour_record.startTime),
                'end_time': str(hour_record.endTime),
                'total_hours': str(hour_record.totalTime),
                'student_name': student_name
            }
            
            send_tutor_dispute_notification_async.delay(
                tutor_email, 
                tutor_name,
                session_info,
                settings.FRONTEND_URL
            )
            
            return Response("Status changed to 'Disputed' and notifications sent")
        except Hours.DoesNotExist:
            return Response({"error": "Hour record not found"}, status=404)
        except Exception as e:
            return Response({"error": str(e)}, status=500)

    def send_dispute_email(self, to_email):
        subject = "Dispute Received!"
        message = "Our team is currently reviewing your dispute. Thank you for bringing this to our attention."
        from_email = settings.DEFAULT_FROM_EMAIL
        send_mail(subject, message, from_email, [to_email])

class WeeklyHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        start_date_raw = request.query_params.get("start")
        end_date_raw = request.query_params.get("end")

        if not start_date_raw or not end_date_raw:
            return Response({"error": "start and end parameters are required"}, status=400)

        start_date = make_aware(datetime.strptime(start_date_raw, "%Y-%m-%d"))
        end_date = make_aware(datetime.strptime(end_date_raw, "%Y-%m-%d"))
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Fetch all unbilled hours (both Eligible and Late) to include admin-added hours
        # Late hours can only be created by admins via batch add
        weekly_hours = Hours.objects.filter(
            date__range=(start_date, end_date),
            eligible__in=['Eligible', 'Late'],
            invoice_status='pending'
        ).order_by('date')
        serializer = HoursSerializer(weekly_hours, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        print(f"WeeklyHoursListView.post called with data: {request.data}")
        entries = request.data
        created = False
        created_entries = []  # Track created entries for email notification

        try:
            for entry in entries:
                print(f"Processing entry: {entry}")

                parent_id = entry.get('parent')
                if not parent_id:
                    print(f"Skipping entry without parent ID: {entry}")
                    continue

                # Get parent user object
                try:
                    parent_user = User.objects.get(id=parent_id)
                except User.DoesNotExist:
                    print(f"Parent with ID {parent_id} does not exist")
                    continue

                # Convert date from string to date object
                from datetime import datetime
                try:
                    date_obj = datetime.strptime(entry.get('date'), '%Y-%m-%d').date()
                except (ValueError, TypeError) as e:
                    print(f"Date parsing error for entry {entry}: {e}")
                    continue

                # Check for both duplicates and overlaps
                # For WeeklyHours, we check if there's already a record for the same parent on the same date
                exists = WeeklyHours.objects.filter(
                    date=date_obj,
                    parent=parent_user
                ).exists()

                # Also check for potential overlaps within a date range (e.g., same week)
                from datetime import timedelta
                week_start = date_obj - timedelta(days=date_obj.weekday())
                week_end = week_start + timedelta(days=6)
                overlap_exists = WeeklyHours.objects.filter(
                    parent=parent_user,
                    date__range=[week_start, week_end]
                ).exists()

                if not exists and not overlap_exists:
                    WeeklyHours.objects.create(
                        date=date_obj,
                        parent=parent_user,
                        OnlineHours=entry.get('OnlineHours'),
                        InPersonHours=entry.get('InPersonHours'),
                        TotalBeforeTax=entry.get('TotalBeforeTax')
                    )
                    created = True
                    created_entries.append({
                        'parent': parent_user,
                        'date': date_obj,
                        'online_hours': entry.get('OnlineHours'),
                        'inperson_hours': entry.get('InPersonHours'),
                        'total': entry.get('TotalBeforeTax')
                    })
                    print(f"Created WeeklyHours for parent {parent_id}")
                elif exists:
                    print(f"WeeklyHours already exists for parent {parent_id} on {date_obj}")
                elif overlap_exists:
                    print(f"WeeklyHours overlap detected for parent {parent_id} in week {week_start} to {week_end}")

            # Send email notifications for all created entries
            if created_entries:
                self._send_weekly_hours_emails(created_entries)

        except Exception as e:
            print(f"Error in WeeklyHoursListView.post: {e}")
            return Response({"error": str(e)}, status=500)

        if created:
            return Response({"status": "created"}, status=201)
        else:
            return Response({"status": "Not Created, Duplicate"}, status=301)

    def _send_weekly_hours_emails(self, created_entries):
        """Send email notifications to parents with their weekly hours breakdown"""
        from .email_utils import send_mailgun_email
        from collections import defaultdict

        # Group entries by parent
        parent_entries = defaultdict(list)
        for entry in created_entries:
            parent_entries[entry['parent']].append(entry)

        # Send email to each parent
        for parent, entries in parent_entries.items():
            try:
                # Get all hours details for this parent within the date range
                date_obj = entries[0]['date']
                from datetime import timedelta
                week_start = date_obj - timedelta(days=date_obj.weekday())
                week_end = week_start + timedelta(days=6)

                # Fetch detailed hours for this parent within the week (only pending, not yet invoiced)
                # Include both Eligible and Late hours (Late hours are admin-added via batch add)
                hours_details = Hours.objects.filter(
                    parent=parent,
                    date__range=[week_start, week_end],
                    eligible__in=['Eligible', 'Late'],
                    invoice_status='pending'
                ).order_by('date', 'startTime')

                # Build email content
                subject = f"Weekly Tutoring Hours Summary - Week of {week_start.strftime('%B %d, %Y')}"

                # Build HTML content
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #192A88; border-bottom: 3px solid #FFB31B; padding-bottom: 10px;">
                            Weekly Tutoring Hours Summary
                        </h2>
                        <p>Dear {parent.firstName} {parent.lastName},</p>
                        <p>Here is your weekly tutoring hours summary for the week of <strong>{week_start.strftime('%B %d, %Y')}</strong> to <strong>{week_end.strftime('%B %d, %Y')}</strong>:</p>

                        <h3 style="color: #192A88; margin-top: 30px;">Session Details:</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr style="background-color: #192A88; color: white;">
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Student</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Tutor</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Hours</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Subject</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Location</th>
                                </tr>
                            </thead>
                            <tbody>
                """

                for hour in hours_details:
                    html_content += f"""
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.date.strftime('%b %d, %Y')}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.student.firstName} {hour.student.lastName}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.tutor.firstName} {hour.tutor.lastName}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.startTime.strftime('%I:%M %p')} - {hour.endTime.strftime('%I:%M %p')}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.totalTime}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.subject}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.location}</td>
                                </tr>
                    """

                # Summary totals
                total_online = sum(float(e['online_hours']) for e in entries)
                total_inperson = sum(float(e['inperson_hours']) for e in entries)
                total_cost = sum(float(e['total']) for e in entries)

                html_content += f"""
                            </tbody>
                        </table>

                        <h3 style="color: #192A88; margin-top: 30px;">Summary:</h3>
                        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; border-left: 4px solid #FFB31B;">
                            <p style="margin: 5px 0;"><strong>Online Hours:</strong> {total_online:.2f}</p>
                            <p style="margin: 5px 0;"><strong>In-Person Hours:</strong> {total_inperson:.2f}</p>
                            <p style="margin: 5px 0;"><strong>Total Hours:</strong> {total_online + total_inperson:.2f}</p>
                            <p style="margin: 5px 0; font-size: 1.1em;"><strong>Total Amount:</strong> <span style="color: #192A88;">${total_cost:.2f}</span></p>
                        </div>

                        <p style="margin-top: 30px;">If you have any questions or concerns about these hours, please don't hesitate to contact us.</p>

                        <p style="margin-top: 20px;">Best regards,<br>
                        <strong>EGS Tutoring Team</strong></p>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.85em; color: #666;">
                            <p>This is an automated notification from EGS Tutoring. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
                """

                # Plain text version
                text_content = f"""
Weekly Tutoring Hours Summary

Dear {parent.firstName} {parent.lastName},

Here is your weekly tutoring hours summary for the week of {week_start.strftime('%B %d, %Y')} to {week_end.strftime('%B %d, %Y')}:

Session Details:
"""
                for hour in hours_details:
                    text_content += f"\n- {hour.date.strftime('%b %d, %Y')}: {hour.student.firstName} {hour.student.lastName} with {hour.tutor.firstName} {hour.tutor.lastName}"
                    text_content += f"\n  Time: {hour.startTime.strftime('%I:%M %p')} - {hour.endTime.strftime('%I:%M %p')} ({hour.totalTime} hours)"
                    text_content += f"\n  Subject: {hour.subject} | Location: {hour.location}\n"

                text_content += f"""
Summary:
- Online Hours: {total_online:.2f}
- In-Person Hours: {total_inperson:.2f}
- Total Hours: {total_online + total_inperson:.2f}
- Total Amount: ${total_cost:.2f}

If you have any questions or concerns about these hours, please don't hesitate to contact us.

Best regards,
EGS Tutoring Team
                """

                # Send the email
                send_mailgun_email(
                    to_emails=[parent.email],
                    subject=subject,
                    text_content=text_content,
                    html_content=html_content
                )
                print(f"Weekly hours email sent to {parent.email}")

            except Exception as e:
                print(f"Error sending email to {parent.email}: {e}")

class calculateTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        start_date_raw = request.query_params.get("start")
        end_date_raw = request.query_params.get("end")

        if not start_date_raw or not end_date_raw:
            return Response({"error": "start and end parameters are required"}, status=400)

        start_date = make_aware(datetime.strptime(start_date_raw, "%Y-%m-%d"))
        end_date = make_aware(datetime.strptime(end_date_raw, "%Y-%m-%d"))
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        result_date = end_date.date()

        # Fetch all unbilled hours (both Eligible and Late) to include admin-added hours
        # Late hours can only be created by admins via batch add
        weekly_hours = Hours.objects.filter(
            date__range=(start_date, end_date),
            eligible__in=['Eligible', 'Late'],
            invoice_status='pending'
        )
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

            # Get parent name
            try:
                parent_user = User.objects.get(id=parent_id)
                parent_name = f"{parent_user.firstName} {parent_user.lastName}"
            except User.DoesNotExist:
                parent_name = f"Parent ID {parent_id}"

            results.append({
                "date": result_date,
                "parent": parent_id,
                "parent_name": parent_name,
                "OnlineHours": float(online_hours),
                "InPersonHours": float(inperson_hours),
                "TotalBeforeTax": float(total_before_tax),
            })

        return Response(results)

class CreateInvoiceView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        """Test endpoint to verify the view is accessible"""
        return Response({"message": "CreateInvoiceView is accessible", "methods": ["POST"]})

    def post(self, request):
        print(f"CreateInvoiceView.post called with params: {request.query_params}")
        
        # Import the async task
        try:
            from playground.tasks import bulk_invoice_generation_async
        except ImportError as e:
            print(f"Error importing bulk_invoice_generation_async: {e}")
            return Response({"error": f"Task import error: {str(e)}"}, status=500)
        
        # Use start/end parameters instead of currentDay
        start_date_raw = request.query_params.get('start')
        end_date_raw = request.query_params.get('end')
        
        if not start_date_raw or not end_date_raw:
            # Debug: Show what parameters were actually sent
            return Response({
                "error": "Missing 'start' and 'end' query parameters", 
                "received_query_params": dict(request.query_params),
                "received_data": dict(request.data)
            }, status=400)

        try:
            start_date = make_aware(datetime.strptime(start_date_raw, "%Y-%m-%d"))
            end_date = make_aware(datetime.strptime(end_date_raw, "%Y-%m-%d"))
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        except ValueError:
            return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        # Calculate totals from actual hours data (same logic as calculateTotal view)
        # Include both Eligible and Late hours (Late hours are admin-added via batch add)
        # Only include hours that haven't been invoiced yet to prevent duplicates
        weekly_hours = Hours.objects.filter(
            date__range=(start_date, end_date),
            eligible__in=['Eligible', 'Late'],
            invoice_status='pending'
        )
        parents = set(weekly_hours.values_list('parent', flat=True))

        rate_data = User.objects.filter(id__in=parents, roles='parent', is_active=True).values('id', 'rateOnline', 'rateInPerson', 'email')
        print(f"Rate data query result: {list(rate_data)}")
        
        online_rate_dict = {item['id']: Decimal(item['rateOnline'] or 0) for item in rate_data}
        inperson_rate_dict = {item['id']: Decimal(item['rateInPerson'] or 0) for item in rate_data}
        parent_email_dict = {item['id']: item['email'] for item in rate_data}
        
        print(f"Online rate dict: {online_rate_dict}")
        print(f"In-person rate dict: {inperson_rate_dict}")

        customer_data_list = []
        for parent_id in parents:
            parent_hours = weekly_hours.filter(parent_id=parent_id)
            online_hours = Decimal(parent_hours.filter(location='Online').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)
            inperson_hours = Decimal(parent_hours.filter(location='In-Person').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)

            # Debug logging for rates and hours
            online_rate = online_rate_dict.get(parent_id, Decimal('0'))
            inperson_rate = inperson_rate_dict.get(parent_id, Decimal('0'))
            print(f"Parent {parent_id}: Online hours: {online_hours}, rate: ${online_rate}")
            print(f"Parent {parent_id}: In-person hours: {inperson_hours}, rate: ${inperson_rate}")
            
            total_online = online_hours * online_rate
            total_inperson = inperson_hours * inperson_rate
            total_before_tax = total_online + total_inperson
            
            print(f"Parent {parent_id}: Total online: ${total_online}, total in-person: ${total_inperson}, total: ${total_before_tax}")
            
            # Only create invoice if there's an amount to charge
            if total_before_tax > 0:
                email_str = parent_email_dict.get(parent_id)
                if email_str:
                    # Find or create stripe customer by email
                    result = stripe.Customer.list(email=email_str)
                    if result and result.data:
                        customer = result.data[0]
                    else:
                        # Auto-create Stripe customer if it doesn't exist
                        try:
                            parent_user = User.objects.get(id=parent_id)
                            customer = stripe.Customer.create(
                                email=email_str,
                                name=f"{parent_user.firstName} {parent_user.lastName}",
                                description=f"Parent account for tutoring services"
                            )
                            print(f"Created Stripe customer {customer.id} for {email_str}")
                        except Exception as e:
                            print(f"Error creating Stripe customer for {email_str}: {e}")
                            continue  # Skip this parent if customer creation fails
                    
                    # Convert amount to cents as integer (Stripe expects cents)
                    amount_cents = int(total_before_tax * 100)
                    
                    # Get hour IDs for this parent to update after invoice is sent
                    parent_hour_ids = list(parent_hours.values_list('id', flat=True))
                    
                    # Debug logging to ensure correct amounts
                    print(f"Parent {parent_id}: ${total_before_tax:.2f} = {amount_cents} cents")
                    
                    customer_data_list.append({
                        'customer_id': customer.id,
                        'amount': amount_cents,
                        'description': f'Tutoring Sessions ({start_date_raw} to {end_date_raw})',
                        'hour_ids': parent_hour_ids  # Include hour IDs for status update
                    })

        if customer_data_list:
            # Process invoices asynchronously
            bulk_invoice_generation_async.delay(
                customer_data_list,
                {'start_date': start_date_raw, 'end_date': end_date_raw, 'currency': 'cad'}
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
            # Return empty list instead of 404 error - customer may not have invoices yet
            return Response([])

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
        print(f"MonthlyHoursListView.get called at {datetime.now()}")
        
        last_date_raw = request.query_params.get("end")
        start_date_raw = request.query_params.get("start")
        last_date = datetime.strptime(last_date_raw, "%Y-%m-%d")
        start_date = datetime.strptime(start_date_raw, "%Y-%m-%d")
        end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Include both Eligible and Late hours for tutor payouts
        # Late hours can only be created by admins via batch add
        monthly_hours = Hours.objects.filter(
            date__range=(start_date, end_date),
            eligible__in=['Eligible', 'Late']
        ).order_by('date')
        print(f"MonthlyHoursListView found {monthly_hours.count()} hours")
        serializer = HoursSerializer(monthly_hours, many=True, context={'request': request})
        print(f"MonthlyHoursListView serialized {len(serializer.data)} hours")
        return Response(serializer.data)

    def post(self, request):
        print(f"MonthlyHoursListView.post called with data: {request.data}")
        entries = request.data
        created = False
        created_entries = []  # Track created entries for email notification

        try:
            for entry in entries:
                print(f"Processing entry: {entry}")

                tutor_id = entry.get('tutor')
                if not tutor_id:
                    print(f"Skipping entry without tutor ID: {entry}")
                    continue

                # Get tutor user object
                try:
                    tutor_user = User.objects.get(id=tutor_id)
                except User.DoesNotExist:
                    print(f"Tutor with ID {tutor_id} does not exist")
                    continue

                stripeID = tutor_user.stripe_account_id if hasattr(tutor_user, 'stripe_account_id') else None
                if not stripeID:
                    print(f"Tutor {tutor_id} has no stripe account, skipping")
                    continue

                # Convert dates from string to date objects
                from datetime import datetime
                try:
                    end_date = datetime.strptime(entry.get('end_date'), '%Y-%m-%d').date()
                    start_date = datetime.strptime(entry.get('start_date'), '%Y-%m-%d').date()
                except (ValueError, TypeError) as e:
                    print(f"Date parsing error for entry {entry}: {e}")
                    continue

                # Check for both duplicates and overlaps
                exists = MonthlyHours.objects.filter(
                    end_date=end_date,
                    start_date=start_date,
                    tutor=tutor_user
                ).exists()

                # Check for overlapping periods for the same tutor
                # An overlap exists if any existing record has dates that intersect with our range
                overlap_exists = MonthlyHours.objects.filter(
                    tutor=tutor_user
                ).filter(
                    # Check if start_date falls within existing range OR end_date falls within existing range
                    # OR the new range completely encompasses an existing range
                    Q(start_date__lte=start_date, end_date__gte=start_date) |
                    Q(start_date__lte=end_date, end_date__gte=end_date) |
                    Q(start_date__gte=start_date, end_date__lte=end_date)
                ).exists()

                if not exists and not overlap_exists:
                    MonthlyHours.objects.create(
                        end_date=end_date,
                        start_date=start_date,
                        tutor=tutor_user,
                        OnlineHours=entry.get('OnlineHours'),
                        InPersonHours=entry.get('InPersonHours'),
                        TotalBeforeTax=entry.get('TotalBeforeTax')
                    )
                    created = True
                    created_entries.append({
                        'tutor': tutor_user,
                        'start_date': start_date,
                        'end_date': end_date,
                        'online_hours': entry.get('OnlineHours'),
                        'inperson_hours': entry.get('InPersonHours'),
                        'total': entry.get('TotalBeforeTax')
                    })
                    print(f"Created MonthlyHours for tutor {tutor_id}")
                elif exists:
                    print(f"MonthlyHours already exists for tutor {tutor_id} from {start_date} to {end_date}")
                elif overlap_exists:
                    print(f"MonthlyHours overlap detected for tutor {tutor_id} with period {start_date} to {end_date}")

            # Send individual email notifications for all created entries
            if created_entries:
                self._send_monthly_hours_emails(created_entries)

        except Exception as e:
            print(f"Error in MonthlyHoursListView.post: {e}")
            return Response({"error": str(e)}, status=500)

        if created:
            return Response({"status": "created"}, status=201)
        else:
            return Response({"status": "Not Created, Duplicate"}, status=301)

    def _send_monthly_hours_emails(self, created_entries):
        """Send individual email notifications to each tutor with their monthly hours breakdown"""
        from .email_utils import send_mailgun_email

        # Send individual email to each tutor
        for entry in created_entries:
            tutor = entry['tutor']
            start_date = entry['start_date']
            end_date = entry['end_date']

            try:
                # Fetch detailed hours for this tutor within the date range
                hours_details = Hours.objects.filter(
                    tutor=tutor,
                    date__range=[start_date, end_date],
                    status__in=['Accepted', 'Resolved'],
                    eligible='Eligible'
                ).order_by('date', 'startTime')

                # Build email content
                subject = f"Monthly Tutoring Hours Summary - {start_date.strftime('%B %Y')}"

                # Build HTML content
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #192A88; border-bottom: 3px solid #FFB31B; padding-bottom: 10px;">
                            Monthly Tutoring Hours Summary
                        </h2>
                        <p>Dear {tutor.firstName} {tutor.lastName},</p>
                        <p>Here is your monthly tutoring hours summary for <strong>{start_date.strftime('%B %d, %Y')}</strong> to <strong>{end_date.strftime('%B %d, %Y')}</strong>:</p>

                        <h3 style="color: #192A88; margin-top: 30px;">Session Details:</h3>
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                            <thead>
                                <tr style="background-color: #192A88; color: white;">
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Date</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Student</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Parent</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Time</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Hours</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Subject</th>
                                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Location</th>
                                </tr>
                            </thead>
                            <tbody>
                """

                for hour in hours_details:
                    html_content += f"""
                                <tr style="background-color: #f9f9f9;">
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.date.strftime('%b %d, %Y')}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.student.firstName} {hour.student.lastName}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.parent.firstName} {hour.parent.lastName}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.startTime.strftime('%I:%M %p')} - {hour.endTime.strftime('%I:%M %p')}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.totalTime}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.subject}</td>
                                    <td style="padding: 8px; border: 1px solid #ddd;">{hour.location}</td>
                                </tr>
                    """

                # Summary totals
                total_online = float(entry['online_hours'])
                total_inperson = float(entry['inperson_hours'])
                total_earnings = float(entry['total'])

                html_content += f"""
                            </tbody>
                        </table>

                        <h3 style="color: #192A88; margin-top: 30px;">Summary:</h3>
                        <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; border-left: 4px solid #FFB31B;">
                            <p style="margin: 5px 0;"><strong>Online Hours:</strong> {total_online:.2f}</p>
                            <p style="margin: 5px 0;"><strong>In-Person Hours:</strong> {total_inperson:.2f}</p>
                            <p style="margin: 5px 0;"><strong>Total Hours:</strong> {total_online + total_inperson:.2f}</p>
                            <p style="margin: 5px 0; font-size: 1.1em;"><strong>Total Earnings:</strong> <span style="color: #192A88;">${total_earnings:.2f}</span></p>
                        </div>

                        <p style="margin-top: 30px;">If you have any questions or concerns about these hours, please don't hesitate to contact us.</p>

                        <p style="margin-top: 20px;">Best regards,<br>
                        <strong>EGS Tutoring Team</strong></p>

                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 0.85em; color: #666;">
                            <p>This is an automated notification from EGS Tutoring. Please do not reply to this email.</p>
                        </div>
                    </div>
                </body>
                </html>
                """

                # Plain text version
                text_content = f"""
Monthly Tutoring Hours Summary

Dear {tutor.firstName} {tutor.lastName},

Here is your monthly tutoring hours summary for {start_date.strftime('%B %d, %Y')} to {end_date.strftime('%B %d, %Y')}:

Session Details:
"""
                for hour in hours_details:
                    text_content += f"\n- {hour.date.strftime('%b %d, %Y')}: {hour.student.firstName} {hour.student.lastName} (Parent: {hour.parent.firstName} {hour.parent.lastName})"
                    text_content += f"\n  Time: {hour.startTime.strftime('%I:%M %p')} - {hour.endTime.strftime('%I:%M %p')} ({hour.totalTime} hours)"
                    text_content += f"\n  Subject: {hour.subject} | Location: {hour.location}\n"

                text_content += f"""
Summary:
- Online Hours: {total_online:.2f}
- In-Person Hours: {total_inperson:.2f}
- Total Hours: {total_online + total_inperson:.2f}
- Total Earnings: ${total_earnings:.2f}

If you have any questions or concerns about these hours, please don't hesitate to contact us.

Best regards,
EGS Tutoring Team
                """

                # Send individual email to this tutor
                send_mailgun_email(
                    to_emails=[tutor.email],
                    subject=subject,
                    text_content=text_content,
                    html_content=html_content
                )
                print(f"Monthly hours email sent to {tutor.email}")

            except Exception as e:
                print(f"Error sending email to {tutor.email}: {e}")

#Ran once hours are calculate and sent
class calculateMonthlyTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        print(f"calculateMonthlyTotal called at {datetime.now()}")
        try:
            last_date_raw = request.query_params.get("end")
            start_date_raw = request.query_params.get("start")
            last_date = datetime.strptime(last_date_raw, "%Y-%m-%d")
            start_date = datetime.strptime(start_date_raw, "%Y-%m-%d")
            start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        except Exception as e:
            print(f"calculateMonthlyTotal date parsing error: {e}")
            return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        # Include both Eligible and Late hours for tutor payouts
        # Late hours can only be created by admins via batch add
        monthly_hours = Hours.objects.filter(
            date__range=(start_date, end_date),
            status__in=['Accepted', 'Resolved'],
            eligible__in=['Eligible', 'Late']
        ).order_by('date')
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

            # Get tutor name
            try:
                tutor_user = User.objects.get(id=tutor)
                tutor_name = f"{tutor_user.firstName} {tutor_user.lastName}"
            except User.DoesNotExist:
                tutor_name = f"Tutor ID {tutor}"

            results.append({
                "start_date": start_date.date(),
                "end_date": last_date.date(),
                "tutor": tutor,
                "tutor_name": tutor_name,
                "OnlineHours": float(online_hours),
                "InPersonHours": float(inperson_hours),
                "TotalBeforeTax": float(total_before_tax)
            })

        print(f"calculateMonthlyTotal returning {len(results)} results")
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

    def get(self, request):
        """Test endpoint to verify the view is accessible"""
        return Response({"message": "BatchMonthlyHoursPayoutView is accessible", "methods": ["POST"]})

    def post(self, request):
        print(f"BatchMonthlyHoursPayoutView.post called with data: {request.data}")
        
        start_date = request.data.get("start_date")
        end_date   = request.data.get("end_date")

        if not start_date or not end_date:
            return Response({"detail": "start_date and end_date required."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Import the async task
        try:
            from playground.tasks import batch_payout_processing_async
        except ImportError as e:
            print(f"Error importing batch_payout_processing_async: {e}")
            return Response({"detail": f"Task import error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        try:
            # Convert string dates to date objects
            from datetime import datetime
            start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
            
            rows = (MonthlyHours.objects
                    .filter(end_date=end_date_obj, start_date=start_date_obj, payout_status='pending'))
            
            print(f"Found {rows.count()} MonthlyHours records for date range {start_date} to {end_date}")

            if not rows.exists():
                return Response({"detail": "No MonthlyHours in that range."}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({"detail": f"Invalid date format: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": f"Error querying MonthlyHours: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
                'stripe_account_id': tutor.stripe_account_id.strip() if tutor.stripe_account_id else None,
                'amount': amount_cents,
                'currency': 'cad',
                'description': f"MonthlyHours #{mh.id} payout",
                'monthly_hours_id': mh.id,  # Add for easy access in task
                'metadata': {
                    "monthly_hours_id": mh.id,
                    "tutor_id": tutor.id,
                    "period_start": str(mh.start_date),
                    "period_end": str(mh.end_date),
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
    
def get_client_ip(request):
    """Get the client's IP address from request headers"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

@api_view(['POST'])
@permission_classes([AllowAny])
def create_chat_session(request):
    ip_address = get_client_ip(request)
    
    # Check if IP has too many recent sessions
    from django.utils import timezone
    from datetime import timedelta
    
    recent_sessions = AiChatSession.objects.filter(
        ip_address=ip_address,
        created_at__gte=timezone.now() - timedelta(hours=1)
    ).count()
    
    if recent_sessions >= 5:  # Max 5 sessions per hour per IP
        return Response({
            'error': 'Too many chat sessions. Please wait before starting a new session.'
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)
    
    session = AiChatSession.objects.create(ip_address=ip_address)
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
        
        try:
            session.send(message)
        except ValueError as e:
            # Rate limiting error
            return Response({
                'error': str(e),
                'rate_limited': True
            }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    return Response(serializer.data)


# API endpoint to serve media files as base64 or redirect
@api_view(['GET'])
@permission_classes([AllowAny])
def get_media_file(request, path):
    """Return media file info or base64 content"""
    import os
    import base64
    import mimetypes
    from django.conf import settings
    
    # Construct the full file path
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    
    # Check if file exists
    if not os.path.exists(file_path):
        return Response({'error': 'File not found'}, status=404)
    
    try:
        # Determine content type
        content_type, _ = mimetypes.guess_type(file_path)
        if not content_type:
            content_type = 'application/octet-stream'
        
        # Read file and encode as base64
        with open(file_path, 'rb') as f:
            file_content = f.read()
            base64_content = base64.b64encode(file_content).decode('utf-8')
        
        return Response({
            'content': base64_content,
            'content_type': content_type,
            'filename': os.path.basename(file_path)
        })
    except Exception as e:
        return Response({'error': 'Error reading file'}, status=500)

# Hour Dispute Views
class HourDisputeCreateView(generics.CreateAPIView):
    serializer_class = HourDisputeSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        serializer.save(complainer=self.request.user)

class HourDisputeListView(generics.ListAPIView):
    serializer_class = HourDisputeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            # Admin can see all disputes
            return HourDispute.objects.all()
        else:
            # Regular users can only see their own disputes
            return HourDispute.objects.filter(complainer=user)

class AdminDisputeManagementView(generics.RetrieveUpdateAPIView):
    serializer_class = HourDisputeSerializer
    permission_classes = [IsAuthenticated]
    queryset = HourDispute.objects.all()
    
    def get_permissions(self):
        # Only superusers can manage disputes
        if not self.request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        return super().get_permissions()
    
    def patch(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        dispute = self.get_object()
        action = request.data.get('action')
        admin_reply = request.data.get('admin_reply', '')
        
        if action == 'resolve':
            dispute.status = 'resolved'
            dispute.admin_reply = admin_reply
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()
            dispute.save()
            
        elif action == 'dismiss':
            dispute.status = 'dismissed'
            dispute.admin_reply = admin_reply
            dispute.resolved_by = request.user
            dispute.resolved_at = timezone.now()
            dispute.save()
            
        serializer = self.get_serializer(dispute)
        return Response(serializer.data)

class CancelDisputeView(generics.DestroyAPIView):
    serializer_class = HourDisputeSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return HourDispute.objects.all()
        else:
            # Users can only cancel their own pending disputes
            return HourDispute.objects.filter(complainer=user, status='pending')
    
    def delete(self, request, *args, **kwargs):
        dispute = self.get_object()
        
        # Only allow canceling pending disputes
        if dispute.status != 'pending':
            return Response({'error': 'Can only cancel pending disputes'}, status=400)
        
        # Regular users can only cancel their own disputes
        if not request.user.is_superuser and dispute.complainer != request.user:
            return Response({'error': 'Can only cancel your own disputes'}, status=403)
        
        dispute.delete()
        return Response({'message': 'Dispute cancelled successfully'}, status=200)

class TutorComplaintListCreateView(generics.ListCreateAPIView):
    serializer_class = TutorComplaintSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Admins see all complaints, students see only their own
        if self.request.user.is_superuser:
            return TutorComplaint.objects.all()
        elif self.request.user.roles == 'student':
            return TutorComplaint.objects.filter(student=self.request.user)
        else:
            return TutorComplaint.objects.none()

    def perform_create(self, serializer):
        # Only students can create complaints
        if self.request.user.roles != 'student':
            raise ValidationError("Only students can create complaints")
        
        serializer.save(student=self.request.user)

class TutorComplaintManageView(APIView):
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, complaint_id):
        # Only admins can manage complaints
        if not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=403)
        
        try:
            complaint = TutorComplaint.objects.get(id=complaint_id)
        except TutorComplaint.DoesNotExist:
            return Response({'error': 'Complaint not found'}, status=404)
        
        action = request.data.get('action')
        admin_reply = request.data.get('admin_reply', '')
        
        if action == 'review':
            complaint.status = 'reviewed'
        elif action == 'resolve':
            complaint.status = 'resolved'
        else:
            return Response({'error': 'Invalid action'}, status=400)
        
        complaint.admin_reply = admin_reply
        complaint.reviewed_by = request.user
        complaint.reviewed_at = timezone.now()
        complaint.save()
        
        return Response({'message': 'Complaint updated successfully'}, status=200)

class StudentTutorsView(APIView):
    """API endpoint to get a student's assigned tutors"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if request.user.roles != 'student':
            return Response({'error': 'Student access required'}, status=403)
        
        # Get all accepted tutors for this student
        accepted_tutors = AcceptedTutor.objects.filter(
            student=request.user,
            status='Accepted'
        ).select_related('tutor', 'request')
        
        tutors = []
        for accepted_tutor in accepted_tutors:
            tutor = accepted_tutor.tutor
            tutors.append({
                'id': tutor.id,
                'firstName': tutor.firstName,
                'lastName': tutor.lastName,
                'email': tutor.email,
                'phone_number': tutor.phone_number,
                'subject': accepted_tutor.request.subject,
                'accepted_at': accepted_tutor.accepted_at
            })
        
        return Response({'tutors': tutors}, status=200)

class StudentTutorsDetailView(APIView):
    """API endpoint to get tutors for a specific student (for parents/admins)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, student_id):
        # Allow parents to view their children's tutors and admins to view any student's tutors
        if request.user.roles not in ['parent', 'admin'] and not request.user.is_superuser:
            return Response({'error': 'Parent or admin access required'}, status=403)

        try:
            student = User.objects.get(id=student_id, roles='student')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)

        # If user is a parent, verify they are the parent of this student
        if request.user.roles == 'parent':
            # Check if this parent has this student
            try:
                from django.db.models import Q
                # Check if student exists with this parent's email
                parent_students = User.objects.filter(
                    roles='student',
                    parent_email=request.user.email,
                    id=student_id
                )
                if not parent_students.exists():
                    return Response({'error': 'Access denied'}, status=403)
            except:
                return Response({'error': 'Access denied'}, status=403)

        # Get all accepted tutors for this student
        accepted_tutors = AcceptedTutor.objects.filter(
            student=student,
            status='Accepted'
        ).select_related('tutor', 'request')

        tutors = []
        for accepted_tutor in accepted_tutors:
            tutor = accepted_tutor.tutor
            tutors.append({
                'tutor_id': tutor.id,
                'firstName': tutor.firstName,
                'lastName': tutor.lastName,
                'email': tutor.email,
                'phone_number': tutor.phone_number,
                'subject': accepted_tutor.request.subject,
                'accepted_at': accepted_tutor.accepted_at
            })

        return Response(tutors, status=200)

class AdminCreateTutorView(generics.CreateAPIView):
    """Admin-only endpoint for creating tutor accounts"""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_create(self, serializer):
        from rest_framework.exceptions import PermissionDenied
        from django.db import transaction
        from django.core.exceptions import ValidationError
        
        # Check if user is admin/superuser
        if not (self.request.user.is_superuser or getattr(self.request.user, 'roles', None) == 'admin'):
            raise PermissionDenied("Only administrators can create tutor accounts")
        
        # Force role to be tutor
        serializer.validated_data['roles'] = 'tutor'
        
        role = 'tutor'  # Always tutor for this endpoint
        email = serializer.validated_data.get('email')
        
        # Use atomic transaction to ensure all database operations succeed or none do
        with transaction.atomic():
            # Create the user with encrypted password (inactive by default)
            user = serializer.save(is_active=False)
            user.set_password(serializer.validated_data['password'])
            
            # Set default rates based on user role
            user.set_default_rates_by_role()
            user.save()
            
        # Post-creation actions (outside transaction to avoid rollback on email failures)
        from playground.tasks import send_verification_email_async, create_stripe_account_async, send_tutor_welcome_email_async
        from kombu.exceptions import OperationalError
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from django.contrib.auth.tokens import default_token_generator
        
        # Generate verification email data (same format as regular registration)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        verify_url = f"{settings.FRONTEND_URL}/verify-email/{uid}/{token}/"
        
        # Create Stripe account and send tutor welcome email with both verification and Stripe links
        try:
            # First create the Stripe account synchronously to get the onboarding link
            stripe_result = create_stripe_account_async.apply(args=[user.id])
            onboarding_link = None
            if stripe_result.successful() and stripe_result.result.get('success'):
                onboarding_link = stripe_result.result.get('onboarding_link')
            
            # Send welcome email with both verification and Stripe links
            send_tutor_welcome_email_async.delay(user.id, verify_url, onboarding_link)
        except (OperationalError, Exception) as email_error:
            print(f"Email or Stripe setup failed: {email_error}")
            # Don't fail the registration if email/stripe fails - send welcome email without Stripe link
            send_tutor_welcome_email_async.delay(user.id, verify_url)


class TutorChangeRequestCreateView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from playground.models import TutorChangeRequest, AcceptedTutor, User
        
        # Check if user is a parent
        if request.user.roles != 'parent':
            return Response({"error": "Only parents can request tutor changes"}, status=403)
        
        try:
            student_id = request.data.get('student_id')
            current_tutor_id = request.data.get('current_tutor_id')
            subject = request.data.get('subject')
            reason = request.data.get('reason')
            message = request.data.get('message')
            
            if not all([student_id, current_tutor_id, subject, reason, message]):
                return Response({"error": "All fields are required"}, status=400)
            
            # Verify student exists and belongs to parent
            try:
                student = User.objects.get(id=student_id, roles='student')
            except User.DoesNotExist:
                return Response({"error": "Student not found"}, status=404)
            
            # Verify current tutor exists
            try:
                current_tutor = User.objects.get(id=current_tutor_id, roles='tutor')
            except User.DoesNotExist:
                return Response({"error": "Current tutor not found"}, status=404)
            
            # Verify parent-student-tutor relationship exists
            accepted_tutor = AcceptedTutor.objects.filter(
                parent=request.user,
                student=student,
                tutor=current_tutor,
                status='Accepted'
            ).first()
            
            if not accepted_tutor:
                return Response({"error": "No active tutoring relationship found"}, status=400)
            
            # Check for existing pending request for the same combination
            existing_request = TutorChangeRequest.objects.filter(
                parent=request.user,
                student=student,
                current_tutor=current_tutor,
                subject=subject,
                status='pending'
            ).first()
            
            if existing_request:
                return Response({"error": "A pending tutor change request already exists for this combination"}, status=400)
            
            # Create the tutor change request
            change_request = TutorChangeRequest.objects.create(
                parent=request.user,
                student=student,
                current_tutor=current_tutor,
                subject=subject,
                reason=reason,
                message=message
            )
            
            return Response({
                "message": "Tutor change request submitted successfully",
                "request_id": change_request.id
            }, status=201)
            
        except Exception as e:
            print(f"Error creating tutor change request: {e}")
            return Response({"error": "Failed to submit tutor change request"}, status=500)


class TutorChangeRequestListView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        from playground.models import TutorChangeRequest
        
        # Check if user is a parent
        if request.user.roles != 'parent':
            return Response({"error": "Only parents can view tutor change requests"}, status=403)
        
        try:
            # Get all tutor change requests for this parent
            requests = TutorChangeRequest.objects.filter(parent=request.user).select_related(
                'student', 'current_tutor', 'reviewed_by'
            )
            
            requests_data = []
            for req in requests:
                requests_data.append({
                    'id': req.id,
                    'student_name': f"{req.student.firstName} {req.student.lastName}",
                    'current_tutor_name': f"{req.current_tutor.firstName} {req.current_tutor.lastName}",
                    'subject': req.subject,
                    'reason': req.get_reason_display(),
                    'message': req.message,
                    'status': req.get_status_display(),
                    'admin_reply': req.admin_reply,
                    'created_at': req.created_at,
                    'reviewed_at': req.reviewed_at,
                    'reviewed_by': f"{req.reviewed_by.firstName} {req.reviewed_by.lastName}" if req.reviewed_by else None
                })
            
            return Response(requests_data, status=200)
            
        except Exception as e:
            print(f"Error fetching tutor change requests: {e}")
            return Response({"error": "Failed to fetch tutor change requests"}, status=500)


class TutorLeaveStudentView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        from playground.models import AcceptedTutor, User, TutoringRequest
        from django.core.mail import send_mail
        from django.conf import settings
        
        # Check if user is a tutor
        if request.user.roles != 'tutor' and not request.user.is_superuser:
            return Response({"error": "Only tutors can leave students"}, status=403)
        
        try:
            tutor_id = request.data.get('tutor_id')
            student_id = request.data.get('student_id')
            parent_id = request.data.get('parent_id')
            reason = request.data.get('reason')
            tutor_student_relation_id = request.data.get('tutor_student_relation_id')
            request_id = request.data.get('request_id')
            
            if not all([tutor_id, student_id, parent_id, reason]):
                return Response({"error": "Missing required fields: tutor_id, student_id, parent_id, reason"}, status=400)
            
            # Verify tutor, student, and parent exist
            try:
                tutor = User.objects.get(id=tutor_id, roles='tutor')
                student = User.objects.get(id=student_id, roles='student')
                parent = User.objects.get(id=parent_id, roles='parent')
            except User.DoesNotExist as e:
                return Response({"error": "User not found"}, status=404)
            
            # Verify the tutor is requesting to leave their own student
            if request.user.id != int(tutor_id) and not request.user.is_superuser:
                return Response({"error": "You can only leave your own students"}, status=403)
            
            # Find and remove the accepted tutor relationship
            accepted_tutor = AcceptedTutor.objects.filter(
                tutor=tutor,
                student=student,
                parent=parent,
                status='Accepted'
            ).first()
            
            if not accepted_tutor:
                return Response({"error": "No active tutoring relationship found"}, status=404)
            
            # Use database transaction to ensure all operations succeed together
            with transaction.atomic():
                # Store the original request for reactivation
                original_request = accepted_tutor.request
                
                # Remove the accepted tutor relationship
                accepted_tutor.delete()
                
                # Reactivate the original tutoring request if it exists
                if original_request:
                    # Reset any previous tutor assignments on the request
                    original_request.status = 'pending'  # If there's a status field
                    original_request.save()
                    
                    # Remove any other accepted tutors for this request (in case of duplicates)
                    AcceptedTutor.objects.filter(request=original_request).exclude(
                        id=accepted_tutor.id if hasattr(accepted_tutor, 'id') else None
                    ).delete()
                
                # Send email notification to parent
                try:
                    subject = f"Tutor Update: {tutor.firstName} {tutor.lastName} is no longer tutoring {student.firstName}"
                    
                    message = f"""
Dear {parent.firstName} {parent.lastName},

We wanted to inform you that {tutor.firstName} {tutor.lastName} has decided to stop tutoring {student.firstName} {student.lastName}.

Reason provided: {reason}

Your tutoring request has been made available again on our platform, and other qualified tutors can now respond to it. You should start receiving responses from available tutors soon.

If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
The EGS Tutoring Team
                    """.strip()
                    
                    send_mail(
                        subject=subject,
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[parent.email],
                        fail_silently=False,
                    )
                    
                    email_sent = True
                except Exception as email_error:
                    print(f"Failed to send email notification: {email_error}")
                    email_sent = False
                    # Don't fail the entire operation if email fails
            
            return Response({
                "message": "Successfully left student. Parent has been notified and the request is available for other tutors.",
                "email_sent": email_sent,
                "request_reactivated": bool(original_request)
            }, status=200)
            
        except Exception as e:
            print(f"Error in tutor leave student: {e}")
            return Response({"error": "Failed to process tutor leave request"}, status=500)


class ParentUnassignTutorView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from playground.models import AcceptedTutor, User, TutoringRequest
        from django.core.mail import send_mail
        from django.conf import settings
        from playground.email_utils import send_mailgun_email

        # Check if user is a parent
        if request.user.roles != 'parent' and not request.user.is_superuser:
            return Response({"error": "Only parents can unassign tutors"}, status=403)

        try:
            tutor_id = request.data.get('tutor_id')
            student_id = request.data.get('student_id')
            reason = request.data.get('reason')
            delete_request = request.data.get('delete_request', False)  # Boolean to determine if request should be deleted

            if not all([tutor_id, student_id, reason]):
                return Response({"error": "Missing required fields: tutor_id, student_id, reason"}, status=400)

            # Verify tutor and student exist
            try:
                tutor = User.objects.get(id=tutor_id, roles='tutor')
                student = User.objects.get(id=student_id, roles='student')
            except User.DoesNotExist as e:
                return Response({"error": "User not found"}, status=404)

            # Find the accepted tutor relationship
            accepted_tutor = AcceptedTutor.objects.filter(
                tutor=tutor,
                student=student,
                parent=request.user,
                status='Accepted'
            ).first()

            if not accepted_tutor:
                return Response({"error": "No active tutoring relationship found"}, status=404)

            # Use database transaction to ensure all operations succeed together
            with transaction.atomic():
                # Store the original request for reactivation or deletion
                original_request = accepted_tutor.request

                # Remove the accepted tutor relationship
                accepted_tutor.delete()

                request_action = "deleted"
                if original_request:
                    if delete_request:
                        # Delete the original request
                        original_request.delete()
                        request_action = "deleted"
                    else:
                        # Reactivate the original tutoring request
                        original_request.is_accepted = 'Pending'
                        original_request.accepted_tutor = None
                        original_request.save()

                        # Remove any other accepted tutors for this request
                        AcceptedTutor.objects.filter(request=original_request).delete()
                        request_action = "reactivated"

                        # Notify all tutors about the reactivated request
                        try:
                            from playground.tasks import send_new_request_notification_async

                            tutors_with_notifications = User.objects.filter(
                                roles='tutor',
                                email_notifications_enabled=True,
                                email_new_requests=True,
                                email__isnull=False
                            ).exclude(email='').exclude(id=tutor_id)  # Exclude the unassigned tutor

                            if tutors_with_notifications.exists():
                                tutor_emails = list(tutors_with_notifications.values_list('email', flat=True))
                                parent_name = f"{original_request.parent.firstName} {original_request.parent.lastName}"
                                student_name = f"{original_request.student.firstName} {original_request.student.lastName}"

                                send_new_request_notification_async.delay(
                                    tutor_emails,
                                    parent_name,
                                    student_name,
                                    original_request.subject,
                                    original_request.grade,
                                    original_request.service,
                                    original_request.city
                                )
                                print(f"Notified {len(tutor_emails)} tutors about reactivated request")
                        except Exception as e:
                            print(f"Failed to notify tutors about reactivated request: {e}")

                # Send email notification to tutor using Mailgun
                try:
                    subject = f"Tutoring Update: {request.user.firstName} {request.user.lastName} has unassigned you from {student.firstName}"

                    message = f"""
Dear {tutor.firstName} {tutor.lastName},

We wanted to inform you that {request.user.firstName} {request.user.lastName} has decided to unassign you from tutoring {student.firstName} {student.lastName}.

Reason provided: {reason}

Thank you for your service as a tutor. If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
The EGS Tutoring Team
                    """.strip()

                    send_mailgun_email(
                        to_emails=[tutor.email],
                        subject=subject,
                        text_content=message
                    )

                    email_sent = True
                except Exception as email_error:
                    print(f"Failed to send email notification: {email_error}")
                    email_sent = False
                    # Don't fail the entire operation if email fails

            return Response({
                "message": f"Successfully unassigned tutor. Tutor has been notified and the request has been {request_action}.",
                "email_sent": email_sent,
                "request_action": request_action
            }, status=200)

        except Exception as e:
            print(f"Error in parent unassign tutor: {e}")
            return Response({"error": "Failed to process unassign request"}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def existing_weekly_hours(request):
    """
    Debug endpoint to fetch all existing WeeklyHours records from database
    """
    try:
        weekly_hours = WeeklyHours.objects.all().order_by('-created_at')
        data = []
        for wh in weekly_hours:
            data.append({
                'id': wh.id,
                'parent': wh.parent,
                'date': wh.date,
                'start_date': wh.date,  # WeeklyHours uses 'date' field
                'end_date': wh.date,    # Same date for weekly
                'OnlineHours': wh.OnlineHours,
                'InPersonHours': wh.InPersonHours,
                'TotalBeforeTax': wh.TotalBeforeTax,
                'created_at': wh.created_at,
                'online_hours': wh.OnlineHours,  # Alternative field names
                'in_person_hours': wh.InPersonHours,
                'total_before_tax': wh.TotalBeforeTax,
            })
        return Response(data)
    except Exception as e:
        return Response({"error": f"Failed to fetch existing weekly hours: {str(e)}"}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_cant_attend(request):
    """Handle student can't attend notifications to parents"""
    try:
        data = request.data
        student_name = data.get('student_name', 'Your child')
        event_title = data.get('event_title', 'Tutoring Session')
        event_date = data.get('event_date', '')
        event_start_time = data.get('event_start_time', '')
        event_end_time = data.get('event_end_time', '')
        event_description = data.get('event_description', '')
        tutor_name = data.get('tutor_name', 'the tutor')
        
        # Get the student user to find parent email
        student = request.user
        if not student:
            return JsonResponse({"error": "User not authenticated"}, status=401)
        
        # Find parent email - assuming student has parent_email field or similar
        parent_email = getattr(student, 'parent_email', None)
        if not parent_email and hasattr(student, 'email'):
            # If no direct parent email, we might need to find it through relationships
            # For now, let's try to find it through the student's profile
            try:
                # Check if student has accepted tutors that might have parent info
                accepted_tutors = AcceptedTutor.objects.filter(student_username=student.username)
                if accepted_tutors.exists():
                    parent_email = accepted_tutors.first().parent_email
            except:
                pass
        
        if not parent_email:
            return JsonResponse({"error": "Parent email not found"}, status=400)
        
        # Format event information
        event_info = f"""
Event: {event_title}
Tutor: {tutor_name}
Date: {event_date}
Time: {event_start_time} - {event_end_time}
Description: {event_description}
"""
        
        # Backend URL for the link
        backend_url = os.getenv('BACKEND_URL', 'https://egstutoring-portal.ca')
        scheduled_sessions_link = f"{backend_url}/events"
        
        # Email subject and body
        subject = f"{student_name} Cannot Attend Tutoring Session"
        body = f"""
Dear Parent,

Your child, {student_name}, says they cannot attend this event:

{event_info}

Please review your scheduled sessions here: {scheduled_sessions_link}

If you need to reschedule or have any questions, please contact us.

Best regards,
EGS Tutoring Team
"""
        
        # Send email using existing email task
        from .tasks import send_system_notification_email_async
        send_system_notification_email_async.delay(
            parent_email,
            subject,
            body
        )
        
        return JsonResponse({"success": "Parent notification sent successfully"})
        
    except Exception as e:
        return JsonResponse({"error": f"Failed to send notification: {str(e)}"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def existing_monthly_hours(request):
    """
    Debug endpoint to fetch all existing MonthlyHours records from database
    """
    try:
        monthly_hours = MonthlyHours.objects.all().order_by('-created_at')
        data = []
        for mh in monthly_hours:
            data.append({
                'id': mh.id,
                'tutor': mh.tutor,
                'start_date': mh.start_date,
                'end_date': mh.end_date,
                'OnlineHours': mh.OnlineHours,
                'InPersonHours': mh.InPersonHours,
                'TotalBeforeTax': mh.TotalBeforeTax,
                'created_at': mh.created_at,
                'online_hours': mh.OnlineHours,  # Alternative field names
                'in_person_hours': mh.InPersonHours,
                'total_before_tax': mh.TotalBeforeTax,
            })
        return Response(data)
    except Exception as e:
        return Response({"error": f"Failed to fetch existing monthly hours: {str(e)}"}, status=500)

class UsernamePasswordResetView(APIView):
    """
    Custom password reset view that accepts username instead of email
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from django_rest_passwordreset.models import ResetPasswordToken
        from django_rest_passwordreset.signals import reset_password_token_created
        
        username = request.data.get('username')
        if not username:
            return Response({"error": "Username is required"}, status=400)
        
        try:
            # Find user by username (regardless of activation status)
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            # Don't reveal if username exists or not for security
            return Response({"message": "If a user with that username exists, a password reset email will be sent."}, status=200)
        
        # Check if user has an email address
        if not user.email:
            return Response({"error": "No email address associated with this username"}, status=400)
        
        try:
            # Delete any existing tokens for this user to ensure only one active token
            ResetPasswordToken.objects.filter(user=user).delete()
            
            # Create new reset token
            token = ResetPasswordToken.objects.create(user=user)
            
            # Send the signal to trigger our custom email handler
            reset_password_token_created.send(
                sender=self.__class__,
                instance=self,
                reset_password_token=token
            )

            # Create censored email for response
            def censor_email(email):
                if '@' not in email:
                    return email
                local, domain = email.split('@', 1)
                if len(local) <= 4:
                    # If local part is too short, show first and last char with * in between
                    censored_local = local[0] + '*' * (len(local) - 2) + local[-1] if len(local) > 1 else local
                else:
                    # Show first 2 and last 2 characters with * in between
                    censored_local = local[:2] + '*' * (len(local) - 4) + local[-2:]
                return f"{censored_local}@{domain}"

            censored_email = censor_email(user.email)
            return Response({"message": f"Password reset email sent to {censored_email}"}, status=200)

        except Exception as e:
            return Response({"error": "Failed to process password reset request"}, status=500)

class AdminUserSearchView(APIView):
    """Admin endpoint to search users by name with suggestions"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Check if user is admin
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({'error': 'Admin access required'}, status=403)

        query = request.query_params.get('q', '').strip()
        if len(query) < 2:
            return Response({'users': []}, status=200)

        # Search users by first name or last name containing the query
        users = User.objects.filter(
            Q(firstName__icontains=query) |
            Q(lastName__icontains=query) |
            Q(username__icontains=query)
        ).order_by('firstName', 'lastName')[:20]  # Limit to 20 results

        user_list = []
        for user in users:
            user_list.append({
                'id': user.id,
                'firstName': user.firstName,
                'lastName': user.lastName,
                'username': user.username,
                'email': user.email,
                'roles': user.roles,
                'display_name': f"{user.firstName} {user.lastName} ({user.roles})"
            })

        return Response({'users': user_list}, status=200)

class AdminUserHoursView(APIView):
    """Admin endpoint to get all hours for a specific user"""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        # Check if user is admin
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({'error': 'Admin access required'}, status=403)

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        # Get user info
        user_info = {
            'id': user.id,
            'firstName': user.firstName,
            'lastName': user.lastName,
            'username': user.username,
            'email': user.email,
            'roles': user.roles,
            'phone_number': user.phone_number,
            'address': user.address,
            'city': user.city,
            'created_at': user.date_joined,
            'is_active': user.is_active,
            'is_superuser': user.is_superuser,
            'last_login': user.last_login,
            'profile_picture': user.profile_picture.url if user.profile_picture else None,
            'stripe_account_id': user.stripe_account_id if user.roles == 'tutor' else None,
            'tutor_referral_code': user.tutor_referral_code if user.roles == 'tutor' else None,
            'parent_id': user.parent.id if user.parent else None,
            'parent_name': f"{user.parent.firstName} {user.parent.lastName}" if user.parent else None,
        }

        # Add Google Calendar status for non-students
        google_connected = False
        if user.roles != 'student':
            # Check if user has Google credentials stored
            # This is a simplified check based on available user fields
            google_connected = bool(getattr(user, 'google_refresh_token', None) or
                                  getattr(user, 'google_access_token', None))

        user_info['google_calendar_connected'] = google_connected

        # Get all hours where user is involved (as student, parent, or tutor)
        hours = Hours.objects.filter(
            Q(student=user) | Q(parent=user) | Q(tutor=user)
        ).order_by('-date', '-startTime')

        # Use the existing HoursSerializer to get formatted data with names
        serializer = HoursSerializer(hours, many=True, context={'request': request})

        # Calculate total hours and stats
        total_sessions = hours.count()
        total_time = sum([
            float(hour.totalTime) if hour.totalTime else 0
            for hour in hours
        ])

        # Count by role
        as_student = hours.filter(student=user).count()
        as_parent = hours.filter(parent=user).count()
        as_tutor = hours.filter(tutor=user).count()

        stats = {
            'total_sessions': total_sessions,
            'total_hours': round(total_time, 2),
            'as_student': as_student,
            'as_parent': as_parent,
            'as_tutor': as_tutor
        }

        # Get relationships based on role
        relationships = {
            'students': [],
            'tutors': [],
            'children': []
        }

        # If user is a tutor, get their students
        if user.roles == 'tutor':
            accepted_tutors = AcceptedTutor.objects.filter(tutor=user).select_related('student')
            relationships['students'] = [
                {
                    'id': at.student.id,
                    'name': f"{at.student.firstName} {at.student.lastName}",
                    'email': at.student.email,
                    'accepted_at': at.accepted_at
                }
                for at in accepted_tutors
            ]

        # If user is a student, get their tutors
        if user.roles == 'student':
            accepted_tutors = AcceptedTutor.objects.filter(student=user).select_related('tutor')
            relationships['tutors'] = [
                {
                    'id': at.tutor.id,
                    'name': f"{at.tutor.firstName} {at.tutor.lastName}",
                    'email': at.tutor.email,
                    'accepted_at': at.accepted_at
                }
                for at in accepted_tutors
            ]

        # If user is a parent, get their children
        if user.roles == 'parent':
            # Get all students where this user is the parent
            children = User.objects.filter(parent=user, roles='student')
            relationships['children'] = [
                {
                    'id': child.id,
                    'name': f"{child.firstName} {child.lastName}",
                    'email': child.email,
                    'created_at': child.date_joined
                }
                for child in children
            ]

        # Get user documents
        documents = UserDocument.objects.filter(user=user).order_by('-uploaded_at')
        user_documents = [
            {
                'id': doc.id,
                'title': doc.title,
                'document_type': doc.document_type,
                'file_url': doc.document.url if doc.document else None,
                'uploaded_at': doc.uploaded_at,
                'file_name': doc.document.name.split('/')[-1] if doc.document else None
            }
            for doc in documents
        ]

        # Get current tutoring requests based on role
        current_requests = []
        seen_request_ids = set()  # Track all request IDs to avoid duplicates

        # For parents: get their tutoring requests + referral requests
        if user.roles == 'parent':
            # Regular tutoring requests
            parent_requests = TutoringRequest.objects.filter(parent=user).order_by('-created_at')
            for request in parent_requests:
                if request.id not in seen_request_ids:
                    seen_request_ids.add(request.id)

                    # Get all replies for this specific request
                    tutor_replies = TutorResponse.objects.filter(request=request, rejected=False).select_related('tutor').order_by('-created_at')
                    replies_list = [
                        {
                            'id': reply.id,
                            'tutor_name': f"{reply.tutor.firstName} {reply.tutor.lastName}",
                            'tutor_id': reply.tutor.id,
                            'message': reply.message,
                            'created_at': reply.created_at
                        }
                        for reply in tutor_replies
                    ]

                    # Get accepted tutor if exists
                    accepted_tutor_info = None
                    try:
                        accepted = AcceptedTutor.objects.get(request=request)
                        accepted_tutor_info = {
                            'id': accepted.tutor.id,
                            'name': f"{accepted.tutor.firstName} {accepted.tutor.lastName}",
                            'email': accepted.tutor.email,
                            'accepted_at': accepted.accepted_at
                        }
                    except AcceptedTutor.DoesNotExist:
                        pass

                    current_requests.append({
                        'id': request.id,
                        'type': 'regular',
                        'student_name': f"{request.student.firstName} {request.student.lastName}",
                        'subject': request.subject,
                        'grade': request.grade,
                        'service': request.service,
                        'city': request.city,
                        'status': request.is_accepted,
                        'reply_count': len(replies_list),
                        'replies': replies_list,
                        'accepted_tutor': accepted_tutor_info,
                        'created_at': request.created_at,
                        'description': request.description
                    })

            # Referral requests sent by this parent
            referral_requests = TutorReferralRequest.objects.filter(parent=user).select_related('tutor', 'student', 'tutoring_request').order_by('-created_at')
            for ref_req in referral_requests:
                current_requests.append({
                    'id': f"ref-{ref_req.id}",
                    'type': 'referral',
                    'student_name': f"{ref_req.student.firstName} {ref_req.student.lastName}",
                    'tutor_name': f"{ref_req.tutor.firstName} {ref_req.tutor.lastName}",
                    'subject': ref_req.subject,
                    'grade': ref_req.grade,
                    'service': ref_req.service,
                    'city': ref_req.city,
                    'status': ref_req.status,
                    'referral_code': ref_req.referral_code_used,
                    'created_at': ref_req.created_at,
                    'responded_at': ref_req.responded_at,
                    'description': ref_req.description
                })

        # For tutors: get requests they've responded to, referral requests, and accepted requests
        elif user.roles == 'tutor':
            # 1. Get requests the tutor has responded to
            tutor_responses = TutorResponse.objects.filter(tutor=user).select_related('request')
            for response in tutor_responses:
                request = response.request
                if request.id not in seen_request_ids:
                    seen_request_ids.add(request.id)

                    # Get all replies for this specific request
                    tutor_replies = TutorResponse.objects.filter(request=request, rejected=False).select_related('tutor').order_by('-created_at')
                    replies_list = [
                        {
                            'id': reply.id,
                            'tutor_name': f"{reply.tutor.firstName} {reply.tutor.lastName}",
                            'tutor_id': reply.tutor.id,
                            'message': reply.message,
                            'created_at': reply.created_at
                        }
                        for reply in tutor_replies
                    ]

                    # Get accepted tutor if exists
                    accepted_tutor_info = None
                    try:
                        accepted = AcceptedTutor.objects.get(request=request)
                        accepted_tutor_info = {
                            'id': accepted.tutor.id,
                            'name': f"{accepted.tutor.firstName} {accepted.tutor.lastName}",
                            'email': accepted.tutor.email,
                            'accepted_at': accepted.accepted_at
                        }
                    except AcceptedTutor.DoesNotExist:
                        pass

                    current_requests.append({
                        'id': request.id,
                        'type': 'response',
                        'student_name': f"{request.student.firstName} {request.student.lastName}",
                        'parent_name': f"{request.parent.firstName} {request.parent.lastName}",
                        'subject': request.subject,
                        'grade': request.grade,
                        'service': request.service,
                        'city': request.city,
                        'status': request.is_accepted,
                        'reply_count': len(replies_list),
                        'replies': replies_list,
                        'accepted_tutor': accepted_tutor_info,
                        'created_at': request.created_at,
                        'description': request.description,
                        'tutor_response': response.message,
                        'response_date': response.created_at,
                        'response_rejected': response.rejected
                    })

            # 2. Get referral requests received by this tutor
            referral_requests = TutorReferralRequest.objects.filter(tutor=user).select_related('parent', 'student', 'tutoring_request').order_by('-created_at')
            for ref_req in referral_requests:
                current_requests.append({
                    'id': f"ref-{ref_req.id}",
                    'type': 'referral',
                    'student_name': f"{ref_req.student.firstName} {ref_req.student.lastName}",
                    'parent_name': f"{ref_req.parent.firstName} {ref_req.parent.lastName}",
                    'subject': ref_req.subject,
                    'grade': ref_req.grade,
                    'service': ref_req.service,
                    'city': ref_req.city,
                    'status': ref_req.status,
                    'referral_code': ref_req.referral_code_used,
                    'created_at': ref_req.created_at,
                    'responded_at': ref_req.responded_at,
                    'description': ref_req.description
                })

            # 3. Get accepted tutoring relationships (requests that were accepted)
            accepted_tutors = AcceptedTutor.objects.filter(tutor=user).select_related('request', 'student', 'parent')
            for accepted in accepted_tutors:
                request = accepted.request
                if request.id not in seen_request_ids:
                    seen_request_ids.add(request.id)

                    # Get all replies for this specific request
                    tutor_replies = TutorResponse.objects.filter(request=request, rejected=False).select_related('tutor').order_by('-created_at')
                    replies_list = [
                        {
                            'id': reply.id,
                            'tutor_name': f"{reply.tutor.firstName} {reply.tutor.lastName}",
                            'tutor_id': reply.tutor.id,
                            'message': reply.message,
                            'created_at': reply.created_at
                        }
                        for reply in tutor_replies
                    ]

                    # Accepted tutor info (this tutor)
                    accepted_tutor_info = {
                        'id': accepted.tutor.id,
                        'name': f"{accepted.tutor.firstName} {accepted.tutor.lastName}",
                        'email': accepted.tutor.email,
                        'accepted_at': accepted.accepted_at
                    }

                    current_requests.append({
                        'id': request.id,
                        'type': 'accepted',
                        'student_name': f"{request.student.firstName} {request.student.lastName}",
                        'parent_name': f"{request.parent.firstName} {request.parent.lastName}",
                        'subject': request.subject,
                        'grade': request.grade,
                        'service': request.service,
                        'city': request.city,
                        'status': 'Accepted',
                        'accepted_status': accepted.status,
                        'reply_count': len(replies_list),
                        'replies': replies_list,
                        'accepted_tutor': accepted_tutor_info,
                        'created_at': request.created_at,
                        'accepted_at': accepted.accepted_at,
                        'description': request.description
                    })

        # For students: get requests made for them
        elif user.roles == 'student':
            student_requests = TutoringRequest.objects.filter(student=user).order_by('-created_at')
            for request in student_requests:
                # Get all replies for this specific request
                tutor_replies = TutorResponse.objects.filter(request=request, rejected=False).select_related('tutor').order_by('-created_at')
                replies_list = [
                    {
                        'id': reply.id,
                        'tutor_name': f"{reply.tutor.firstName} {reply.tutor.lastName}",
                        'tutor_id': reply.tutor.id,
                        'message': reply.message,
                        'created_at': reply.created_at
                    }
                    for reply in tutor_replies
                ]

                # Get accepted tutor if exists
                accepted_tutor_info = None
                try:
                    accepted = AcceptedTutor.objects.get(request=request)
                    accepted_tutor_info = {
                        'id': accepted.tutor.id,
                        'name': f"{accepted.tutor.firstName} {accepted.tutor.lastName}",
                        'email': accepted.tutor.email,
                        'accepted_at': accepted.accepted_at
                    }
                except AcceptedTutor.DoesNotExist:
                    pass

                current_requests.append({
                    'id': request.id,
                    'parent_name': f"{request.parent.firstName} {request.parent.lastName}",
                    'subject': request.subject,
                    'grade': request.grade,
                    'service': request.service,
                    'city': request.city,
                    'status': request.is_accepted,
                    'reply_count': len(replies_list),
                    'replies': replies_list,
                    'accepted_tutor': accepted_tutor_info,
                    'created_at': request.created_at,
                    'description': request.description
                })

        return Response({
            'user_info': user_info,
            'stats': stats,
            'hours': serializer.data,
            'relationships': relationships,
            'documents': user_documents,
            'current_requests': current_requests
        }, status=200)


class AdminRecentUsersView(APIView):
    """Admin endpoint to get recent users by role"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Check if user is admin
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({'error': 'Admin access required'}, status=403)

        role = request.GET.get('role', '').lower()
        limit = int(request.GET.get('limit', 10))

        if role not in ['tutor', 'parent', 'student']:
            return Response({'error': 'Invalid role. Must be tutor, parent, or student.'}, status=400)

        # Get recent users by role - check both lowercase and as-is
        users = User.objects.filter(roles__iexact=role).order_by('-date_joined')[:limit]

        print(f"Searching for role: {role}, found {users.count()} users")

        user_list = []
        for user in users:
            user_data = {
                'id': user.id,
                'firstName': user.firstName,
                'lastName': user.lastName,
                'email': user.email,
                'phone_number': user.phone_number,
                'created_at': user.date_joined
            }

            # Add role-specific data
            if role == 'tutor':
                # Count students for this tutor
                student_count = AcceptedTutor.objects.filter(tutor=user).count()
                user_data['student_count'] = student_count

            elif role == 'parent':
                # Count children for this parent
                children_count = User.objects.filter(parent=user, roles='student').count()
                user_data['children_count'] = children_count

            elif role == 'student':
                # Check if student has a tutor and get parent name
                has_tutor = AcceptedTutor.objects.filter(student=user).exists()
                user_data['has_tutor'] = has_tutor

                # Get parent name
                if user.parent:
                    user_data['parent_name'] = f"{user.parent.firstName} {user.parent.lastName}"
                else:
                    user_data['parent_name'] = 'N/A'

            user_list.append(user_data)

        return Response(user_list, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_test_email(request):
    """
    Admin tool for sending test emails with attachments
    """
    from playground.email_utils import send_mailgun_email

    # Check if user is admin/superuser
    if not request.user.is_superuser:
        return Response({
            'detail': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        recipient_email = request.data.get('recipient_email')
        subject = request.data.get('subject')
        message = request.data.get('message')
        admin_email = request.data.get('admin_email', 'elvissikapi@gmail.com')

        if not all([recipient_email, subject, message]):
            return Response({
                'detail': 'recipient_email, subject, and message are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Prepare attachments
        attachments = []
        for key, file in request.FILES.items():
            if key.startswith('attachment_'):
                # Read file content
                file_content = file.read()
                attachments.append((file.name, file_content, file.content_type))

        # Wrap message in HTML template
        html_message = wrap_message_in_html_template(message)

        # Send email to recipient
        success_recipient = send_mailgun_email(
            [recipient_email],
            f"[TEST] {subject}",
            message,  # Plain text version
            html_content=html_message,
            attachments=attachments if attachments else None
        )

        # Send copy to admin email (same as sent to recipient)
        success_admin = send_mailgun_email(
            [admin_email],
            f"[ADMIN COPY] {subject}",
            message,  # Plain text version
            html_content=html_message,
            attachments=attachments if attachments else None
        )

        if success_recipient and success_admin:
            return Response({
                'detail': f'Test emails sent successfully to {recipient_email} and {admin_email}',
                'recipient_email': recipient_email,
                'admin_email': admin_email,
                'attachments_count': len(attachments)
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'detail': 'Failed to send one or both test emails',
                'recipient_success': success_recipient,
                'admin_success': success_admin
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Error in admin test email: {e}")
        return Response({
            'detail': f'Error sending test email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSendHoursReminderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only allow superusers/admins to use this endpoint
        if not request.user.is_superuser:
            return Response({"error": "Only administrators can send hours reminders"}, status=403)

        try:
            # Import email utility
            from .email_utils import send_mailgun_email

            # Get all tutors (users with role 'tutor')
            tutors = User.objects.filter(roles='tutor', is_active=True)
            tutor_emails = [tutor.email for tutor in tutors if tutor.email]

            if not tutor_emails:
                return Response({
                    "error": "No active tutors found with email addresses"
                }, status=400)

            # Prepare email content
            subject = "Reminder: Please Log Your Tutoring Hours"

            text_content = """
Dear Tutor,

This is a friendly reminder to please log your tutoring hours in the EGS Tutoring system.

To log your hours:
1. Visit the EGS Tutoring portal
2. Navigate to "Log Hours" section
3. Enter your session details
4. Submit your hours

Please ensure all your tutoring sessions are logged promptly to maintain accurate records.

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
EGS Tutoring Team
            """.strip()

            html_content = """
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #192A88;">Reminder: Please Log Your Tutoring Hours</h2>

                    <p>Dear Tutor,</p>

                    <p>This is a friendly reminder to please log your tutoring hours in the EGS Tutoring system.</p>

                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #192A88;">To log your hours:</h4>
                        <ol>
                            <li>Visit the EGS Tutoring portal</li>
                            <li>Navigate to "Log Hours" section</li>
                            <li>Enter your session details</li>
                            <li>Submit your hours</li>
                        </ol>
                    </div>

                    <p>Please ensure all your tutoring sessions are logged promptly to maintain accurate records.</p>

                    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>

                    <p style="margin-top: 30px;">
                        Best regards,<br>
                        <strong>EGS Tutoring Team</strong>
                    </p>
                </div>
            </body>
            </html>
            """.strip()

            # Send email to all tutors
            success = send_mailgun_email(
                to_emails=tutor_emails,
                subject=subject,
                text_content=text_content,
                html_content=html_content
            )

            if success:
                logger.info(f"Hours reminder sent successfully to {len(tutor_emails)} tutors by admin {request.user.email}")
                return Response({
                    'detail': f'Hours reminder sent successfully to {len(tutor_emails)} tutors',
                    'tutors_count': len(tutor_emails),
                    'tutors_emailed': tutor_emails
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'detail': 'Failed to send hours reminder emails'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            logger.error(f"Error sending hours reminder: {e}")
            return Response({
                'detail': f'Error sending hours reminder: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminBatchAddHoursView(APIView):
    """Admin endpoint to batch add hours for tutors, bypassing current week restriction"""
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        # Only allow superusers/admins to use this endpoint
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        hours_entries = request.data.get('hours', [])

        if not hours_entries or not isinstance(hours_entries, list):
            return Response({
                'error': 'Invalid request. Expected "hours" array in request body'
            }, status=400)

        results = {
            'successful': [],
            'failed': [],
            'total_submitted': len(hours_entries)
        }

        for idx, entry in enumerate(hours_entries):
            try:
                # Validate required fields
                tutor_id = entry.get('tutor_id')
                student_id = entry.get('student_id')
                date_str = entry.get('date')
                start_time_str = entry.get('start_time')
                end_time_str = entry.get('end_time')
                total_time = entry.get('total_time')
                location = entry.get('location')
                subject = entry.get('subject', '')
                notes = entry.get('notes', '')

                # Check for required fields
                if not all([tutor_id, student_id, date_str, start_time_str, end_time_str, total_time, location]):
                    results['failed'].append({
                        'index': idx,
                        'entry': entry,
                        'error': 'Missing required fields (tutor_id, student_id, date, start_time, end_time, total_time, location)'
                    })
                    continue

                # Validate users exist
                try:
                    tutor = User.objects.get(pk=tutor_id)
                    if tutor.roles != 'tutor':
                        results['failed'].append({
                            'index': idx,
                            'entry': entry,
                            'error': f'User {tutor_id} is not a tutor'
                        })
                        continue
                except User.DoesNotExist:
                    results['failed'].append({
                        'index': idx,
                        'entry': entry,
                        'error': f'Tutor with id {tutor_id} not found'
                    })
                    continue

                try:
                    student = User.objects.get(pk=student_id)
                    parent = student.parent
                    if not parent:
                        results['failed'].append({
                            'index': idx,
                            'entry': entry,
                            'error': f'Student {student_id} has no parent associated'
                        })
                        continue
                except User.DoesNotExist:
                    results['failed'].append({
                        'index': idx,
                        'entry': entry,
                        'error': f'Student with id {student_id} not found'
                    })
                    continue

                # Parse and validate date/time
                try:
                    from datetime import datetime
                    session_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                    start_time = datetime.strptime(start_time_str, "%H:%M").time()
                    end_time = datetime.strptime(end_time_str, "%H:%M").time()
                except ValueError as e:
                    results['failed'].append({
                        'index': idx,
                        'entry': entry,
                        'error': f'Invalid date/time format: {str(e)}'
                    })
                    continue

                # Validate total_time
                try:
                    total_time_decimal = Decimal(str(total_time))
                    if total_time_decimal <= 0 or total_time_decimal > 8:
                        results['failed'].append({
                            'index': idx,
                            'entry': entry,
                            'error': 'Total time must be between 0 and 8 hours'
                        })
                        continue
                except (ValueError, InvalidOperation):
                    results['failed'].append({
                        'index': idx,
                        'entry': entry,
                        'error': 'Invalid total_time value'
                    })
                    continue

                # Validate location
                if location not in ['Online', 'In-Person']:
                    results['failed'].append({
                        'index': idx,
                        'entry': entry,
                        'error': 'Location must be "Online" or "In-Person"'
                    })
                    continue

                # Check for duplicate hours
                existing_hours = Hours.objects.filter(
                    tutor=tutor,
                    student=student,
                    date=session_date,
                    startTime=start_time,
                    endTime=end_time
                )

                if existing_hours.exists():
                    results['failed'].append({
                        'index': idx,
                        'entry': entry,
                        'error': 'Hours already logged for this tutor, student, date, and time slot'
                    })
                    continue

                # Admin bypass: Set eligibility based on whether it's past or not
                # Admin can add hours for any date, but we still mark them appropriately
                now_local = now().astimezone(TZ)
                current_date = now_local.date()
                cur_ws = week_start(current_date)
                cur_we = cur_ws + timedelta(days=6)

                # If within current week, mark as Eligible, otherwise as Late
                is_within_current_week = cur_ws <= session_date <= cur_we
                eligible_status = "Eligible" if is_within_current_week else "Late"

                # Create the hours entry
                hours_obj = Hours.objects.create(
                    tutor=tutor,
                    student=student,
                    parent=parent,
                    date=session_date,
                    startTime=start_time,
                    endTime=end_time,
                    totalTime=total_time_decimal,
                    location=location,
                    subject=subject,
                    notes=notes,
                    status='Accepted',  # Admin-added hours are auto-accepted
                    eligible=eligible_status
                )

                results['successful'].append({
                    'index': idx,
                    'hour_id': hours_obj.id,
                    'tutor': f"{tutor.firstName} {tutor.lastName}",
                    'student': f"{student.firstName} {student.lastName}",
                    'date': date_str,
                    'total_time': str(total_time_decimal),
                    'eligible': eligible_status
                })

            except Exception as e:
                results['failed'].append({
                    'index': idx,
                    'entry': entry,
                    'error': f'Unexpected error: {str(e)}'
                })
                logger.error(f"Error adding hours for entry {idx}: {e}")

        return Response({
            'detail': f'Batch processing complete. {len(results["successful"])} successful, {len(results["failed"])} failed',
            'results': results
        }, status=status.HTTP_200_OK if results['successful'] else status.HTTP_400_BAD_REQUEST)


class AdminAllHoursView(APIView):
    """Admin endpoint to view all hours with filtering options"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Check if user is admin
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({'error': 'Admin access required'}, status=403)

        # Get date range parameters (optional)
        start_date_raw = request.query_params.get("start")
        end_date_raw = request.query_params.get("end")

        # Start with all hours
        hours_query = Hours.objects.all()

        # Apply date filter if provided
        if start_date_raw and end_date_raw:
            try:
                start_date = make_aware(datetime.strptime(start_date_raw, "%Y-%m-%d"))
                end_date = make_aware(datetime.strptime(end_date_raw, "%Y-%m-%d"))
                start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
                end_date = end_date.replace(hour=23, minute=59, second=59, microsecond=999999)
                hours_query = hours_query.filter(date__range=(start_date, end_date))
            except ValueError:
                return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        # Order by most recent first
        hours = hours_query.order_by('-date', '-created_at')

        # Serialize the hours
        serializer = HoursSerializer(hours, many=True, context={'request': request})

        # Calculate statistics
        total_hours = hours.count()
        eligible_hours = hours.filter(eligible='Eligible').count()
        late_hours = hours.filter(eligible='Late').count()
        pending_hours = hours.filter(invoice_status='pending').count()
        invoiced_hours = hours.filter(invoice_status='invoiced').count()

        return Response({
            'hours': serializer.data,
            'stats': {
                'total': total_hours,
                'eligible': eligible_hours,
                'late': late_hours,
                'pending': pending_hours,
                'invoiced': invoiced_hours
            }
        })


class TutorReferralApprovalView(APIView):
    """
    View for tutors to approve or deny referral requests
    GET: Retrieve referral request details by token
    POST: Accept or decline referral request
    """
    authentication_classes = []  # No authentication required
    permission_classes = [AllowAny]  # Token-based access, not user auth

    def get(self, request, token):
        """Get referral request details"""
        try:
            from playground.models import TutorReferralRequest

            referral_request = TutorReferralRequest.objects.select_related(
                'parent', 'student', 'tutor'
            ).get(token=token, status='pending')

            from playground.serializers import TutorReferralRequestSerializer
            serializer = TutorReferralRequestSerializer(referral_request)

            return Response(serializer.data, status=status.HTTP_200_OK)

        except TutorReferralRequest.DoesNotExist:
            return Response({
                'error': 'Referral request not found or already processed'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error retrieving referral request: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request, token):
        """Accept or decline referral request"""
        try:
            from playground.models import TutorReferralRequest
            from playground.email_utils import send_mailgun_email
            from django.conf import settings
            from django.utils import timezone

            action = request.data.get('action')  # 'accept' or 'decline'

            if action not in ['accept', 'decline']:
                return Response({
                    'error': 'Invalid action. Must be "accept" or "decline"'
                }, status=status.HTTP_400_BAD_REQUEST)

            referral_request = TutorReferralRequest.objects.select_related(
                'parent', 'student', 'tutor', 'tutoring_request'
            ).get(token=token, status='pending')

            # Get the existing TutoringRequest that was created when parent submitted
            tutoring_request = referral_request.tutoring_request

            if not tutoring_request:
                return Response({
                    'error': 'Associated tutoring request not found'
                }, status=status.HTTP_404_NOT_FOUND)

            if action == 'accept':
                # Update existing TutoringRequest to accepted
                tutoring_request.is_accepted = "Accepted"
                tutoring_request.save()

                # Create TutorResponse
                tutor_name = f"{referral_request.tutor.firstName} {referral_request.tutor.lastName}"
                TutorResponse.objects.create(
                    request=tutoring_request,
                    tutor=referral_request.tutor,
                    message=f"Accepted referral request for {referral_request.student.firstName} {referral_request.student.lastName}",
                    rejected=False
                )

                # Create AcceptedTutor relationship
                AcceptedTutor.objects.create(
                    request=tutoring_request,
                    parent=referral_request.parent,
                    student=referral_request.student,
                    tutor=referral_request.tutor,
                    status='Accepted'
                )

                # Update referral request
                referral_request.status = 'accepted'
                referral_request.responded_at = timezone.now()
                referral_request.save()

                # Send email to parent
                try:
                    if referral_request.parent.email:
                        subject = f"Great News! {tutor_name} Accepted Your Request"
                        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #28a745; border-radius: 5px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Great News!</h1>
        </div>
        <div class="content">
            <p>Dear {referral_request.parent.firstName} {referral_request.parent.lastName},</p>
            <p>Excellent news! <strong>{tutor_name}</strong> has accepted your tutoring request for <strong>{referral_request.student.firstName} {referral_request.student.lastName}</strong>.</p>

            <div class="info-box">
                <h3>Request Details</h3>
                <p><strong>Subject:</strong> {referral_request.subject}<br>
                <strong>Grade:</strong> {referral_request.grade}<br>
                <strong>Service Type:</strong> {referral_request.service}</p>
            </div>

            <div class="info-box">
                <h3>What Happens Next?</h3>
                <p>{tutor_name} will reach out to you shortly to schedule the first session.</p>
                <p>You can view all your tutoring details and scheduled sessions in your EGS Tutoring dashboard.</p>
            </div>
        </div>
        <div class="footer">
            <p>Best regards,<br>The EGS Tutoring Team</p>
        </div>
    </div>
</body>
</html>
                        """

                        # Plain text version for email clients that don't support HTML
                        text_message = f"""
Dear {referral_request.parent.firstName} {referral_request.parent.lastName},

Excellent news! {tutor_name} has accepted your tutoring request for {referral_request.student.firstName} {referral_request.student.lastName}.

Request Details:
Subject: {referral_request.subject}
Grade: {referral_request.grade}
Service Type: {referral_request.service}

What Happens Next?
{tutor_name} will reach out to you shortly to schedule the first session.
You can view all your tutoring details and scheduled sessions in your EGS Tutoring dashboard.

Best regards,
The EGS Tutoring Team
                        """

                        send_mailgun_email(
                            to_emails=[referral_request.parent.email],
                            subject=subject,
                            text_content=text_message.strip(),
                            html_content=html_message
                        )
                        print(f"Sent acceptance email to parent: {referral_request.parent.email}")
                except Exception as e:
                    logger.error(f"Failed to send parent acceptance email: {e}")

                return Response({
                    'message': 'Referral request accepted successfully',
                    'tutoring_request_id': tutoring_request.id
                }, status=status.HTTP_200_OK)

            else:  # action == 'decline'
                # Tutoring request already exists, just keep it as "Not Accepted"
                # It's already visible to all tutors

                # Update referral request
                referral_request.status = 'declined'
                referral_request.responded_at = timezone.now()
                referral_request.save()

                # Send email to parent
                try:
                    tutor_name = f"{referral_request.tutor.firstName} {referral_request.tutor.lastName}"
                    if referral_request.parent.email:
                        subject = f"Update on Your Tutoring Request"
                        html_message = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #192A88 0%, #1e3a8a 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }}
        .info-box {{ background: white; padding: 20px; margin: 15px 0; border-left: 4px solid #192A88; border-radius: 5px; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Update on Your Tutoring Request</h1>
        </div>
        <div class="content">
            <p>Dear {referral_request.parent.firstName} {referral_request.parent.lastName},</p>
            <p>Thank you for your tutoring request for <strong>{referral_request.student.firstName} {referral_request.student.lastName}</strong>.</p>

            <div class="info-box">
                <p>Unfortunately, {tutor_name} is unable to accept this request at this time.</p>
                <p><strong>However, your request has been automatically posted to our tutoring dashboard and is now visible to all our qualified tutors.</strong></p>
            </div>

            <div class="info-box">
                <h3>Request Details</h3>
                <p><strong>Subject:</strong> {referral_request.subject}<br>
                <strong>Grade:</strong> {referral_request.grade}<br>
                <strong>Service Type:</strong> {referral_request.service}</p>
            </div>

            <div class="info-box">
                <h3>What Happens Next?</h3>
                <p>You'll receive email notifications as tutors respond to your request.</p>
                <p>You can also view and manage responses in your EGS Tutoring dashboard.</p>
            </div>
        </div>
        <div class="footer">
            <p>Best regards,<br>The EGS Tutoring Team</p>
        </div>
    </div>
</body>
</html>
                        """

                        # Plain text version for email clients that don't support HTML
                        text_message = f"""
Dear {referral_request.parent.firstName} {referral_request.parent.lastName},

Thank you for your tutoring request for {referral_request.student.firstName} {referral_request.student.lastName}.

Unfortunately, {tutor_name} is unable to accept this request at this time.

However, your request has been automatically posted to our tutoring dashboard and is now visible to all our qualified tutors.

Request Details:
Subject: {referral_request.subject}
Grade: {referral_request.grade}
Service Type: {referral_request.service}

What Happens Next?
You'll receive email notifications as tutors respond to your request.
You can also view and manage responses in your EGS Tutoring dashboard.

Best regards,
The EGS Tutoring Team
                        """

                        send_mailgun_email(
                            to_emails=[referral_request.parent.email],
                            subject=subject,
                            text_content=text_message.strip(),
                            html_content=html_message
                        )
                        print(f"Sent decline email to parent: {referral_request.parent.email}")
                except Exception as e:
                    logger.error(f"Failed to send parent decline email: {e}")

                # Notify other tutors about new request
                try:
                    from playground.tasks import send_new_request_notification_async

                    tutors_with_notifications = User.objects.filter(
                        roles='tutor',
                        email_notifications_enabled=True,
                        email_new_requests=True,
                        email__isnull=False
                    ).exclude(email='')

                    if tutors_with_notifications.exists():
                        tutor_emails = list(tutors_with_notifications.values_list('email', flat=True))
                        parent_name = f"{referral_request.parent.firstName} {referral_request.parent.lastName}"
                        student_name = f"{referral_request.student.firstName} {referral_request.student.lastName}"

                        send_new_request_notification_async.delay(
                            tutor_emails,
                            parent_name,
                            student_name,
                            referral_request.subject,
                            referral_request.grade,
                            referral_request.service,
                            tutoring_request.id
                        )
                        print(f"Notified {len(tutor_emails)} tutors about declined referral request")
                except Exception as e:
                    logger.error(f"Failed to notify tutors about declined referral: {e}")

                return Response({
                    'message': 'Referral request declined. Request posted to dashboard for all tutors.',
                    'tutoring_request_id': tutoring_request.id
                }, status=status.HTTP_200_OK)

        except TutorReferralRequest.DoesNotExist:
            return Response({
                'error': 'Referral request not found or already processed'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error processing referral request: {e}")
            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DiscountRegistrationView(APIView):
    """
    View for handling discount registrations.
    Admin-only access.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Check if user is admin
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({
                'error': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)

        # Import the serializer
        from playground.serializers import DiscountRegistrationSerializer

        serializer = DiscountRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Discount registration saved successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)

        return Response({
            'error': 'Invalid data',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class AdminSendParentEmailsView(APIView):
    """
    Admin endpoint to send bulk emails to all unique parent emails
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all unique parent emails"""
        # Only allow superusers/admins
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        try:
            # Get all users with role 'parent' and unique emails
            parents = User.objects.filter(
                roles='parent',
                email__isnull=False
            ).exclude(email='').values_list('email', flat=True).distinct()

            parent_emails = list(parents)

            return Response({
                'parent_emails': parent_emails,
                'count': len(parent_emails)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching parent emails: {e}")
            return Response({
                'error': f'Error fetching parent emails: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Send email to all unique parent emails"""
        # Only allow superusers/admins
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        try:
            # Get parameters from request
            subject = request.data.get('subject', 'Important Update from EGS Tutoring')
            message_body = request.data.get('message_body', '')
            bcc_emails = request.data.get('bcc_emails', '')  # Comma-separated string

            if not subject or not message_body:
                return Response({
                    'error': 'Subject and body are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Wrap plain text message in HTML template
            html_body = wrap_message_in_html_template(message_body)

            # Get all unique parent emails
            parents = User.objects.filter(
                roles='parent',
                email__isnull=False
            ).exclude(email='').values_list('email', flat=True).distinct()

            parent_emails = list(parents)

            if not parent_emails:
                return Response({
                    'error': 'No parent emails found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Prepare attachments from uploaded files
            files_data = []
            for key in request.FILES:
                uploaded_file = request.FILES[key]
                # Store file content for reuse
                file_content = uploaded_file.read()
                files_data.append((uploaded_file.name, file_content, uploaded_file.content_type))

            # Parse BCC emails if provided
            bcc_list = []
            if bcc_emails:
                bcc_list = [email.strip() for email in bcc_emails.split(',') if email.strip()]

            # Send individual emails to each parent
            sent_count = 0
            failed_count = 0
            failed_emails = []

            for parent_email in parent_emails:
                try:
                    # Prepare email data for this recipient
                    data = {
                        "from": "EGS Tutoring <info@egstutoring-portal.ca>",
                        "to": [parent_email],
                        "subject": subject,
                        "html": html_body,
                        "h:Reply-To": "info@egstutoring.ca",
                    }

                    # Add BCC if provided
                    if bcc_list:
                        data["bcc"] = bcc_list

                    # Prepare files for this request
                    files_for_request = []
                    if files_data:
                        for file_name, file_content, content_type in files_data:
                            files_for_request.append(('attachment', (file_name, file_content, content_type)))

                    # Send email using Mailgun API with file attachments
                    response = requests.post(
                        settings.MAILGUN_API_URL,
                        auth=("api", settings.MAILGUN_API_KEY),
                        data=data,
                        files=files_for_request if files_for_request else None,
                        timeout=30
                    )

                    if response.status_code == 200:
                        sent_count += 1
                    else:
                        failed_count += 1
                        failed_emails.append(parent_email)
                        logger.error(f"Failed to send to {parent_email}: {response.status_code} - {response.text}")

                except Exception as e:
                    failed_count += 1
                    failed_emails.append(parent_email)
                    logger.error(f"Exception sending to {parent_email}: {e}")

            logger.info(f"Parent emails: {sent_count} sent, {failed_count} failed by admin {request.user.email}")

            return Response({
                'detail': f'Emails sent to {sent_count} parents, {failed_count} failed',
                'sent_count': sent_count,
                'failed_count': failed_count,
                'failed_emails': failed_emails,
                'attachments_count': len(files_data),
                'bcc_count': len(bcc_list) if bcc_list else 0
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error sending parent emails: {e}")
            return Response({
                'error': f'Error sending parent emails: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSendTutorEmailsView(APIView):
    """
    Admin endpoint to send bulk emails to all tutors with custom subject/body/attachments
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all tutor emails"""
        # Only allow superusers/admins
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        try:
            # Get all users with role 'tutor'
            tutors = User.objects.filter(
                roles='tutor',
                email__isnull=False
            ).exclude(email='').values_list('email', flat=True).distinct()

            tutor_emails = list(tutors)

            return Response({
                'tutor_emails': tutor_emails,
                'count': len(tutor_emails)
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching tutor emails: {e}")
            return Response({
                'error': f'Error fetching tutor emails: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        """Send email to all tutors with custom subject/body/attachments"""
        # Only allow superusers/admins
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        try:
            # Get parameters from request
            subject = request.data.get('subject', '')
            body = request.data.get('body', '')
            bcc_emails = request.data.get('bcc_emails', '')  # Comma-separated string

            if not subject or not body:
                return Response({
                    'error': 'Subject and body are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Wrap plain text message in HTML template
            html_body = wrap_message_in_html_template(body)

            # Get all tutor emails
            tutors = User.objects.filter(
                roles='tutor',
                email__isnull=False
            ).exclude(email='').values_list('email', flat=True).distinct()

            tutor_emails = list(tutors)

            if not tutor_emails:
                return Response({
                    'error': 'No tutor emails found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Prepare attachments from uploaded files
            files_data = []
            for key in request.FILES:
                uploaded_file = request.FILES[key]
                # Store file content for reuse
                file_content = uploaded_file.read()
                files_data.append((uploaded_file.name, file_content, uploaded_file.content_type))

            # Parse BCC emails if provided
            bcc_list = []
            if bcc_emails:
                bcc_list = [email.strip() for email in bcc_emails.split(',') if email.strip()]

            # Send individual emails to each tutor
            sent_count = 0
            failed_count = 0
            failed_emails = []

            for tutor_email in tutor_emails:
                try:
                    # Prepare email data for this recipient
                    data = {
                        "from": "EGS Tutoring <info@egstutoring-portal.ca>",
                        "to": [tutor_email],
                        "subject": subject,
                        "html": html_body,
                        "h:Reply-To": "info@egstutoring.ca",
                    }

                    # Add BCC if provided
                    if bcc_list:
                        data["bcc"] = bcc_list

                    # Prepare files for this request
                    files_for_request = []
                    if files_data:
                        for file_name, file_content, content_type in files_data:
                            files_for_request.append(('attachment', (file_name, file_content, content_type)))

                    # Send email using Mailgun API with file attachments
                    response = requests.post(
                        settings.MAILGUN_API_URL,
                        auth=("api", settings.MAILGUN_API_KEY),
                        data=data,
                        files=files_for_request if files_for_request else None,
                        timeout=30
                    )

                    if response.status_code == 200:
                        sent_count += 1
                    else:
                        failed_count += 1
                        failed_emails.append(tutor_email)
                        logger.error(f"Failed to send to {tutor_email}: {response.status_code} - {response.text}")

                except Exception as e:
                    failed_count += 1
                    failed_emails.append(tutor_email)
                    logger.error(f"Exception sending to {tutor_email}: {e}")

            logger.info(f"Tutor emails: {sent_count} sent, {failed_count} failed by admin {request.user.email}")

            return Response({
                'detail': f'Emails sent to {sent_count} tutors, {failed_count} failed',
                'sent_count': sent_count,
                'failed_count': failed_count,
                'failed_emails': failed_emails,
                'attachments_count': len(files_data),
                'bcc_count': len(bcc_list) if bcc_list else 0
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error sending tutor emails: {e}")
            return Response({
                'error': f'Error sending tutor emails: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AdminSendCustomEmailsView(APIView):
    """
    Admin endpoint to send bulk emails to a custom list of email addresses
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Send email to custom list of email addresses"""
        # Only allow superusers/admins
        if not request.user.is_superuser and request.user.roles != 'admin':
            return Response({"error": "Admin access required"}, status=403)

        try:
            # Get parameters from request
            subject = request.data.get('subject', '')
            message_body = request.data.get('message_body', '')
            email_list = request.data.get('email_list', '')  # Comma-separated or newline-separated
            bcc_emails = request.data.get('bcc_emails', '')

            if not subject or not message_body:
                return Response({
                    'error': 'Subject and body are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Wrap plain text message in HTML template
            html_body = wrap_message_in_html_template(message_body)

            if not email_list:
                return Response({
                    'error': 'Email list is required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Parse email list (support both comma and newline separated)
            custom_emails = []
            for email in email_list.replace('\n', ',').split(','):
                email = email.strip()
                if email and '@' in email:
                    custom_emails.append(email)

            if not custom_emails:
                return Response({
                    'error': 'No valid email addresses found'
                }, status=status.HTTP_404_NOT_FOUND)

            # Parse BCC emails if provided
            bcc_list = []
            if bcc_emails:
                bcc_list = [email.strip() for email in bcc_emails.split(',') if email.strip()]

            # Prepare attachments from uploaded files
            files_data = []
            for key in request.FILES:
                uploaded_file = request.FILES[key]
                # Store file content for reuse
                file_content = uploaded_file.read()
                files_data.append((uploaded_file.name, file_content, uploaded_file.content_type))

            # Send individual emails to each address
            sent_count = 0
            failed_count = 0
            failed_emails = []

            for email_address in custom_emails:
                try:
                    # Prepare email data for this recipient
                    data = {
                        "from": "EGS Tutoring <info@egstutoring-portal.ca>",
                        "to": [email_address],
                        "subject": subject,
                        "html": html_body,
                        "h:Reply-To": "info@egstutoring.ca",
                    }

                    # Add BCC if provided
                    if bcc_list:
                        data["bcc"] = bcc_list

                    # Prepare files for this request
                    files_for_request = []
                    if files_data:
                        for file_name, file_content, content_type in files_data:
                            files_for_request.append(('attachment', (file_name, file_content, content_type)))

                    # Send email using Mailgun API
                    response = requests.post(
                        settings.MAILGUN_API_URL,
                        auth=("api", settings.MAILGUN_API_KEY),
                        data=data,
                        files=files_for_request if files_for_request else None,
                        timeout=30
                    )

                    if response.status_code == 200:
                        sent_count += 1
                    else:
                        failed_count += 1
                        failed_emails.append(email_address)
                        logger.error(f"Failed to send to {email_address}: {response.status_code} - {response.text}")

                except Exception as e:
                    failed_count += 1
                    failed_emails.append(email_address)
                    logger.error(f"Exception sending to {email_address}: {e}")

            logger.info(f"Custom emails: {sent_count} sent, {failed_count} failed by admin {request.user.email}")

            return Response({
                'detail': f'Emails sent to {sent_count} recipients, {failed_count} failed',
                'sent_count': sent_count,
                'failed_count': failed_count,
                'failed_emails': failed_emails,
                'attachments_count': len(files_data),
                'bcc_count': len(bcc_list) if bcc_list else 0
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error sending custom emails: {e}")
            return Response({
                'error': f'Error sending custom emails: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_unpaid_invoice_reminders(request):
    """
    Send reminder emails to all parents with unpaid invoices.
    Admin only. Emails are sent via BCC.
    """
    user = request.user

    # Check if user is admin
    if not (user.is_staff or user.is_superuser):
        return Response({
            'error': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        # Get all parents (users with role 'parent')
        User = get_user_model()
        parents = User.objects.filter(roles='parent', is_active=True)

        parents_with_unpaid = []

        # Check each parent for unpaid invoices in Stripe
        for parent in parents:
            if not parent.email:
                continue

            try:
                # Try to find Stripe customer
                customers = stripe.Customer.list(email=parent.email, limit=1)

                if customers.data:
                    customer = customers.data[0]

                    # Check for unpaid invoices
                    invoices = stripe.Invoice.list(
                        customer=customer.id,
                        status='open',  # Unpaid invoices
                        limit=100
                    )

                    # Filter invoices that are overdue by more than 10 days
                    if invoices.data:
                        current_time = timezone.now().timestamp()
                        ten_days_ago = current_time - (10 * 24 * 60 * 60)  # 10 days in seconds

                        overdue_invoices = [
                            inv for inv in invoices.data
                            if inv.due_date and inv.due_date < ten_days_ago
                        ]

                        if overdue_invoices:
                            # This parent has invoices overdue by more than 10 days
                            total_unpaid = sum(inv.amount_due / 100 for inv in overdue_invoices)
                            parents_with_unpaid.append({
                                'email': parent.email,
                                'name': f"{parent.firstName} {parent.lastName}",
                                'unpaid_count': len(overdue_invoices),
                                'total_unpaid': total_unpaid
                            })
            except stripe.error.StripeError as e:
                logger.warning(f"Stripe error for {parent.email}: {str(e)}")
                continue
            except Exception as e:
                logger.warning(f"Error checking invoices for {parent.email}: {str(e)}")
                continue

        if not parents_with_unpaid:
            return Response({
                'message': 'No parents with unpaid invoices found',
                'sent_count': 0
            }, status=status.HTTP_200_OK)

        # Prepare email content
        subject = "Reminder: Outstanding Invoice Payment - EGS Tutoring"

        # Get the site domain
        site_domain = settings.SITE_URL if hasattr(settings, 'SITE_URL') else 'https://egstutoring-portal.ca'
        invoices_url = f"{site_domain}/ViewInvoices"

        # HTML email template
        html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }}
        .header {{
            background-color: #192A88;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 5px 5px 0 0;
        }}
        .content {{
            background-color: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-top: none;
        }}
        .button {{
            display: inline-block;
            background-color: #192A88;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
        }}
        .footer {{
            background-color: #f1f1f1;
            padding: 20px;
            text-align: center;
            font-size: 0.9em;
            color: #666;
            border-radius: 0 0 5px 5px;
        }}
        .highlight {{
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>EGS Tutoring</h1>
    </div>

    <div class="content">
        <h2>Outstanding Invoice Reminder</h2>

        <p>Dear Parent,</p>

        <p>This is a friendly reminder that you have outstanding invoice(s) that require payment.</p>

        <div class="highlight">
            <strong>Action Required:</strong> Please review and pay your outstanding invoices at your earliest convenience.
        </div>

        <p>To view and pay your invoices, please click the button below:</p>

        <div style="text-align: center;">
            <a href="{invoices_url}" class="button">View My Invoices</a>
        </div>

        <p>If you have any questions or concerns about your invoices, please don't hesitate to contact us at <a href="mailto:support@egstutoring.ca">support@egstutoring.ca</a>.</p>

        <p>Thank you for your prompt attention to this matter.</p>

        <p>Best regards,<br>
        <strong>EGS Tutoring Team</strong></p>
    </div>

    <div class="footer">
        <p>EGS Tutoring Portal<br>
        <a href="mailto:support@egstutoring.ca">support@egstutoring.ca</a></p>
        <p><small>This is an automated reminder. Please do not reply to this email.</small></p>
    </div>
</body>
</html>
"""

        # Plain text version
        text_content = f"""
EGS Tutoring - Outstanding Invoice Reminder

Dear Parent,

This is a friendly reminder that you have outstanding invoice(s) that require payment.

To view and pay your invoices, please visit:
{invoices_url}

If you have any questions or concerns about your invoices, please contact us at support@egstutoring.ca.

Thank you for your prompt attention to this matter.

Best regards,
EGS Tutoring Team

---
EGS Tutoring Portal
support@egstutoring.ca
"""

        # Collect all email addresses for BCC
        bcc_emails = [parent['email'] for parent in parents_with_unpaid]

        # Send email using Mailgun with BCC
        from .email_utils import send_mailgun_email

        # For BCC, we need to send using Mailgun's BCC feature
        # We'll send to a dummy address and BCC everyone
        mailgun_url = settings.MAILGUN_API_URL
        mailgun_api_key = settings.MAILGUN_API_KEY
        from_email = settings.DEFAULT_FROM_EMAIL

        data = {
            "from": from_email,
            "to": from_email,  # Send to ourselves
            "bcc": bcc_emails,  # All parents in BCC
            "subject": subject,
            "text": text_content,
            "html": html_content,
            "h:Reply-To": "support@egstutoring.ca",
        }

        response = requests.post(
            mailgun_url,
            auth=("api", mailgun_api_key),
            data=data,
            timeout=30
        )

        if response.status_code == 200:
            logger.info(f"Unpaid invoice reminders sent to {len(bcc_emails)} parents by admin {request.user.email}")

            return Response({
                'message': 'Invoice reminders sent successfully',
                'sent_count': len(bcc_emails),
                'recipients': parents_with_unpaid
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"Failed to send invoice reminders: {response.status_code} - {response.text}")
            return Response({
                'error': f'Failed to send emails: {response.text}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        logger.error(f"Error sending unpaid invoice reminders: {str(e)}")
        return Response({
            'error': f'Error sending reminders: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

