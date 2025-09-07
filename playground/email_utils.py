import requests
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def send_mailgun_email(to_emails, subject, text_content, html_content=None, from_email=None, attachments=None):
    """
    Send email using Mailgun REST API with optional file attachments
    
    Args:
        attachments: List of file paths or tuples of (filename, file_content, content_type)
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
    
    files = []
    try:
        # Handle attachments
        if attachments:
            import os
            from django.core.files.storage import default_storage
            
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
                                    files.append(('attachment', (filename, f.read())))
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
            return True
        else:
            logger.error(f"Failed to send email: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending email via Mailgun: {str(e)}")
        return False