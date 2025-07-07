from django.shortcuts import render
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model  # Correct way to import the user model
from rest_framework import generics, status
from .serializers import UserSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from decimal import Decimal, InvalidOperation
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from .models import TutoringRequest, TutorResponse, AcceptedTutor, Hours, WeeklyHours, AiChatSession, MonthlyHours
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils.timezone import make_aware, now
import json
from django.core.exceptions import ValidationError
from rest_framework.views import APIView
from django.views.generic.edit import UpdateView
from rest_framework.response import Response
from .serializers import RequestSerializer, AiChatSessionSerializer
from .serializers import RequestReplySerializer, AcceptedTutorSerializer, HoursSerializer, WeeklyHoursSerializer 
from rest_framework.decorators import api_view, permission_classes
from datetime import datetime, timedelta
from django.db.models import Sum
from decimal import Decimal, InvalidOperation
#Email verification
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import send_mail
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.conf import settings
import stripe





User = get_user_model()
current_time = now()
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    if request.user:
        user_data = {
            "account_id": request.user.id,
            "firstName": request.user.firstName,
            "lastName": request.user.lastName,
            "username": request.user.username,
            "email": request.user.email,
            "roles": request.user.roles,
            "parent": request.user.parent,  # If now a FK, ensure it's serialized correctly
            "is_active": request.user.is_active,
            "is_superuser": request.user.is_superuser
        }
        request.user.last_login = current_time
        return Response(user_data)
    return Response({"error": "User is not authenticated"}, status=401)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        role = serializer.validated_data.get('roles')
        email = serializer.validated_data.get('email')
        parentUsername = serializer.validated_data.get('parent')

        if role == 'student':
            parentUser = User.objects.get(username=parentUsername)
            serializer.validated_data['parent'] = parentUser

        user = serializer.save(is_active=False)

        self.send_verification_email(user, self.request)

        if role == 'tutor':
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            refresh_url = f'http://localhost:5173/stripe-reauth/{uid}/{token}'
            return_url = 'http://localhost:5173/login'

            account = stripe.Account.create(
                type='express',
                country='CA',
                email=email,
                capabilities={'transfers': {'requested': True}}
            )

            user.stripe_account_id = account.id
            user.save()

            account_link = stripe.AccountLink.create(
                account=account.id,
                refresh_url=refresh_url,
                return_url=return_url,
                type='account_onboarding'
            )

        self.send_stripe_onboarding_email(user, account_link.url)


    def send_verification_email(self, user, request):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        domain = get_current_site(request).domain
        verify_url = f"http://localhost:5173/verify-email/{uid}/{token}/"
        send_mail(
            "Verify your email",
            f"Click the link to verify your account: {verify_url}",
            "egstutor@gmail.com",
            [user.email]
        )
    def send_stripe_onboarding_email(self, user, link):
        send_mail(
            subject="Complete Your Stripe Setup",
            message=f"Welcome! Click the link to complete your Stripe account setup:\n\n{link}\n\nThis is required to receive payouts.",
            from_email="egstutor@gmail.com",
            recipient_list=[user.email]
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def stripe_reauth_token(request, uidb64, token):
    try:
        uid = urlsafe_base64_decode(uidb64).decode()
        user = User.objects.get(pk=uid)
    except:
        return Response({"error": "Invalid user ID"}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({"error": "Invalid or expired token"}, status=400)

    if not user.stripe_account_id:
        return Response({"error": "No Stripe account"}, status=400)

    account_link = stripe.AccountLink.create(
        account=user.stripe_account_id,
        refresh_url='http://localhost:5173/stripe-reauth/{uid}/{token}',
        return_url='http://localhost:5173/login',
        type='account_onboarding',
    )
    print(account_link.url)

    return Response({'url': account_link.url})
    
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uidb64 = request.data.get("uid")
        token = request.data.get("token")
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response({"error": "Invalid UID"}, status=400)

        if default_token_generator.check_token(user, token):
            user.is_active = True
            user.save()
            return Response({"message": "Email verified."}, status=200)
        return Response({"error": "Invalid token"}, status=400)

class RequestListCreateView(generics.ListCreateAPIView):
    queryset = TutoringRequest.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        serializer.save()

       
class RequestResponseCreateView(generics.ListCreateAPIView):
    serializer_class = RequestReplySerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        serializer.save()


class StudentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id = request.query_params.get('parent', None)
        if not parent_id:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        students = User.objects.filter(roles='student', parent=parent_id)
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)


class TutorStudentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tutor_username = request.query_params.get('tutor', None)
        if not tutor_username:
            return Response({"error": "Missing 'tutor' query parameter."}, status=400)

        students = AcceptedTutor.objects.filter(tutor__username=tutor_username)
        unique_students = {}
        for student in students:
            if student.student not in unique_students:
                unique_students[student.student] = student
        serializer = AcceptedTutorSerializer(unique_students.values(), many=True)
        return Response(serializer.data)


class PersonalRequestListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id = request.query_params.get('parent', None)
        if not parent_id:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        request_qs = TutoringRequest.objects.filter(
            parent=parent_id,
            is_accepted="Not Accepted"
        ).order_by('-created_at')
        serializer = RequestSerializer(request_qs, many=True)
        return Response(serializer.data)


class ReplyListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_id = request.query_params.get('parent', None)
        tutoring_request_id = request.query_params.get('selectedRequestID')
        if not parent_id:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        replies = TutorResponse.objects.filter(
            request__id=tutoring_request_id,
            request__parent=parent_id,
            rejected=False
        )
        serializer = RequestReplySerializer(replies, many=True)
        return Response(serializer.data)


class RequestListView(APIView):
    permission_classes = [AllowAny]

    def get(self, requests):
        requests = TutoringRequest.objects.filter(
            is_accepted="Not Accepted"
        ).order_by('-created_at')
        serializer = RequestSerializer(requests, many=True)
        return Response(serializer.data)


class AcceptReplyCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = AcceptedTutorSerializer

    def perform_create(self, serializer):
        accepted_tutor = serializer.save()
        requestID = accepted_tutor.request_id
        try:
            tutoring_request = TutoringRequest.objects.get(id=requestID)
            tutoring_request.is_accepted = "Accepted"
            tutoring_request.save()
        except TutoringRequest.DoesNotExist:
            pass

    def get(self, request):
        parentUsername = request.query_params.get("parent")
        tutorsList = AcceptedTutor.objects.filter(parent__username=parentUsername)
        serializer = AcceptedTutorSerializer(tutorsList, many=True)
        return Response(serializer.data)


class RejectUpdateView(APIView):
    permission_classes = [AllowAny]
    serializer_class = AcceptedTutorSerializer

    def post(self, request):
        replyID = request.query_params.get('replyID')
        try:
            reply = TutorResponse.objects.get(id=replyID)
            reply.rejected = True
            reply.save()
        except TutorResponse.DoesNotExist:
            pass

        return Response("Success! Reply has been deleted")


class ChangeTutor(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        student = request.data.get('student')
        value = request.data.get('value')
        try:
            change = AcceptedTutor.objects.get(student__username=student)
            currentStatus = change.status

            if value == False:
                change.status = "DISPUTED"
                change.save()
                return Response({
                    "message": "Success! Status changed.",
                    "student": student,
                    "previous_status": currentStatus,
                    "new_status": change.status,
                })

            if value == True:
                change.status = "ACCEPTED"
                change.save()
                return Response({
                    "message": "Changed to ACCEPTED",
                    "student": student,
                    "current_status": currentStatus,
                })
        except AcceptedTutor.DoesNotExist:
            pass

        return Response("END of POST")

class LogHoursCreateView(generics.ListCreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = HoursSerializer
    queryset = Hours.objects.all()

    def perform_create(self, serializer):
        student_username = serializer.validated_data.get('student')
        if not student_username:
            raise ValidationError("Missing 'student' field")

        student_user = User.objects.get(username=student_username)
        parent_user = student_user.parent

        serializer.save(parent=parent_user)

class ParentHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_username = request.query_params.get("parent")
        parent = User.objects.get(username=parent_username)
        records = Hours.objects.filter(parent=parent).order_by('-created_at')
        serializer = HoursSerializer(records, many=True)
        return Response(serializer.data)

class DisputeHours(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        dispute_id = request.data.get('eventId')
        email = request.data.get('email')
        dispute_message = request.data.get('message')

        Hours.objects.filter(id=dispute_id).update(status='DISPUTE')
        self.send_dispute_email(email)
        return Response("Status changed to 'DISPUTE'")

    def send_dispute_email(self, to_email):
        subject = "Dispute Received!"
        message = "Our team is currently reviewing your dispute. Thank you for bringing this to our attention."
        from_email = "egstutor@gmail.com"
        send_mail(subject, message, from_email, [to_email])

class WeeklyHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("currentDay")
        target_date = make_aware(datetime.strptime(date_str, "%Y-%m-%d"))

        start_date = (target_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = (target_date - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=999999)

        weekly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date')
        serializer = HoursSerializer(weekly_hours, many=True)
        return Response(serializer.data)

    def post(self, request):
        entries = request.data
        created = False

        for entry in entries:
            parent_user = User.objects.get(username=entry['parent'])
            email = parent_user.email

            exists = WeeklyHours.objects.filter(
                date=entry['date'],
                parent=parent_user,
                email=email,
                OnlineHours=entry['OnlineHours'],
                InPersonHours=entry['InPersonHours']
            ).exists()

            if not exists:
                WeeklyHours.objects.create(
                    date=entry['date'],
                    parent=parent_user,
                    email=email,
                    OnlineHours=entry['OnlineHours'],
                    InPersonHours=entry['InPersonHours'],
                    TotalBeforeTax=entry['TotalBeforeTax']
                )
                created = True

        if created:
            return Response({"status": "created"}, status=201)
        return Response({"status": "Not Created, Duplicate"}, status=200)

class calculateTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("currentDay")
        target_date = make_aware(datetime.strptime(date_str, "%Y-%m-%d"))

        start_date = (target_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = (target_date - timedelta(days=1)).replace(hour=23, minute=59, second=59, microsecond=999999)

        weekly_hours = Hours.objects.filter(date__range=(start_date, end_date))
        parents = set(weekly_hours.values_list('parent', flat=True))

        rate_data = User.objects.filter(id__in=parents, roles='parent', is_active=True).values('id', 'rateOnline', 'rateInPerson')
        online_rate_dict = {item['id']: Decimal(item['rateOnline'] or 0) for item in rate_data}
        inperson_rate_dict = {item['id']: Decimal(item['rateInPerson'] or 0) for item in rate_data}

        results = []

        for parent_id in parents:
            parent_hours = weekly_hours.filter(parent_id=parent_id)
            online_hours = Decimal(parent_hours.filter(location='Online').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)
            inperson_hours = Decimal(parent_hours.filter(location='In-Person').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)

            total_online = online_hours * online_rate_dict.get(parent_id, Decimal('0'))
            total_inperson = inperson_hours * inperson_rate_dict.get(parent_id, Decimal('0'))
            total_before_tax = total_online + total_inperson

            results.append({
                "date": target_date.date(),
                "parent": parent_id,
                "OnlineHours": float(online_hours),
                "InPersonHours": float(inperson_hours),
                "TotalBeforeTax": float(total_before_tax),
            })

        return Response(results)

class CreateInvoiceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        today_str = request.query_params.get('currentDay')
        if not today_str:
            return Response({"error": "Missing 'currentDay' query parameter"}, status=400)

        try:
            today = datetime.strptime(today_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        # Get all customer emails for today
        customers_email_qs = WeeklyHours.objects.filter(date=today).values_list('email', flat=True).distinct()

        existing_customers = []
        for email_str in customers_email_qs:
            # Find stripe customers by email
            result = stripe.Customer.list(email=email_str)
            if result and result.data:
                existing_customers.append(result.data[0])  # Use the first matching Stripe customer

        for customer in existing_customers:
            # Get the total before tax amount for this customer's email and date
            amount_dict = WeeklyHours.objects.filter(date=today, email=customer.email).values('TotalBeforeTax').first()
            if not amount_dict or 'TotalBeforeTax' not in amount_dict:
                continue

            # Convert amount to cents as integer
            amount_cents = int(Decimal(amount_dict['TotalBeforeTax']) * 100)

            # Create invoice item first
            stripe.InvoiceItem.create(
                customer=customer.id,
                quantity=1,
                unit_amount=amount_cents,
                currency='cad',
                description='Tutoring Sessions',
            )

            # Create the invoice with collection_method send_invoice (email)
            invoice = stripe.Invoice.create(
                customer=customer.id,
                collection_method='send_invoice',
                days_until_due=7,
            )

            # Finalize and send the invoice
            stripe.Invoice.finalize_invoice(invoice.id)
            stripe.Invoice.send_invoice(invoice.id)

            print(f'Invoice for {customer.email} was sent. Amount: {amount_cents} cents')

        return Response("All done!")


class InvoiceListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        customer_email = request.query_params.get("email")
        if not customer_email:
            return Response({"error": "Missing 'email' query parameter"}, status=400)

        result = stripe.Customer.list(email=customer_email)
        if not result.data:
            return Response({"error": "No Stripe customer found with this email"}, status=404)

        customer = result.data[0]
        invoices = stripe.Invoice.list(customer=customer.id, limit=55)

        response = []
        for invoice in invoices.auto_paging_iter():
            created_dt = datetime.fromtimestamp(invoice.created)
            due_dt = datetime.fromtimestamp(invoice.due_date) if invoice.due_date else None

            response.append({
                "id": invoice.id,
                "date": created_dt,
                "amount": invoice.amount_due,
                "due_date": due_dt,
                "status": invoice.status,
                "link": invoice.hosted_invoice_url,
            })

        return Response(response)


class MonthlyHoursListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("currentDay")
        if not date_str:
            return Response({"error": "Missing 'currentDay' query parameter"}, status=400)

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d")
            target_date = make_aware(target_date)
        except Exception:
            return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        last_date = target_date - timedelta(days=1)
        start_date = last_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        monthly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date')
        serializer = HoursSerializer(monthly_hours, many=True)
        return Response(serializer.data)

    def post(self, request):
        entries = request.data
        created = False

        for entry in entries:
            email_qs = User.objects.filter(username=entry.get('parent')).values('email')
            email = email_qs.first()['email'] if email_qs.exists() else None
            if not email:
                continue

            exists = MonthlyHours.objects.filter(
                date=entry.get('date'),
                tutor=entry.get('tutor'),
                email=email,
                OnlineHours=entry.get('OnlineHours'),
                InPersonHours=entry.get('InPersonHours')
            ).exists()

            if not exists:
                MonthlyHours.objects.create(
                    date=entry.get('date'),
                    tutor=entry.get('tutor'),
                    email=email,
                    OnlineHours=entry.get('OnlineHours'),
                    InPersonHours=entry.get('InPersonHours'),
                    TotalBeforeTax=entry.get('TotalBeforeTax')
                )
                created = True

        if created:
            return Response({"status": "created"}, status=201)
        else:
            return Response({"status": "Not Created, Duplicate"}, status=200)


class calculateMonthlyTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        date_str = request.query_params.get("currentDay")
        if not date_str:
            return Response({"error": "Missing 'currentDay' query parameter"}, status=400)

        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d")
            target_date = make_aware(target_date)
        except Exception:
            return Response({"error": "Invalid date format, expected YYYY-MM-DD"}, status=400)

        start_date = (target_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        last_date = (target_date - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        monthly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date')
        tutors = set(monthly_hours.values_list('tutor', flat=True))

        results = []
        for tutor_id in tutors:
            tutor_hours = monthly_hours.filter(tutor=tutor_id)
            online_hours = Decimal(tutor_hours.filter(location='Online').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)
            inperson_hours = Decimal(tutor_hours.filter(location='In-Person').aggregate(Sum('totalTime'))['totalTime__sum'] or 0)

            # You had hardcoded rates here (60 for online, 35 for in-person)
            total_online = online_hours * Decimal(60)
            total_inperson = inperson_hours * Decimal(35)
            total_before_tax = total_online + total_inperson

            results.append({
                "date": target_date.date(),
                "tutor": tutor_id,
                "OnlineHours": float(online_hours),
                "InPersonHours": float(inperson_hours),
                "TotalBeforeTax": float(total_before_tax)
            })

        return Response(results)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_chat_session(request):
    session = AiChatSession.objects.create()
    serializer = AiChatSessionSerializer(session)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def chat_session(request, session_id):
    session = get_object_or_404(AiChatSession, id=session_id)
    serializer = AiChatSessionSerializer(session)

    if request.method == 'POST':
        message = request.data.get('message')
        if not message:
            return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)
        session.send(message)

    return Response(serializer.data)
