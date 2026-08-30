import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def _verification_button_html(url, label='Verify My Email'):
    """A real, styled <a> button plus a plain fallback link - used instead of
    relying on email clients to auto-linkify a bare URL in plain text."""
    return f"""
            <div style="text-align: center; margin: 28px 0;">
                <a href="{url}" style="background: #192A88; color: #ffffff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; font-size: 1rem;">
                    {label}
                </a>
            </div>
            <p style="font-size: 0.85em; color: #666; word-break: break-all;">
                Or copy and paste this link into your browser:<br>
                <a href="{url}" style="color: #192A88;">{url}</a>
            </p>"""


def build_verification_email_content(user, verify_url):
    """Build (subject, text_content, html_content) for an account
    verification email, tailored to the user's role. Shared by both the
    async Celery task and the synchronous fallback paths (used when the
    Celery broker is unreachable) so every verification email - regardless
    of which code path sends it - contains the same content and real,
    clickable HTML links rather than bare URLs."""
    base_url = settings.FRONTEND_URL

    if user.roles == 'parent':
        subject = 'Verify Your EGS Tutoring Account - Onboarding Guide'
        text_content = f"""
Hello {user.firstName},

Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:

{verify_url}

📋 GETTING STARTED - PARENT ONBOARDING GUIDE:

Welcome to EGS Tutoring! Here's how to get started as a parent:

1. ADD YOUR CHILDREN
   Once verified, visit the Students page to create accounts for your children:
   {base_url}/students

2. SUBMIT A TUTORING REQUEST
   Specify your child's tutoring needs:
   {base_url}/request-reply

3. REVIEW TUTORING REPLIES
   Check and accept tutor responses to your requests on the same page.

Additional Resources:
• Access your dashboard: {base_url}/home
• View invoices and billing: {base_url}/viewinvoices
• Manage your profile: {base_url}/settings

Our tutoring platform connects you with qualified tutors in your area. After verification, you can create student accounts for your children, submit specific tutoring requests, and review responses from available tutors.

If you didn't create this account, please ignore this email.

Best regards,
EGS Tutoring Team
        """
        html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #292929;">
                <h1 style="color: #192A88; text-align: center; margin-bottom: 20px;">Verify Your EGS Tutoring Account</h1>
                <p>Hello {user.firstName},</p>
                <p>Thank you for registering with EGS Tutoring! Please verify your email address to activate your account.</p>
                {_verification_button_html(verify_url)}
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 24px 0;">
                    <h3 style="color: #192A88; margin-top: 0;">📋 Getting Started - Parent Onboarding Guide</h3>
                    <ol style="padding-left: 1.2em; margin-bottom: 0.5em;">
                        <li style="margin-bottom: 10px;">
                            <strong>Add your children</strong><br>
                            Once verified, visit the <a href="{base_url}/students" style="color: #192A88;">Students page</a> to create accounts for your children.
                        </li>
                        <li style="margin-bottom: 10px;">
                            <strong>Submit a tutoring request</strong><br>
                            <a href="{base_url}/request-reply" style="color: #192A88;">Submit a request</a> specifying your child's tutoring needs.
                        </li>
                        <li>
                            <strong>Review tutoring replies</strong><br>
                            Check and accept tutor responses to your requests on the same page.
                        </li>
                    </ol>
                    <p style="margin-bottom: 0; margin-top: 12px;">
                        Also: <a href="{base_url}/home" style="color: #192A88;">Dashboard</a>
                        &nbsp;·&nbsp; <a href="{base_url}/viewinvoices" style="color: #192A88;">Invoices &amp; Billing</a>
                        &nbsp;·&nbsp; <a href="{base_url}/settings" style="color: #192A88;">Your Profile</a>
                    </p>
                </div>
                <p style="color: #666; font-size: 0.9em;">If you didn't create this account, please ignore this email.</p>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px;">
                    <p>Best regards,<br>The EGS Tutoring Team</p>
                </div>
            </div>
        """
    else:
        subject = 'Verify Your EGS Tutoring Account'
        text_content = f"""
Hello {user.firstName},

Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:

{verify_url}

If you didn't create this account, please ignore this email.

Best regards,
EGS Tutoring Team
        """
        html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #292929;">
                <h1 style="color: #192A88; text-align: center; margin-bottom: 20px;">Verify Your EGS Tutoring Account</h1>
                <p>Hello {user.firstName},</p>
                <p>Thank you for registering with EGS Tutoring! Please verify your email address to activate your account.</p>
                {_verification_button_html(verify_url)}
                <p style="color: #666; font-size: 0.9em;">If you didn't create this account, please ignore this email.</p>
                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px;">
                    <p>Best regards,<br>The EGS Tutoring Team</p>
                </div>
            </div>
        """

    return subject, text_content, html_content


def send_verification_email_sync(user, verify_url, fail_silently=True):
    """Send a verification email synchronously (both text and HTML
    alternatives) - used by the handful of call sites that either always
    send synchronously, or fall back to synchronous sending when the
    Celery broker is unreachable.

    Sends via the Mailgun API (send_mailgun_email) rather than Django's
    EmailMultiAlternatives/EMAIL_BACKEND - no EMAIL_BACKEND is configured
    anywhere in this project's settings, so django.core.mail silently falls
    back to the console backend (it prints to server logs instead of
    delivering anything). Routing through Mailgun keeps this fallback path
    consistent with how the primary async path actually sends mail."""
    subject, text_content, html_content = build_verification_email_content(user, verify_url)
    sent = send_mailgun_email(
        to_emails=[user.email],
        subject=subject,
        text_content=text_content,
        html_content=html_content,
        email_type='verification',
        recipient_name=f"{user.firstName} {user.lastName}",
    )
    if not sent and not fail_silently:
        raise RuntimeError(f"Failed to send verification email to {user.email} via Mailgun")


def _log_email(to_emails, subject, from_email, status, email_type='other', recipient_name='', error_message=''):
    """Write one EmailLog row per recipient. Never raises — logging must not break email delivery."""
    try:
        from playground.models import EmailLog
        emails = [to_emails] if isinstance(to_emails, str) else list(to_emails)
        for addr in emails:
            EmailLog.objects.create(
                recipient_email=addr,
                recipient_name=recipient_name,
                subject=subject,
                email_type=email_type,
                status=status,
                from_email=from_email or '',
                error_message=error_message,
            )
    except Exception as log_err:
        logger.warning(f"EmailLog write failed: {log_err}")


def send_mailgun_email(to_emails, subject, text_content, html_content=None, from_email=None, attachments=None, email_type='other', recipient_name=''):
    """
    Send email using Mailgun REST API with optional file attachments
    
    Args:
        attachments: List of file paths or tuples of (filename, file_content, content_type)
    """
    if not settings.MAILGUN_API_KEY:
        logger.warning("Mailgun API key not configured, skipping email")
        _log_email(to_emails, subject, from_email or settings.DEFAULT_FROM_EMAIL,
                   'skipped', email_type, recipient_name, 'Mailgun API key not configured')
        return False

    if not from_email:
        from_email = settings.DEFAULT_FROM_EMAIL
    
    # Ensure to_emails is a list
    if isinstance(to_emails, str):
        to_emails = [to_emails]
    
    data = {
        "from": from_email,
        "to": to_emails,
        "subject": subject,
        "text": text_content,
        # Add headers to improve deliverability, especially for Yahoo
        "h:Reply-To": "support@egstutoring-portal.ca",
        "h:X-Mailgun-Track": "yes",
        "h:X-Mailgun-Track-Clicks": "yes",
        "h:X-Mailgun-Track-Opens": "yes",
    }

    if html_content:
        data["html"] = html_content
    
    files = []
    try:
        # Handle attachments
        if attachments:
            import os
            from django.core.files.storage import default_storage
            
            logger.info(f"Processing {len(attachments)} attachments: {attachments}")
            
            for attachment in attachments:
                try:
                    if isinstance(attachment, str):
                        # File path provided
                        file_path = attachment
                        
                        # Handle both absolute and relative paths
                        if os.path.isabs(file_path):
                            # Absolute path - check directly on filesystem
                            if os.path.exists(file_path):
                                with open(file_path, 'rb') as f:
                                    filename = os.path.basename(file_path)
                                    file_content = f.read()
                                    files.append(('attachment', (filename, file_content)))
                                    logger.info(f"Added attachment: {filename}, size: {len(file_content)} bytes")
                            else:
                                logger.warning(f"Attachment file not found: {file_path}")
                        else:
                            # Relative path - use Django storage
                            if default_storage.exists(file_path):
                                with default_storage.open(file_path, 'rb') as f:
                                    filename = os.path.basename(file_path)
                                    files.append(('attachment', (filename, f.read())))
                            else:
                                logger.warning(f"Attachment file not found: {file_path}")
                    elif isinstance(attachment, tuple) and len(attachment) == 3:
                        # (filename, file_content, content_type) tuple
                        filename, file_content, content_type = attachment
                        files.append(('attachment', (filename, file_content)))
                    else:
                        logger.warning(f"Invalid attachment format: {attachment}")
                except Exception as attach_error:
                    logger.error(f"Error processing attachment {attachment}: {str(attach_error)}")
        
        # Send email with or without attachments
        response = requests.post(
            settings.MAILGUN_API_URL,
            auth=("api", settings.MAILGUN_API_KEY),
            data=data,
            files=files if files else None,
            timeout=30  # Increased timeout for file uploads
        )
        
        if response.status_code == 200:
            attachment_count = len(files) if files else 0
            logger.info(f"Email sent successfully to {to_emails} with {attachment_count} attachments")
            _log_email(to_emails, subject, from_email, 'sent', email_type, recipient_name)
            return True
        else:
            err = f"{response.status_code}: {response.text}"
            logger.error(f"Failed to send email: {err}")
            _log_email(to_emails, subject, from_email, 'failed', email_type, recipient_name, err)
            return False

    except Exception as e:
        logger.error(f"Error sending email via Mailgun: {str(e)}")
        _log_email(to_emails, subject, from_email, 'failed', email_type, recipient_name, str(e))
        return False