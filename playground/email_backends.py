"""
Custom email utilities for different sender addresses
"""
import requests
from django.conf import settings
from django.core.mail import EmailMessage
import logging

logger = logging.getLogger(__name__)


def send_mailgun_email(from_email, to_emails, subject, html_content, text_content=None):
    """
    Send email using Mailgun API with specified from_email address
    """
    if not settings.MAILGUN_API_KEY:
        logger.warning("Mailgun API key not configured. Using Django's default backend.")
        # Fallback to Django's default email backend
        email = EmailMessage(
            subject=subject,
            body=html_content,
            from_email=from_email,
            to=to_emails if isinstance(to_emails, list) else [to_emails]
        )
        email.content_subtype = "html"
        return email.send()
    
    try:
        data = {
            'from': from_email,
            'to': to_emails if isinstance(to_emails, list) else [to_emails],
            'subject': subject,
            'html': html_content,
        }
        
        if text_content:
            data['text'] = text_content
            
        response = requests.post(
            settings.MAILGUN_API_URL,
            auth=('api', settings.MAILGUN_API_KEY),
            data=data,
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info(f"Email sent successfully from {from_email} to {to_emails}")
            return True
        else:
            logger.error(f"Failed to send email: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending email via Mailgun: {e}")
        return False


def send_referral_congratulations_email(user_email, user_name, referral_amount):
    """
    Send congratulations email for referral bonus from billing@egstutoring-portal.ca
    """
    from_email = "billing@egstutoring-portal.ca"
    subject = "🎉 Congratulations! You've Earned a Referral Bonus!"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #192A88; margin-bottom: 10px;">🎉 Congratulations!</h1>
            <h2 style="color: #333; font-weight: normal;">You've earned a referral bonus!</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p>Hi {user_name},</p>
            
            <p>Great news! Your referral has completed their first 4 hours of tutoring sessions, and your <strong>${referral_amount:.2f} referral credit</strong> is now active and ready to use!</p>
            
            <div style="background: #28a745; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <strong>Referral Credit: ${referral_amount:.2f}</strong>
            </div>
            
            <p>This credit will automatically be applied to your future invoices, helping you save on tutoring costs. The more friends and family you refer, the more you save!</p>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #856404; margin-top: 0;">Keep Sharing & Keep Saving!</h3>
            <p style="color: #856404; margin-bottom: 0;">Each successful referral earns you another ${referral_amount:.2f} credit. Share your referral code with friends and family to maximize your savings!</p>
        </div>
        
        <p>Thank you for helping grow the EGS Tutoring community!</p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px;">
            <p>Best regards,<br>The EGS Tutoring Team</p>
            <p>Questions? Contact us at <a href="mailto:support@egstutoring-portal.ca">support@egstutoring-portal.ca</a></p>
        </div>
    </div>
    """
    
    text_content = f"""
    Congratulations! You've earned a referral bonus!
    
    Hi {user_name},
    
    Great news! Your referral has completed their first 4 hours of tutoring sessions, and your ${referral_amount:.2f} referral credit is now active and ready to use!
    
    This credit will automatically be applied to your future invoices, helping you save on tutoring costs. The more friends and family you refer, the more you save!
    
    Keep sharing & keep saving! Each successful referral earns you another ${referral_amount:.2f} credit.
    
    Thank you for helping grow the EGS Tutoring community!
    
    Best regards,
    The EGS Tutoring Team
    
    Questions? Contact us at support@egstutoring-portal.ca
    """
    
    return send_mailgun_email(from_email, user_email, subject, html_content, text_content)


def send_tutor_transfer_notification(tutor_email, tutor_name, transfer_amount, stripe_dashboard_url=None):
    """
    Send transfer notification to tutor from paystubs@egstutoring-portal.ca
    """
    from_email = "paystubs@egstutoring-portal.ca"
    subject = "💰 Payment Transfer Processed - EGS Tutoring"
    
    # Default Stripe dashboard URL if not provided
    if not stripe_dashboard_url:
        stripe_dashboard_url = "https://dashboard.stripe.com/connect/accounts"
    
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #192A88; margin-bottom: 10px;">💰 Payment Processed</h1>
            <h2 style="color: #333; font-weight: normal;">Your tutoring payment has been transferred</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p>Hi {tutor_name},</p>
            
            <p>Your tutoring payment has been successfully processed and transferred to your Stripe account.</p>
            
            <div style="background: #28a745; color: white; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <strong>Transfer Amount: ${transfer_amount:.2f}</strong>
            </div>
            
            <p>The funds should appear in your connected bank account within 1-2 business days, depending on your bank's processing time.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{stripe_dashboard_url}" style="background: #635bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                View Stripe Dashboard
            </a>
        </div>
        
        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #0c5aa6; margin-top: 0;">Need Help?</h3>
            <p style="color: #0c5aa6; margin-bottom: 0;">If you have any questions about your payment or need to update your bank account details, please check your Stripe dashboard or contact our support team.</p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px;">
            <p>Best regards,<br>The EGS Tutoring Payments Team</p>
            <p>Questions? Contact us at <a href="mailto:support@egstutoring-portal.ca">support@egstutoring-portal.ca</a></p>
        </div>
    </div>
    """
    
    text_content = f"""
    Payment Transfer Processed - EGS Tutoring
    
    Hi {tutor_name},
    
    Your tutoring payment has been successfully processed and transferred to your Stripe account.
    
    Transfer Amount: ${transfer_amount:.2f}
    
    The funds should appear in your connected bank account within 1-2 business days, depending on your bank's processing time.
    
    View your Stripe Dashboard: {stripe_dashboard_url}
    
    Need help? If you have any questions about your payment or need to update your bank account details, please check your Stripe dashboard or contact our support team.
    
    Best regards,
    The EGS Tutoring Payments Team
    
    Questions? Contact us at support@egstutoring-portal.ca
    """
    
    return send_mailgun_email(from_email, tutor_email, subject, html_content, text_content)