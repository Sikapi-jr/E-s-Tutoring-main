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
            country='US',
            email=user.email,
            capabilities={
                'card_payments': {'requested': True},
                'transfers': {'requested': True},
            },
        )
        
        # Create account link
        account_link = stripe.AccountLink.create(
            account=account.id,
            refresh_url=f'{settings.FRONTEND_URL}/stripe-reauth',
            return_url=f'{settings.FRONTEND_URL}/settings',
            type='account_onboarding',
        )
        
        # Update user with Stripe account info
        user.stripe_account_id = account.id
        user.stripe_onboarding_link = account_link.url
        user.save()
        
        logger.info(f"Stripe account created for user {user_id}: {account.id}")
        
        # Send onboarding email
        send_stripe_onboarding_email_async.delay(user_id, account_link.url)
        
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
        message = f"""
        Hello {user.firstName},
        
        Thank you for registering with EGS Tutoring! Please click the link below to verify your email address:
        
        {verification_link}
        
        If you didn't create this account, please ignore this email.
        
        Best regards,
        EGS Tutoring Team
        """
        
        # Use Mailgun API instead of Django's send_mail
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
def send_tutor_welcome_email_async(self, user_id, verification_link):
    """
    Send welcome email to admin-created tutors with verification and Stripe onboarding info
    """
    try:
        user = User.objects.get(id=user_id)
        
        # Wait a moment for Stripe account to be created
        import time
        time.sleep(2)
        
        # Get the Stripe onboarding link if available
        stripe_link = ""
        if user.stripe_onboarding_link:
            stripe_link = f"""
        
PAYMENT SETUP:
To receive payments from tutoring sessions, you'll also need to complete your payment setup:
{user.stripe_onboarding_link}

This secure link will guide you through setting up your payment information.
        """
        else:
            stripe_link = """
        
PAYMENT SETUP:
You'll receive a separate email shortly with instructions to set up your payment information for receiving tutoring payments.
        """
        
        subject = 'Welcome to EGS Tutoring - Verify Your Account'
        message = f"""
        Hello {user.firstName},
        
        Welcome to EGS Tutoring! Your tutor account has been created by an administrator.
        
        FIRST STEP - VERIFY YOUR EMAIL:
        Please click the link below to verify your email address and activate your account:
        
        {verification_link}
        {stripe_link}
        
        Once verified, you'll be able to:
        - Access your tutor dashboard
        - View tutoring requests
        - Log your tutoring hours
        - Connect your Google Calendar
        
        If you have any questions, please contact our support team.
        
        Best regards,
        EGS Tutoring Team
        """
        
        # Use Mailgun API instead of Django's send_mail
        send_mailgun_email(
            to_emails=[user.email],
            subject=subject,
            text_content=message
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
        
        # Use Mailgun API instead of Django's send_mail
        send_mailgun_email(
            to_emails=admin_emails,
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Dispute email sent to administrators: {admin_emails}")
        return {'success': True, 'recipients': admin_emails}
        
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
                    
                    # Create invoice item
                    invoice_item = stripe.InvoiceItem.create(
                        customer=customer_id,
                        amount=amount,
                        currency='usd',
                        description=description,
                    )
                    
                    # Create invoice
                    invoice = stripe.Invoice.create(
                        customer=customer_id,
                        metadata=invoice_metadata or {},
                        auto_advance=True,  # Automatically finalize and attempt payment
                    )
                    
                    # Finalize and send invoice
                    invoice.finalize_invoice()
                    invoice.send_invoice()
                    
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
                tutor_stripe_account = payout_data['stripe_account_id']
                amount = payout_data['amount']  # in cents
                currency = payout_data.get('currency', 'usd')
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
                
                results.append({
                    'tutor_id': payout_data.get('tutor_id'),
                    'stripe_account_id': tutor_stripe_account,
                    'transfer_id': transfer.id,
                    'amount': amount,
                    'status': 'completed'
                })
                
                logger.info(f"Transfer {transfer.id} completed for tutor {payout_data.get('tutor_id')} - ${amount/100:.2f}")
                
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
            currency='usd',
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
def send_tutor_reply_notification_async(self, parent_email, tutor_name, request_subject, reply_message, document_urls=None):
    """
    Send email notification when tutor replies to parent request
    """
    try:
        subject = f'New Reply from Your Tutor - {request_subject}'
        
        # Build document attachments text
        documents_text = ""
        if document_urls:
            documents_text = "\n\nDocument attachments:\n"
            for url in document_urls:
                documents_text += f"- {url}\n"
        
        message = f"""
Hello,

You have received a new reply from {tutor_name} regarding your tutoring request for {request_subject}.

Reply:
{reply_message}
{documents_text}

Please visit your dashboard to view the full conversation and take action if needed.

Best regards,
EGS Tutoring Team
        """
        
        send_mailgun_email(
            to_emails=[parent_email],
            subject=subject,
            text_content=message
        )
        
        logger.info(f"Tutor reply notification sent to {parent_email}")
        return {'success': True, 'email': parent_email}
        
    except Exception as e:
        logger.error(f"Error sending tutor reply notification to {parent_email}: {str(e)}")
        raise self.retry(exc=e, countdown=30 * (self.request.retries + 1))

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_new_request_notification_async(self, tutor_emails, parent_name, student_name, subject, grade, service, city):
    """
    Send email notification to tutors when new requests are created
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
        
        send_mailgun_email(
            to_emails=tutor_emails,
            subject=email_subject,
            text_content=message
        )
        
        logger.info(f"New request notification sent to tutors: {tutor_emails}")
        return {'success': True, 'recipients': tutor_emails}
        
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