import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def send_mailgun_email(to_emails, subject, text_content, html_content=None, from_email=None):
    """
    Send email using Mailgun REST API
    """
    if not settings.MAILGUN_API_KEY:
        logger.warning("Mailgun API key not configured, skipping email")
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
        "text": text_content
    }
    
    if html_content:
        data["html"] = html_content
    
    try:
        response = requests.post(
            settings.MAILGUN_API_URL,
            auth=("api", settings.MAILGUN_API_KEY),
            data=data,
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info(f"Email sent successfully to {to_emails}")
            return True
        else:
            logger.error(f"Failed to send email: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending email via Mailgun: {str(e)}")
        return False