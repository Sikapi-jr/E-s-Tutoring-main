from django.db.models.signals import post_save
from django.dispatch import receiver
from playground.models import AiRequest
from playground.tasks import handle_ai_request_job
from django.core.mail import EmailMultiAlternatives
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.urls import reverse
from django.conf import settings

from django_rest_passwordreset.signals import reset_password_token_created

@receiver(post_save, sender=AiRequest) #This function is ran anytimes a new AiRequest object is saved
def queue_ai_request_job(sender, instance, created, **kwargs):
    if created: #Prevents duplicates, will only run once, when the object is created (not updated)
        print("Signal: queuing job for new AiRequest")
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