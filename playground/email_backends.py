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
            # Add headers to improve deliverability, especially for Yahoo
            'h:Reply-To': 'support@egstutoring-portal.ca',
            'h:X-Mailgun-Track': 'yes',
            'h:X-Mailgun-Track-Clicks': 'yes',
            'h:X-Mailgun-Track-Opens': 'yes',
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


def send_parent_invoice_notification(parent_email, parent_name, amount_dollars, due_date_str, stripe_invoice_url, description='Tutoring Sessions'):
    """
    Send a branded EGS billing email to the parent with their Stripe invoice payment link.
    Called immediately after the Stripe invoice is created and finalized.
    """
    from_email = "billing@egstutoring-portal.ca"
    subject = "Your EGS Tutoring Invoice is Ready"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #192A88; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">EGS Tutoring</h1>
            <p style="margin: 8px 0 0; font-size: 16px;">Invoice Ready for Payment</p>
        </div>

        <div style="background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
            <p>Hi {parent_name},</p>

            <p>Your invoice for <strong>{description}</strong> has been generated and is ready for payment.</p>

            <div style="background: white; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0 0 5px; color: #666; font-size: 14px;">Amount Due (before tax)</p>
                <p style="margin: 0; font-size: 32px; font-weight: bold; color: #192A88;">${amount_dollars:.2f} CAD</p>
                <p style="margin: 8px 0 0; color: #666; font-size: 13px;">+ 13% HST/Tax</p>
            </div>

            <p style="color: #555;">Payment is due by <strong>{due_date_str}</strong>. Please click the button below to view your invoice and complete payment securely through Stripe.</p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="{stripe_invoice_url}"
                   style="background-color: #192A88; color: white; padding: 14px 36px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold; display: inline-block;">
                    Pay Invoice Now
                </a>
            </div>

            <p style="font-size: 13px; color: #888;">Or copy and paste this link into your browser:<br>
               <a href="{stripe_invoice_url}" style="color: #192A88; word-break: break-all;">{stripe_invoice_url}</a>
            </p>
        </div>

        <div style="background-color: #f1f1f1; padding: 20px; text-align: center; border-radius: 0 0 5px 5px; font-size: 13px; color: #666;">
            <p style="margin: 0 0 5px;">Questions? Contact us at
               <a href="mailto:billing@egstutoring-portal.ca" style="color: #192A88;">billing@egstutoring-portal.ca</a>
            </p>
            <p style="margin: 0;">EGS Tutoring &mdash; Thank you for choosing us!</p>
        </div>
    </div>
    """

    text_content = f"""
    Hi {parent_name},

    Your EGS Tutoring invoice for {description} is ready.

    Amount Due (before tax): ${amount_dollars:.2f} CAD + 13% HST/Tax
    Due Date: {due_date_str}

    Pay now: {stripe_invoice_url}

    Questions? Email billing@egstutoring-portal.ca
    """

    return send_mailgun_email(from_email, parent_email, subject, html_content, text_content)


def send_admin_referral_notification(admin_email, sender_name, sender_email, receiver_email):
    """
    Send notification to admin when a new referral is created
    """
    from_email = "support@egstutoring-portal.ca"
    subject = "📧 New Referral Created - EGS Tutoring"

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #192A88; margin-bottom: 10px;">📧 New Referral</h1>
            <h2 style="color: #333; font-weight: normal;">A new referral has been sent</h2>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #192A88; margin-top: 0;">Referral Details</h3>

            <div style="margin-bottom: 15px;">
                <strong>From:</strong><br>
                {sender_name} ({sender_email})
            </div>

            <div style="margin-bottom: 15px;">
                <strong>To:</strong><br>
                {receiver_email}
            </div>
        </div>

        <div style="background: #e8f4fd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="color: #0c5aa6; margin: 0;">This is an automated notification that a referral has been sent through the EGS Tutoring platform.</p>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 14px;">
            <p>EGS Tutoring Admin Notifications</p>
        </div>
    </div>
    """

    text_content = f"""
    New Referral Created - EGS Tutoring

    A new referral has been sent through the platform.

    From: {sender_name} ({sender_email})
    To: {receiver_email}

    This is an automated notification from the EGS Tutoring platform.
    """

    return send_mailgun_email(from_email, admin_email, subject, html_content, text_content)