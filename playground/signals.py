from django.db.models.signals import post_save
from django.dispatch import receiver
from playground.models import AiRequest
from django.contrib.auth import get_user_model
from django.core.mail import EmailMultiAlternatives
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.urls import reverse
from django.conf import settings
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
    :param sender: View Class that sent the signal
    :param instance: View Instance that sent the signal
    :param reset_password_token: Token Model Object
    :param args:
    :param kwargs:
    :return:
    """
    # send an e-mail to the user
    context = {
        'current_user': reset_password_token.user,
        'username': reset_password_token.user.username,
        'email': reset_password_token.user.email,
        'reset_password_url': f"{settings.FRONTEND_URL}/reset-password/?token={reset_password_token.key}",
    }
    # render email text
    email_html_message = render_to_string('email/password_reset_email.html', context)
    email_plaintext_message = render_to_string('email/password_reset_email.txt', context)

    msg = EmailMultiAlternatives(
        # title:
        "Password Reset for {title}".format(title="EGS TUTORING PORTAL"),
        # message:
        email_plaintext_message,
        # from:
        settings.DEFAULT_FROM_EMAIL,
        # to:
        [reset_password_token.user.email]
    )
    msg.attach_alternative(email_html_message, "text/html")
    msg.send()


@receiver(post_save, sender=User)
def create_mapulus_pin_on_signup(sender, instance, created, **kwargs):
    """
    Automatically create a pin on Mapulus map when a new user signs up
    """
    if created and instance.address and instance.city and instance.firstName and instance.lastName:
        try:
            from playground.mapulus_service import mapulus_service
            
            # Prepare user data for pin creation
            user_data = {
                'id': instance.id,
                'firstName': instance.firstName,
                'lastName': instance.lastName,
                'address': instance.address,
                'city': instance.city,
                'roles': instance.roles,
            }
            
            # Create the pin asynchronously to avoid blocking user registration
            try:
                from playground.tasks import create_mapulus_pin_async
                create_mapulus_pin_async.delay(user_data)
                logger.info(f"Queued Mapulus pin creation for user {instance.id} - {instance.firstName} {instance.lastName}")
            except ImportError:
                # Fallback: create pin synchronously if Celery is not available
                success = mapulus_service.create_pin(user_data)
                if success:
                    logger.info(f"Created Mapulus pin for user {instance.id} - {instance.firstName} {instance.lastName}")
                else:
                    logger.error(f"Failed to create Mapulus pin for user {instance.id}")
                    
        except Exception as e:
            logger.error(f"Error creating Mapulus pin for user {instance.id}: {e}")


@receiver(post_save, sender=User)
def update_mapulus_pin_on_change(sender, instance, created, **kwargs):
    """
    Update Mapulus pin when user profile is updated (not on creation)
    """
    if not created and instance.address and instance.city and instance.firstName and instance.lastName:
        try:
            from playground.mapulus_service import mapulus_service
            
            # Prepare updated user data
            user_data = {
                'id': instance.id,
                'firstName': instance.firstName,
                'lastName': instance.lastName,
                'address': instance.address,
                'city': instance.city,
                'roles': instance.roles,
            }
            
            # Update the pin asynchronously
            try:
                from playground.tasks import update_mapulus_pin_async
                update_mapulus_pin_async.delay(user_data)
                logger.info(f"Queued Mapulus pin update for user {instance.id} - {instance.firstName} {instance.lastName}")
            except ImportError:
                # Fallback: update pin synchronously
                success = mapulus_service.update_pin(user_data)
                if success:
                    logger.info(f"Updated Mapulus pin for user {instance.id} - {instance.firstName} {instance.lastName}")
                else:
                    logger.warning(f"Failed to update Mapulus pin for user {instance.id}")
                    
        except Exception as e:
            logger.error(f"Error updating Mapulus pin for user {instance.id}: {e}")