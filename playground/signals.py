from django.db.models.signals import post_save
from django.dispatch import receiver
from playground.models import AiRequest
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.urls import reverse
from django.conf import settings
from playground.email_utils import send_mailgun_email
import logging

from django_rest_passwordreset.signals import reset_password_token_created

User = get_user_model()
logger = logging.getLogger(__name__)

@receiver(post_save, sender=AiRequest) #This function is ran anytimes a new AiRequest object is saved
def queue_ai_request_job(sender, instance, created, **kwargs):
    if created: #Prevents duplicates, will only run once, when the object is created (not updated)
        print("Signal: queuing job for new AiRequest")
        # Import at runtime to avoid circular imports
        from playground.tasks import handle_ai_request_job
        handle_ai_request_job.delay(instance.id)

@receiver(reset_password_token_created)
def password_reset_token_created(sender, instance, reset_password_token, *args, **kwargs):
    """
    Handles password reset tokens
    When a token is created, an e-mail needs to be sent to the user
    Uses Mailgun instead of SMTP to avoid connection issues
    """
    try:
        user = reset_password_token.user
        reset_url = f"{settings.FRONTEND_URL}/password-reset-confirm/{user.id}/{reset_password_token.key}"
        
        subject = "Password Reset for EGS Tutoring Portal"
        
        # Create a simple text message since we're using Mailgun
        message = f"""
Hello {user.firstName or user.username},

You have requested to reset your password for your EGS Tutoring account.

Please click the following link to reset your password:
{reset_url}

If you did not request this password reset, please ignore this email.

Best regards,
EGS Tutoring Team
        """
        
        # Use Mailgun API instead of Django's SMTP
        send_mailgun_email(
            to_emails=[user.email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Password reset email sent via Mailgun to {user.email}")
        
    except Exception as e:
        logger.error(f"Error sending password reset email: {str(e)}")
        # Don't raise the exception to prevent the password reset from failing completely


@receiver(post_save, sender=User)
def geocode_and_map_user(sender, instance, created, **kwargs):
    """
    Automatically geocode user address and add pin to Mapulus map
    - On creation: geocode if tutor/parent with address
    - On update: regeocode if address/city changed
    """
    # Only process tutors and parents
    if instance.roles not in ['tutor', 'parent']:
        return

    # Must have address and city
    if not instance.address or not instance.city:
        return

    try:
        from playground.mapulus_service import geocode_user_address, add_user_to_map

        needs_geocoding = False

        if created:
            # New user
            needs_geocoding = True
            logger.info(f"New {instance.roles} created: {instance.firstName} {instance.lastName}. Will geocode and map.")
        else:
            # Check if address or city changed (requires django-model-utils)
            try:
                from model_utils import FieldTracker
                if hasattr(instance, 'tracker'):
                    if instance.tracker.has_changed('address') or instance.tracker.has_changed('city'):
                        needs_geocoding = True
                        logger.info(f"{instance.roles.capitalize()} {instance.id} address changed. Will regeocode.")
            except:
                # If model_utils not available, always regeocode on save
                if instance.latitude is None or instance.longitude is None:
                    needs_geocoding = True

        if needs_geocoding:
            # Geocode the address
            success = geocode_user_address(instance)

            if success:
                # Add/update marker on Mapulus map
                add_user_to_map(instance)
                logger.info(f"Successfully geocoded and mapped {instance.roles} {instance.id}")
            else:
                logger.warning(f"Failed to geocode {instance.roles} {instance.id}")

    except Exception as e:
        logger.error(f"Error geocoding/mapping user {instance.id}: {e}")