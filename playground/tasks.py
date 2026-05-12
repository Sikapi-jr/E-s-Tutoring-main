from celery import shared_task
import stripe
import logging
from django.core.mail import send_mail
from django.conf import settings
from playground import models
from playground.models import User
from playground.email_utils import send_mailgun_email
from celery.exceptions import Retry

logger = logging.getLogger(__name__)

@shared_task
def hello_task(name):
    print(f"Hello {name}. You have {len(name)} characters in your name")

@shared_task
def handle_ai_request_job(ai_request_id):
    models.AiRequest.objects.get(id=ai_request_id).handle() #Ensures the handle method in models will be ran in the background

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_stripe_account_async(self, user_id):
    """
    Create Stripe Express account for tutor asynchronously
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Create Stripe Express account
        account = stripe.Account.create(
            type='express',
            country='CA',
            email=user.email,
            capabilities={
                'card_payments': {'requested': True},
                'transfers': {'requested': True},
            },
        )
        
        # Generate tokens for refresh URL (same as stripe_reauth_token view)
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode
        from django.contrib.auth.tokens import default_token_generator
        from urllib.parse import quote
        
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        
        # URL encode the token to ensure it's safe for Stripe
        encoded_uid = quote(uid.decode() if isinstance(uid, bytes) else uid, safe='')
        encoded_token = quote(token, safe='')
        
        # Create account link
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f'{settings.FRONTEND_URL}/stripe-reauth/{encoded_uid}/{encoded_token}',
            return_url=f'{settings.FRONTEND_URL}/settings',
            type='account_onboarding',
        )
        
        # Update user with Stripe account info
        user.stripe_account_id = account.id
        user.save()
        
        logger.info(f"Stripe account created for user {user_id}: {account.id}")
        
        # Return the onboarding link instead of sending separate email
        return {
            'success': True,
            'account_id': account.id,
            'onboarding_link': account_link.url
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating account for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Unexpected error creating Stripe account for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_verification_email_async(self, user_id, verification_link):
    """
    Send user verification email asynchronously
    """
    try:
        user = User.objects.get(id=user_id)
        
        subject = 'Verify Your EGS Tutoring Account'
        
        # Different message based on user role
        if user.roles == 'parent':
            subject = 'Verify Your EGS Tutoring Account - Onboarding Guide'
            message = f"""
Hello {user.firstName},

Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:

{verification_link}

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

Our tutoring platform connects you with qualified tutors in your area. After verification, you can create student accounts for your children, submit specific tutoring requests, and review responses from available tutors.

If you didn't create this account, please ignore this email.

Best regards,
EGS Tutoring Team
            """
        else:
            message = f"""
Hello {user.firstName},
        
Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:
        
{verification_link}
        
If you didn't create this account, please ignore this email.
        
Best regards,
EGS Tutoring Team
            """

        # Use Mailgun API
        send_mailgun_email(
            to_emails=[user.email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Verification email sent to user {user_id} ({user.email})")
        return {'success': True, 'email': user.email}
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for verification email")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Error sending verification email to user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_stripe_onboarding_email_async(self, user_id, onboarding_link):
    """
    Send Stripe onboarding email to tutors asynchronously
    """
    try:
        user = User.objects.get(id=user_id)
        
        subject = 'Complete Your EGS Tutoring Payment Setup'
        message = f"""
        Hello {user.firstName},
        
        Welcome to EGS Tutoring! To start receiving payments, please complete your payment account setup:
        
        {onboarding_link}
        
        This secure link will guide you through setting up your payment information with our payment processor.
        
        Best regards,
        EGS Tutoring Team
        """
        
        # Use Mailgun API instead of Django's send_mail
        send_mailgun_email(
            to_emails=[user.email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Stripe onboarding email sent to user {user_id} ({user.email})")
        return {'success': True, 'email': user.email}
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for onboarding email")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Error sending onboarding email to user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_tutor_welcome_email_async(self, user_id, verification_link, stripe_onboarding_link=None):
    """
    Send welcome email to admin-created tutors with verification and Stripe onboarding info
    """
    try:
        import os
        user = User.objects.get(id=user_id)
        
        # Include actual Stripe onboarding link if provided
        if stripe_onboarding_link:
            stripe_section = f"""
        
PAYMENT SETUP:
Click the link below to set up your payment information for receiving tutoring payments:

{stripe_onboarding_link}

This secure link will guide you through setting up your payment information with our payment processor. This is required to receive payments from your tutoring sessions.
        """
        else:
            stripe_section = """
        
PAYMENT SETUP:
You'll receive a separate email shortly with instructions to set up your payment information for receiving tutoring payments. This is required to receive payments from your tutoring sessions.
        """
        
        subject = 'Welcome to EGS Tutoring - Verify Your Account & Setup Payment'
        message = f"""Hello {user.firstName},

Thanks for joining EGS Tutoring! Your tutor account has been created by an administrator.

FIRST STEP - VERIFY YOUR EMAIL:
Please click the link below to verify your email address and activate your account:

{verification_link}
{stripe_section}

Once verified, you'll be able to:
- Access your tutor dashboard
- View tutoring requests
- Log your tutoring hours
- Connect your Google Calendar

Please find attached helpful guides to get you started with the EGS Tutoring platform and payment setup process.

If you have any questions, please contact our support team.

Best regards,
EGS Tutoring Team"""
        
        # Prepare onboarding document attachments
        media_path = os.path.join(settings.BASE_DIR, 'public', 'uploads', 'onboarding')
        attachments = []
        
        # Add the two onboarding documents
        onboarding_guide_path = os.path.join(media_path, 'EGS Tutoring Portal Onboarding Guide.pdf')
        stripe_guide_path = os.path.join(media_path, 'Stripe Onboarding Guide EN.pdf')
        
        logger.info(f"Checking attachment paths - Base media path: {media_path}")
        logger.info(f"Onboarding guide path: {onboarding_guide_path}, exists: {os.path.exists(onboarding_guide_path)}")
        logger.info(f"Stripe guide path: {stripe_guide_path}, exists: {os.path.exists(stripe_guide_path)}")
        
        if os.path.exists(onboarding_guide_path):
            attachments.append(onboarding_guide_path)
        if os.path.exists(stripe_guide_path):
            attachments.append(stripe_guide_path)
        
        logger.info(f"Final attachments list: {attachments}")
        
        # Use Mailgun API with attachments
        send_mailgun_email(
            to_emails=[user.email],
            subject=subject,
            text_content=message,
            attachments=attachments if attachments else None
        )
        
        logger.info(f"Tutor welcome email sent to user {user_id} ({user.email})")
        return {'success': True, 'user_id': user_id}
        
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for tutor welcome email")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Error sending tutor welcome email to user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_reply_notification_email_async(self, parent_email, tutor_name, subject_matter):
    """
    Send reply notification email to parents asynchronously
    """
    try:
        subject = 'New Tutor Response - EGS Tutoring'
        message = f"""
        Hello,
        
        Good news! A tutor has responded to your tutoring request.
        
        Tutor: {tutor_name}
        Subject: {subject_matter}
        
        Please log in to your EGS Tutoring dashboard to view the full response and next steps.
        
        Best regards,
        EGS Tutoring Team
        """
        
        # Use Mailgun API instead of Django's send_mail
        send_mailgun_email(
            to_emails=[parent_email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Reply notification email sent to {parent_email}")
        return {'success': True, 'email': parent_email}
        
    except Exception as e:
        logger.error(f"Error sending reply notification email to {parent_email}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_dispute_email_async(self, admin_emails, disputer_name, disputed_hours):
    """
    Send dispute notification email to administrators asynchronously
    Now sends individual emails to maintain privacy (no CC)
    """
    try:
        subject = 'Hours Dispute Submitted - EGS Tutoring'
        message = f"""
        A new hours dispute has been submitted:
        
        Disputed by: {disputer_name}
        Hours in question: {disputed_hours}
        
        Please review this dispute in the admin panel.
        
        EGS Tutoring System
        """
        
        successful_emails = []
        failed_emails = []
        
        # Send individual emails to maintain privacy
        for admin_email in admin_emails:
            try:
                send_mailgun_email(
                    to_emails=[admin_email],  # Send to one admin at a time
                    subject=subject,
                    text_content=message
                )
                successful_emails.append(admin_email)
                logger.info(f"Dispute email sent to: {admin_email}")
                
            except Exception as email_error:
                failed_emails.append(admin_email)
                logger.error(f"Failed to send dispute email to {admin_email}: {str(email_error)}")
        
        logger.info(f"Dispute email sent to {len(successful_emails)} administrators, {len(failed_emails)} failed")
        return {
            'success': True,
            'sent_count': len(successful_emails),
            'failed_count': len(failed_emails),
            'successful_emails': successful_emails,
            'failed_emails': failed_emails
        }
        
    except Exception as e:
        logger.error(f"Error sending dispute email: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_referral_email_async(self, sender_name, sender_email, receiver_email):
    """
    Send referral invitation email asynchronously
    """
    try:
        subject = f'{sender_name} invited you to join EGS Tutoring'
        message = f"""
        Hello,
        
        {sender_name} ({sender_email}) has invited you to join EGS Tutoring!
        
        EGS Tutoring connects students with qualified tutors for personalized learning experiences.
        
        Click here to get started: {settings.FRONTEND_URL}/register
        
        Best regards,
        EGS Tutoring Team
        """
        
        # Use Mailgun API instead of Django's send_mail
        send_mailgun_email(
            to_emails=[receiver_email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Referral email sent from {sender_email} to {receiver_email}")
        return {'success': True, 'sender': sender_email, 'receiver': receiver_email}
        
    except Exception as e:
        logger.error(f"Error sending referral email from {sender_email} to {receiver_email}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def bulk_invoice_generation_async(self, customer_data_list, invoice_metadata=None):
    """
    Generate and send invoices for multiple customers asynchronously
    Process in chunks to reduce memory usage
    """
    import gc
    
    results = []
    errors = []
    chunk_size = 10  # Process 10 invoices at a time to reduce memory
    
    try:
        # Process in chunks to reduce memory usage
        for i in range(0, len(customer_data_list), chunk_size):
            chunk = customer_data_list[i:i + chunk_size]
            
            for customer_data in chunk:
                try:
                    customer_id = customer_data['customer_id']
                    amount = customer_data['amount']  # in cents
                    description = customer_data.get('description', 'Tutoring Services')
                    
                    # Calculate due date (14 days from now)
                    import time
                    due_date = int(time.time()) + (14 * 24 * 60 * 60)  # 14 days in seconds
                    
                    # Create invoice with due date and tax
                    invoice = stripe.Invoice.create(
                        customer=customer_id,
                        currency='cad',  # Set invoice currency to CAD
                        metadata=invoice_metadata or {},
                        due_date=due_date,
                        collection_method='send_invoice',  # Required when setting due_date
                        auto_advance=False,  # Don't auto-advance when using due_date
                        default_tax_rates=[],  # We'll add tax rate below
                    )
                    
                    # Add invoice item directly to the invoice
                    invoice_item = stripe.InvoiceItem.create(
                        customer=customer_id,
                        invoice=invoice.id,  # Attach directly to this invoice
                        amount=amount,
                        currency='cad',  # Changed to CAD
                        description=description,
                    )
                    
                    # Add 13% CAD tax to the invoice
                    try:
                        # First check if tax rate exists
                        tax_rates = stripe.TaxRate.list(limit=100)
                        cad_tax_rate = None
                        for rate in tax_rates.data:
                            if rate.display_name == "CAD Tax 13%" and rate.percentage == 13.0:
                                cad_tax_rate = rate
                                break
                        
                        # Create tax rate if it doesn't exist
                        if not cad_tax_rate:
                            cad_tax_rate = stripe.TaxRate.create(
                                display_name="CAD Tax 13%",
                                description="13% tax for Canadian services",
                                jurisdiction="CA",
                                percentage=13.0,
                                inclusive=False,
                            )
                        
                        # Apply tax rate to the invoice item
                        stripe.InvoiceItem.modify(
                            invoice_item.id,
                            tax_rates=[cad_tax_rate.id]
                        )
                    except Exception as tax_error:
                        logger.warning(f"Could not apply tax to invoice {invoice.id}: {tax_error}")
                    
                    # Finalize and send invoice
                    invoice = stripe.Invoice.finalize_invoice(invoice.id)
                    invoice = stripe.Invoice.send_invoice(invoice.id)
                    
                    # Update hours status AFTER invoice is successfully sent to prevent race conditions
                    hour_ids = customer_data.get('hour_ids', [])
                    if hour_ids:
                        from playground.models import Hours
                        Hours.objects.filter(id__in=hour_ids).update(
                            invoice_status='invoiced',
                            invoice_id=invoice.id
                        )
                        logger.info(f"Updated {len(hour_ids)} hours to invoiced status for invoice {invoice.id}")
                    
                    results.append({
                        'customer_id': customer_id,
                        'invoice_id': invoice.id,
                        'amount': amount,
                        'status': 'sent'
                    })
                    
                    logger.info(f"Invoice {invoice.id} created and sent for customer {customer_id}")
                    
                except stripe.error.StripeError as e:
                    error_msg = f"Stripe error for customer {customer_data.get('customer_id', 'unknown')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append({
                        'customer_id': customer_data.get('customer_id'),
                        'error': str(e)
                    })
                    
                except Exception as e:
                    error_msg = f"Unexpected error for customer {customer_data.get('customer_id', 'unknown')}: {str(e)}"
                    logger.error(error_msg)
                    errors.append({
                        'customer_id': customer_data.get('customer_id'),
                        'error': str(e)
                    })
            
            # Force garbage collection after each chunk to free memory
            gc.collect()
        
        logger.info(f"Bulk invoice generation completed. Success: {len(results)}, Errors: {len(errors)}")
        
        return {
            'success': True,
            'total_processed': len(customer_data_list),
            'successful_invoices': results,
            'errors': errors
        }
        
    except Exception as e:
        logger.error(f"Critical error in bulk invoice generation: {str(e)}")
        raise self.retry(exc=e, countdown=120 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=120)
def batch_payout_processing_async(self, payout_data_list):
    """
    Process batch payouts to tutors asynchronously
    """
    results = []
    errors = []
    
    try:
        for payout_data in payout_data_list:
            try:
                tutor_stripe_account = payout_data['stripe_account_id'].strip()
                amount = payout_data['amount']  # in cents
                currency = payout_data.get('currency', 'cad')
                description = payout_data.get('description', 'Tutoring payment')
                metadata = payout_data.get('metadata', {})
                
                # Create transfer to tutor's Stripe account
                transfer = stripe.Transfer.create(
                    amount=amount,
                    currency=currency,
                    destination=tutor_stripe_account,
                    description=description,
                    metadata=metadata,
                )
                
                # Update MonthlyHours status AFTER transfer is successful to prevent race conditions
                monthly_hours_id = payout_data.get('monthly_hours_id')
                if monthly_hours_id:
                    from playground.models import MonthlyHours
                    MonthlyHours.objects.filter(id=monthly_hours_id).update(
                        payout_status='paid',
                        transfer_id=transfer.id
                    )
                    logger.info(f"Updated MonthlyHours {monthly_hours_id} to paid status for transfer {transfer.id}")
                
                results.append({
                    'tutor_id': payout_data.get('tutor_id'),
                    'stripe_account_id': tutor_stripe_account,
                    'transfer_id': transfer.id,
                    'amount': amount,
                    'status': 'completed'
                })
                
                logger.info(f"Transfer {transfer.id} completed for tutor {payout_data.get('tutor_id')} - ${amount/100:.2f}")
                
                # Send tutor transfer notification email
                try:
                    from playground.email_backends import send_tutor_transfer_notification
                    tutor = User.objects.get(id=payout_data.get('tutor_id'))
                    send_tutor_transfer_notification(
                        tutor_email=tutor.email,
                        tutor_name=tutor.firstName,
                        transfer_amount=amount/100  # Convert from cents to dollars
                    )
                except Exception as email_error:
                    logger.error(f"Failed to send transfer notification email for tutor {payout_data.get('tutor_id')}: {email_error}")
                
            except stripe.error.StripeError as e:
                error_msg = f"Stripe error for tutor {payout_data.get('tutor_id', 'unknown')}: {str(e)}"
                logger.error(error_msg)
                errors.append({
                    'tutor_id': payout_data.get('tutor_id'),
                    'stripe_account_id': payout_data.get('stripe_account_id'),
                    'error': str(e)
                })
                
            except Exception as e:
                error_msg = f"Unexpected error for tutor {payout_data.get('tutor_id', 'unknown')}: {str(e)}"
                logger.error(error_msg)
                errors.append({
                    'tutor_id': payout_data.get('tutor_id'),
                    'stripe_account_id': payout_data.get('stripe_account_id'),
                    'error': str(e)
                })
        
        logger.info(f"Batch payout processing completed. Success: {len(results)}, Errors: {len(errors)}")
        
        return {
            'success': True,
            'total_processed': len(payout_data_list),
            'successful_payouts': results,
            'errors': errors
        }
        
    except Exception as e:
        logger.error(f"Critical error in batch payout processing: {str(e)}")
        raise self.retry(exc=e, countdown=120 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_referral_reward_async(self, referrer_user_id, amount_cents=1000):
    """
    Process referral reward asynchronously
    """
    try:
        referrer = User.objects.get(id=referrer_user_id)
        
        # Get or create Stripe customer for referrer
        try:
            customers = stripe.Customer.list(email=referrer.email, limit=1)
            if customers.data:
                customer = customers.data[0]
            else:
                customer = stripe.Customer.create(
                    email=referrer.email,
                    name=f"{referrer.firstName} {referrer.lastName}",
                )
        except stripe.error.StripeError as e:
            logger.error(f"Error handling Stripe customer for referrer {referrer_user_id}: {str(e)}")
            raise
        
        # Create balance transaction (credit)
        balance_transaction = stripe.Customer.create_balance_transaction(
            customer.id,
            amount=amount_cents,
            currency='cad',
            description=f'Referral reward for {referrer.firstName} {referrer.lastName}',
        )
        
        logger.info(f"Referral reward of ${amount_cents/100:.2f} issued to user {referrer_user_id}")
        
        return {
            'success': True,
            'referrer_id': referrer_user_id,
            'customer_id': customer.id,
            'balance_transaction_id': balance_transaction.id,
            'amount': amount_cents
        }
        
    except User.DoesNotExist:
        logger.error(f"Referrer user {referrer_user_id} not found")
        return {'success': False, 'error': 'Referrer not found'}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error processing referral reward for user {referrer_user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))
        
    except Exception as e:
        logger.error(f"Unexpected error processing referral reward for user {referrer_user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_google_calendar_event_async(self, user_id, event_data):
    """
    Create Google Calendar event asynchronously
    """
    try:
        from datetime import datetime, timezone
        import requests
        
        user = User.objects.get(id=user_id)
        
        # Ensure we have a valid access token
        access_token = None
        if getattr(user, "google_token_expiry", None):
            if user.google_token_expiry < datetime.now(timezone.utc):
                # Import at runtime to avoid circular imports
                from playground.views import refresh_google_access_token
                refresh_result = refresh_google_access_token(user)
                if refresh_result == "RECONNECT_GOOGLE":
                    return {'success': False, 'error': 'Google account needs to be reconnected'}
                if refresh_result:
                    access_token = refresh_result
                else:
                    return {'success': False, 'error': 'Google token expired and refresh failed'}
            else:
                access_token = getattr(user, "access_token", None)
        else:
            access_token = getattr(user, "access_token", None)

        if not access_token:
            return {'success': False, 'error': 'Google account needs to be reconnected'}

        # Create the calendar event
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }
        
        calendar_url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        
        response = requests.post(calendar_url, json=event_data, headers=headers)
        
        if response.status_code == 200:
            event_result = response.json()
            logger.info(f"Google Calendar event created for user {user_id}: {event_result.get('id')}")
            return {
                'success': True,
                'event_id': event_result.get('id'),
                'event_link': event_result.get('htmlLink'),
                'user_id': user_id
            }
        else:
            error_msg = f"Google Calendar API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
            
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for calendar event creation")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Error creating Google Calendar event for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def refresh_google_token_async(self, user_id):
    """
    Refresh Google OAuth token asynchronously
    """
    try:
        
        user = User.objects.get(id=user_id)
        
        # Import at runtime to avoid circular imports
        from playground.views import refresh_google_access_token
        refresh_result = refresh_google_access_token(user)
        
        if refresh_result == "RECONNECT_GOOGLE":
            logger.warning(f"User {user_id} needs to reconnect Google account")
            return {'success': False, 'error': 'Reconnection required', 'reconnect_needed': True}
        elif refresh_result:
            logger.info(f"Google token refreshed successfully for user {user_id}")
            return {'success': True, 'access_token': refresh_result}
        else:
            logger.error(f"Failed to refresh Google token for user {user_id}")
            return {'success': False, 'error': 'Token refresh failed'}
            
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for token refresh")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Error refreshing Google token for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def fetch_google_calendar_events_async(self, user_id, params=None):
    """
    Fetch Google Calendar events asynchronously
    """
    try:
        from datetime import datetime, timezone
        import requests
        
        user = User.objects.get(id=user_id)
        
        # Ensure we have a valid access token
        access_token = None
        if getattr(user, "google_token_expiry", None):
            if user.google_token_expiry < datetime.now(timezone.utc):
                # Import at runtime to avoid circular imports
                from playground.views import refresh_google_access_token
                refresh_result = refresh_google_access_token(user)
                if refresh_result == "RECONNECT_GOOGLE":
                    return {'success': False, 'error': 'Google account needs to be reconnected'}
                if refresh_result:
                    access_token = refresh_result
                else:
                    return {'success': False, 'error': 'Google token expired and refresh failed'}
            else:
                access_token = getattr(user, "access_token", None)
        else:
            access_token = getattr(user, "access_token", None)

        if not access_token:
            return {'success': False, 'error': 'Google account needs to be reconnected'}

        # Set up default parameters
        default_params = {
            "sharedExtendedProperty": "egs_tutoring=true",
            "singleEvents": True,
            "orderBy": "startTime",
            "maxResults": 250,
            "timeMin": datetime.now(timezone.utc).isoformat(),
        }
        
        if params:
            default_params.update(params)
        
        headers = {
            'Authorization': f'Bearer {access_token}',
        }
        
        calendar_url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
        
        response = requests.get(calendar_url, params=default_params, headers=headers)
        
        if response.status_code == 200:
            events_data = response.json()
            logger.info(f"Fetched {len(events_data.get('items', []))} events for user {user_id}")
            return {
                'success': True,
                'events': events_data,
                'user_id': user_id
            }
        else:
            error_msg = f"Google Calendar API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
            
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for calendar events fetch")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Error fetching Google Calendar events for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def update_google_calendar_rsvp_async(self, user_id, event_id, status):
    """
    Update Google Calendar event RSVP status asynchronously
    """
    try:
        from datetime import datetime, timezone
        import requests
        
        user = User.objects.get(id=user_id)
        
        # Ensure we have a valid access token
        access_token = None
        if getattr(user, "google_token_expiry", None):
            if user.google_token_expiry < datetime.now(timezone.utc):
                # Import at runtime to avoid circular imports
                from playground.views import refresh_google_access_token
                refresh_result = refresh_google_access_token(user)
                if refresh_result == "RECONNECT_GOOGLE":
                    return {'success': False, 'error': 'Google account needs to be reconnected'}
                if refresh_result:
                    access_token = refresh_result
                else:
                    return {'success': False, 'error': 'Google token expired and refresh failed'}
            else:
                access_token = getattr(user, "access_token", None)
        else:
            access_token = getattr(user, "access_token", None)

        if not access_token:
            return {'success': False, 'error': 'Google account needs to be reconnected'}

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }
        
        # Map status to Google Calendar attendee status
        status_mapping = {
            'cant_attend': 'declined',
            'attending': 'accepted',
            'maybe': 'tentative'
        }
        
        google_status = status_mapping.get(status, 'declined')
        
        # Get current event to update attendee status
        get_url = f'https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}'
        get_response = requests.get(get_url, headers=headers)
        
        if get_response.status_code != 200:
            return {'success': False, 'error': f'Could not fetch event: {get_response.text}'}
            
        event_data = get_response.json()
        
        # Update attendee status
        attendees = event_data.get('attendees', [])
        user_email = user.email
        
        for attendee in attendees:
            if attendee.get('email') == user_email:
                attendee['responseStatus'] = google_status
                break
        
        # Update the event
        put_url = f'https://www.googleapis.com/calendar/v3/calendars/primary/events/{event_id}'
        put_response = requests.put(put_url, json=event_data, headers=headers)
        
        if put_response.status_code == 200:
            logger.info(f"RSVP status updated for user {user_id}, event {event_id}: {google_status}")
            return {
                'success': True,
                'event_id': event_id,
                'status': google_status,
                'user_id': user_id
            }
        else:
            error_msg = f"Google Calendar API error updating RSVP: {put_response.status_code} - {put_response.text}"
            logger.error(error_msg)
            return {'success': False, 'error': error_msg}
            
    except User.DoesNotExist:
        logger.error(f"User {user_id} not found for RSVP update")
        return {'success': False, 'error': 'User not found'}
        
    except Exception as e:
        logger.error(f"Error updating Google Calendar RSVP for user {user_id}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

# New Email Notification Tasks

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_tutor_reply_notification_async(self, parent_email, tutor_name, request_subject, reply_message, document_paths=None):
    """
    Send email notification when tutor replies to parent request
    Now attaches actual files instead of URLs
    
    Args:
        document_paths: List of file paths to attach to the email
    """
    try:
        subject = f'New Reply from Your Tutor - {request_subject}'
        
        # Build document attachments text
        documents_text = ""
        attachment_files = []
        
        if document_paths:
            documents_text = "\n\nDocuments from your tutor are attached to this email."
            # Prepare files for attachment
            for file_path in document_paths:
                try:
                    # Convert relative path to full path if needed
                    if not file_path.startswith('/'):
                        file_path = file_path.lstrip('/')
                    attachment_files.append(file_path)
                except Exception as file_error:
                    logger.warning(f"Could not process document attachment: {file_path} - {str(file_error)}")
        
        message = f"""
Hello,

You have received a new reply from {tutor_name} regarding your tutoring request for {request_subject}.

Reply:
{reply_message}
{documents_text}

Please visit your Current Requests page to view the full conversation and take action:
https://egstutoring.ca/request-reply

You can also access this through your dashboard at https://egstutoring.ca/home

Best regards,
EGS Tutoring Team
        """
        
        send_mailgun_email(
            to_emails=[parent_email],
            subject=subject,
            text_content=message,
            attachments=attachment_files if attachment_files else None
        )
        
        attachment_count = len(attachment_files) if attachment_files else 0
        logger.info(f"Tutor reply notification sent to {parent_email} with {attachment_count} attachments")
        return {'success': True, 'email': parent_email, 'attachments': attachment_count}
        
    except Exception as e:
        logger.error(f"Error sending tutor reply notification to {parent_email}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_new_request_notification_async(self, tutor_emails, parent_name, student_name, subject, grade, service, city):
    """
    Send email notification to tutors when new requests are created
    Now sends individual emails to maintain privacy (no CC)
    """
    try:
        email_subject = f'New Tutoring Request Available - {subject} for {student_name}'
        message = f"""
Hello,

A new tutoring request has been posted that may interest you:

Student: {student_name}
Subject: {subject}
Grade: {grade}
Service Type: {service}
Location: {city}
Parent: {parent_name}

Please visit your dashboard to view the full request details and submit your reply if interested.

Best regards,
EGS Tutoring Team
        """
        
        successful_emails = []
        failed_emails = []
        
        # Send individual emails to maintain privacy
        for tutor_email in tutor_emails:
            try:
                send_mailgun_email(
                    to_emails=[tutor_email],  # Send to one tutor at a time
                    subject=email_subject,
                    text_content=message
                )
                successful_emails.append(tutor_email)
                logger.info(f"New request notification sent to: {tutor_email}")
                
            except Exception as email_error:
                failed_emails.append(tutor_email)
                logger.error(f"Failed to send new request notification to {tutor_email}: {str(email_error)}")
        
        logger.info(f"New request notification sent to {len(successful_emails)} tutors, {len(failed_emails)} failed")
        return {
            'success': True,
            'sent_count': len(successful_emails),
            'failed_count': len(failed_emails),
            'successful_emails': successful_emails,
            'failed_emails': failed_emails
        }
        
    except Exception as e:
        logger.error(f"Error sending new request notification: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_monthly_hours_notification_async(self, recipient_email, recipient_name, month, year, total_hours, is_tutor=False):
    """
    Send email notification when monthly hours are available
    """
    try:
        if is_tutor:
            subject = f'Monthly Hours Summary Available - {month}/{year}'
            message = f"""
Hello {recipient_name},

Your monthly hours summary for {month}/{year} is now available.

Total Hours: {total_hours}

This is also a reminder to complete your monthly reports for your students if you haven't done so already. Monthly reports help parents track their child's progress and are an important part of our tutoring service.

Please visit your dashboard to:
- Review your monthly hours
- Complete any pending monthly reports

Best regards,
EGS Tutoring Team
            """
        else:
            subject = f'Monthly Hours Summary - {month}/{year}'
            message = f"""
Hello {recipient_name},

Your child's monthly tutoring hours summary for {month}/{year} is now available.

Total Hours: {total_hours}

Please visit your dashboard to review the detailed breakdown of all tutoring sessions.

Best regards,
EGS Tutoring Team
            """
        
        send_mailgun_email(
            to_emails=[recipient_email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Monthly hours notification sent to {recipient_email}")
        return {'success': True, 'email': recipient_email}
        
    except Exception as e:
        logger.error(f"Error sending monthly hours notification to {recipient_email}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_monthly_report_notification_async(self, parent_email, parent_name, tutor_name, student_name, month, year, report_pdf_url=None):
    """
    Send email notification when tutor submits monthly report
    """
    try:
        subject = f'Monthly Report Available - {student_name} ({month}/{year})'
        
        pdf_text = ""
        if report_pdf_url:
            pdf_text = f"\n\nReport PDF: {report_pdf_url}\n"
        
        message = f"""
Hello {parent_name},

{tutor_name} has completed the monthly report for {student_name} for {month}/{year}.

This report includes:
- Progress summary
- Strengths and areas for improvement  
- Homework completion assessment
- Participation level
- Goals for next month
- Additional comments
{pdf_text}

Please visit your dashboard to view the complete report.

Best regards,
EGS Tutoring Team
        """
        
        send_mailgun_email(
            to_emails=[parent_email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Monthly report notification sent to {parent_email}")
        return {'success': True, 'email': parent_email}
        
    except Exception as e:
        logger.error(f"Error sending monthly report notification to {parent_email}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_tutor_dispute_notification_async(self, tutor_email, tutor_name, session_info, frontend_url):
    """
    Send email notification to tutor when their hours are disputed
    """
    try:
        subject = "Hour Record Disputed - Action Required"
        
        logged_hours_url = f"{frontend_url}/logged-hours"
        
        html_message = f"""
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
            <h2 style="color: #333;">Hour Record Disputed</h2>
            <p>Dear {tutor_name},</p>
            
            <p>A parent has disputed one of your logged tutoring sessions. Here are the details:</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Session Details:</h3>
                <p><strong>Student:</strong> {session_info['student_name']}</p>
                <p><strong>Date:</strong> {session_info['date']}</p>
                <p><strong>Time:</strong> {session_info['start_time']} - {session_info['end_time']}</p>
                <p><strong>Duration:</strong> {session_info['total_hours']} hours</p>
            </div>
            
            <p>Please review this session and provide your response by visiting your logged hours page:</p>
            
            <p style="text-align: center; margin: 30px 0;">
                <a href="{logged_hours_url}" 
                   style="background-color: #007bff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                   View Logged Hours
                </a>
            </p>
            
            <p>You can add a reply to explain the details of this session, which will be reviewed by our admin team.</p>
            
            <p>Thank you,<br>EGS Tutoring Team</p>
        </div>
        """
        
        plain_message = f"""
        Hour Record Disputed

        Dear {tutor_name},

        A parent has disputed one of your logged tutoring sessions. Here are the details:

        Student: {session_info['student_name']}
        Date: {session_info['date']}
        Time: {session_info['start_time']} - {session_info['end_time']}
        Duration: {session_info['total_hours']} hours

        Please review this session and provide your response by visiting: {logged_hours_url}

        You can add a reply to explain the details of this session, which will be reviewed by our admin team.

        Thank you,
        EGS Tutoring Team
        """
        
        logger.info(f"Sending tutor dispute notification to {tutor_email}")
        
        if settings.MAILGUN_API_KEY:
            send_mailgun_email(
                subject=subject,
                html_content=html_message,
                text_content=plain_message,
                to_emails=[tutor_email],
                from_email=settings.DEFAULT_FROM_EMAIL
            )
        else:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[tutor_email],
                html_message=html_message
            )
            
        logger.info(f"Successfully sent tutor dispute notification to {tutor_email}")
        
    except Exception as exc:
        logger.error(f"Failed to send tutor dispute notification to {tutor_email}: {str(exc)}")
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying tutor dispute notification... (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (self.request.retries + 1), exc=exc)
        else:
            logger.error(f"Max retries reached for tutor dispute notification to {tutor_email}")


# Mapulus Integration Tasks

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def create_mapulus_pin_async(self, user_data):
    """
    Create a pin on Mapulus map when a new user signs up
    """
    try:
        from playground.mapulus_service import mapulus_service
        
        user_id = user_data.get('id')
        full_name = f"{user_data.get('firstName', '')} {user_data.get('lastName', '')}"
        
        logger.info(f"Creating Mapulus pin for user {user_id} - {full_name}")
        
        success = mapulus_service.create_pin(user_data)
        
        if success:
            logger.info(f"Successfully created Mapulus pin for user {user_id} - {full_name}")
            return {
                'success': True,
                'user_id': user_id,
                'message': f'Pin created for {full_name}'
            }
        else:
            logger.error(f"Failed to create Mapulus pin for user {user_id}")
            return {
                'success': False,
                'user_id': user_id,
                'error': 'Pin creation failed'
            }
            
    except Exception as e:
        logger.error(f"Error in create_mapulus_pin_async for user {user_data.get('id')}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def update_mapulus_pin_async(self, user_data):
    """
    Update an existing pin on Mapulus map when user profile is updated
    """
    try:
        from playground.mapulus_service import mapulus_service
        
        user_id = user_data.get('id')
        full_name = f"{user_data.get('firstName', '')} {user_data.get('lastName', '')}"
        
        logger.info(f"Updating Mapulus pin for user {user_id} - {full_name}")
        
        success = mapulus_service.update_pin(user_data)
        
        if success:
            logger.info(f"Successfully updated Mapulus pin for user {user_id} - {full_name}")
            return {
                'success': True,
                'user_id': user_id,
                'message': f'Pin updated for {full_name}'
            }
        else:
            logger.warning(f"Could not update Mapulus pin for user {user_id} (may not exist)")
            return {
                'success': False,
                'user_id': user_id,
                'error': 'Pin update failed or pin does not exist'
            }
            
    except Exception as e:
        logger.error(f"Error in update_mapulus_pin_async for user {user_data.get('id')}: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def delete_mapulus_pin_async(self, pin_id, user_info=None):
    """
    Delete a pin from Mapulus map (e.g., when user is deactivated)
    """
    try:
        from playground.mapulus_service import mapulus_service
        
        user_name = user_info.get('name', 'Unknown') if user_info else 'Unknown'
        logger.info(f"Deleting Mapulus pin {pin_id} for user {user_name}")
        
        success = mapulus_service.delete_pin(pin_id)
        
        if success:
            logger.info(f"Successfully deleted Mapulus pin {pin_id}")
            return {
                'success': True,
                'pin_id': pin_id,
                'message': f'Pin deleted for {user_name}'
            }
        else:
            logger.warning(f"Could not delete Mapulus pin {pin_id}")
            return {
                'success': False,
                'pin_id': pin_id,
                'error': 'Pin deletion failed or pin does not exist'
            }
            
    except Exception as e:
        logger.error(f"Error in delete_mapulus_pin_async for pin {pin_id}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_system_notification_email_async(self, notification_title, notification_message, target_role='all', priority='normal', icon='🔔'):
    """
    Send system notification email to all active users based on role
    """
    try:
        from playground.models import User
        
        # Determine which users to email based on target_role
        if target_role == 'all':
            users = User.objects.filter(is_active=True).exclude(email='')
        else:
            users = User.objects.filter(is_active=True, roles=target_role).exclude(email='')
        
        subject = f'{icon} EGS Tutoring System Notification - {notification_title}'
        
        # Prepare priority indicator
        priority_text = ''
        if priority == 'urgent':
            priority_text = '🚨 URGENT: '
        elif priority == 'high':
            priority_text = '⚠️ HIGH PRIORITY: '
        elif priority == 'low':
            priority_text = 'ℹ️ '
        
        successful_emails = []
        failed_emails = []
        
        for user in users:
            try:
                user_message = f"""
Hello {user.firstName},

{priority_text}{notification_title}

{notification_message}

You can access your dashboard at https://egstutoring.ca/home for more information.

Best regards,
EGS Tutoring Team
                """
                
                send_mailgun_email(
                    to_emails=[user.email],
                    subject=subject,
                    text_content=user_message
                )
                
                successful_emails.append(user.email)
                logger.info(f"System notification sent to {user.email}")
                
            except Exception as email_error:
                failed_emails.append(user.email)
                logger.error(f"Failed to send system notification to {user.email}: {str(email_error)}")
        
        logger.info(f"System notification sent to {len(successful_emails)} users, {len(failed_emails)} failed")
        return {
            'success': True, 
            'sent_count': len(successful_emails),
            'failed_count': len(failed_emails),
            'successful_emails': successful_emails,
            'failed_emails': failed_emails
        }
        
    except Exception as e:
        logger.error(f"Error sending system notification emails: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_parent_registration_notification_async(self, parent_info):
    """
    Send email notification to admins when a parent registers
    """
    try:
        admin_emails = ['egstutor@gmail.com', 'elvissikapi@gmail.com']
        subject = 'New Parent Registration - EGS Tutoring'

        # Extract all parent information
        parent_name = f"{parent_info.get('firstName', '')} {parent_info.get('lastName', '')}"
        username = parent_info.get('username', 'N/A')
        email = parent_info.get('email', 'N/A')
        phone = parent_info.get('phone', 'N/A')
        address = parent_info.get('address', 'N/A')
        city = parent_info.get('city', 'N/A')
        registration_date = parent_info.get('date_joined', 'N/A')

        message = f"""
Hello,

A new parent has registered on the EGS Tutoring platform:

PARENT DETAILS:
Name: {parent_name}
Username: {username}
Email: {email}
Phone: {phone}
Address: {address}
City: {city}
Registration Date: {registration_date}

Please review their account and provide any necessary assistance.

You can access the admin panel to view more details or contact the parent directly if needed.

Best regards,
EGS Tutoring System
        """

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            admin_emails,
            fail_silently=False,
        )

        logger.info(f"Parent registration notification sent for: {parent_name} ({email}) from {city}")
        return {'success': True, 'parent_name': parent_name, 'parent_email': email, 'parent_city': city}

    except Exception as e:
        logger.error(f"Error sending parent registration notification: {str(e)}")
        raise self.retry(exc=e, countdown=60 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_weekly_tutor_hour_reminders(self):
    """
    Send weekly reminder emails to all tutors to log their hours
    Runs every Sunday at 6pm Toronto time
    """
    try:
        from playground.models import User

        # Get all active tutors
        tutors = User.objects.filter(roles='tutor', is_active=True).exclude(email='')

        subject = '⏰ Weekly Reminder: Log Your Tutoring Hours'

        successful_emails = []
        failed_emails = []

        for tutor in tutors:
            try:
                message = f"""
Hello {tutor.firstName},

This is your weekly reminder to log your tutoring hours for the past week.

Please visit the hour logging page to record your sessions:
https://egstutoring-portal.ca/log

📝 Don't forget to include:
- Date and time of each session
- Student name
- Duration of the session
- Session type (Online/In-Person)
- Brief session notes

Logging your hours promptly helps ensure accurate and timely payments.

If you have any questions or need assistance, please don't hesitate to reach out.

Best regards,
EGS Tutoring Team
                """

                send_mailgun_email(
                    to_emails=[tutor.email],
                    subject=subject,
                    text_content=message
                )

                successful_emails.append(tutor.email)
                logger.info(f"Weekly hour reminder sent to tutor: {tutor.firstName} {tutor.lastName} ({tutor.email})")

            except Exception as email_error:
                failed_emails.append(tutor.email)
                logger.error(f"Failed to send weekly reminder to {tutor.email}: {str(email_error)}")

        total_tutors = len(tutors)
        logger.info(f"Weekly tutor hour reminders sent to {len(successful_emails)} tutors, {len(failed_emails)} failed out of {total_tutors} total")

        return {
            'success': True,
            'total_tutors': total_tutors,
            'sent_count': len(successful_emails),
            'failed_count': len(failed_emails),
            'successful_emails': successful_emails,
            'failed_emails': failed_emails
        }

    except Exception as e:
        logger.error(f"Error sending weekly tutor hour reminders: {str(e)}")


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def send_student_creation_confirmation_async(self, parent_email, parent_name, student_name):
    """
    Send confirmation email to parent when a new student child account is created
    """
    try:
        subject = 'Student Account Created - EGS Tutoring'
        message = f"""
Hello {parent_name},

Great news! A new student account has been successfully created for {student_name}.

The student account is now active and ready to use.

NEXT STEPS:
To get started with tutoring, please visit the tutoring request page to submit your first request:
{settings.FRONTEND_URL}/request

You can also:
• View your dashboard: {settings.FRONTEND_URL}/home
• Manage your students: {settings.FRONTEND_URL}/students
• Check current requests: {settings.FRONTEND_URL}/request-reply

If you have any questions or need assistance, please don't hesitate to contact us.

Best regards,
EGS Tutoring Team
        """

        send_mailgun_email(
            to_emails=[parent_email],
            subject=subject,
            text_content=message
        )

        logger.info(f"Student creation confirmation sent to {parent_email} for student {student_name}")
        return {'success': True, 'email': parent_email, 'student': student_name}

    except Exception as e:
        logger.error(f"Error sending student creation confirmation to {parent_email}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

