from django.shortcuts import render
from rest_framework.decorators import api_view
from django.contrib.auth import get_user_model  # Correct way to import the user model
from rest_framework import generics, status
from .serializers import UserSerializer, NoteSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Note
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




# Use get_user_model() to reference the active user model.
User = get_user_model()
current_time = now()
stripe.api_key = settings.STRIPE_SECRET_KEY

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):

    print("Request User:", request.user)  # Should print the username of the authenticated user
    print("User Data:", request.user.email)
    print("Is Authenticated:", request.user.is_authenticated)  # Should be True for authenticated users
    print("Auth Token:", request.auth)  # Should show the JWT token
    print("is_active:", request.user.is_active)  # Should show if active

    #Data sent to frontend for current user
    if request.user:
        user_data = {
            "firstName": request.user.firstName,
            "lastName": request.user.lastName,
            "username": request.user.username,
            "email": request.user.email,
            "roles": request.user.roles,
            "parent": request.user.parent,
            "is_active": request.user.is_active,
            "is_superuser": request.user.is_superuser
            
        }
        request.user.last_login = current_time
        print(request.user) 
        return Response(user_data)
    return Response({"error": "User is not authenticated"}, status=401)

class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Use the custom user model
        user = self.request.user
        return Note.objects.filter(author=user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)

class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Note.objects.filter(author=user)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        user.is_active = False  # Require email verification
        user.save()
        self.send_verification_email(user, self.request)

    def send_verification_email(self, user, request):
        to_email = user.email  # safer than query param
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)

        domain = get_current_site(request).domain
        verify_url = f"http://localhost:5173/verify-email/{uid}/{token}/"
        subject = "Verify your email"
        message = f"Click the link to verify your account: {verify_url}"
        from_email = "egstutor@gmail.com"

        send_mail(subject, message, from_email, [to_email])


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
        else:
            return Response({"error": "Invalid token"}, status=400)
        
class RequestListCreateView(generics.ListCreateAPIView): #ListCreateAPIView can handle both GET and POST
    # Use the custom user model's manager for queryset
    queryset = TutoringRequest.objects.all()
    serializer_class = RequestSerializer
    permission_classes = [AllowAny]
    null=True,
    blank=True

    def perform_create(self, serializer):
        serializer.save()
       
class RequestResponseCreateView(generics.ListCreateAPIView):
    serializer_class = RequestReplySerializer
    #permission_classes = [IsAuthenticated]
    permission_classes = [AllowAny]
    def perform_create(self, serializer):
        serializer.save()
    
class StudentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Get the parent's username from query parameters, request = http request object automatically passed to view
        parent_username = request.query_params.get('parent', None) #Return default value "None" if parent not present in header
        if not parent_username:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        # Filter users with role 'student' whose parent's username matches the given username.
        students = User.objects.filter(roles='student', parent=parent_username)
        serializer = UserSerializer(students, many=True)
        return Response(serializer.data)
    
class TutorStudentsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Get the parent's username from query parameters, request = http request object automatically passed to view
        tutor_username = request.query_params.get('tutor', None) #Return default value "None" if parent not present in header
        if not tutor_username:
            return Response({"error": "Missing 'tutor' query parameter."}, status=400)

        # Filter users with role 'student' whose parent's username matches the given username.
        students = AcceptedTutor.objects.filter(tutor=tutor_username)
        unique_students = {}
        for student in students:
            if student.student not in unique_students:
                unique_students[student.student] = student
        serializer = AcceptedTutorSerializer(unique_students.values(), many=True)
        return Response(serializer.data)



class PersonalRequestListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        parent_username = request.query_params.get('parent', None) #Return default value "None" if parent not present in header
        if not parent_username:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)

        # Filter users with role 'student' whose parent's username matches the given username.
        request = TutoringRequest.objects.filter(
            parent=parent_username, 
            is_accepted="Not Accepted"
            ).order_by('-created_at')  #Will return the request list in descending order (thanks to the minus '-')
        serializer = RequestSerializer(request, many=True)
        return Response(serializer.data)
    
class ReplyListView(APIView):
    permission_classes = [AllowAny]


    def get(self,request):
        parent_username = request.query_params.get('parent', None)
        tutoring_request_id = request.query_params.get('selectedRequestID')
        if not parent_username:
            return Response({"error": "Missing 'parent' query parameter."}, status=400)
        
        replies = TutorResponse.objects.filter(request__id= tutoring_request_id, request__parent=parent_username, rejected=False)  #Double underscore references an attribute of an object
        serializer = RequestReplySerializer(replies, many=True)                                                                    #rejected doesnt have a __ because it is an attribute straight from TutorResponse
        return Response(serializer.data)
    
class RequestListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, requests):
        requests = TutoringRequest.objects.filter(
            is_accepted="Not Accepted"
        ).order_by('-created_at')  # Fetch requests from the database
        serializer = RequestSerializer(requests, many=True)
        return Response(serializer.data)
    
class AcceptReplyCreateView(generics.CreateAPIView):
    permission_classes = [AllowAny]

    serializer_class=AcceptedTutorSerializer
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
        tutorsList = AcceptedTutor.objects.filter(parent = parentUsername) #.get only returns one object (many=true will return error). Use .filter instead
        serializer = AcceptedTutorSerializer(tutorsList, many=True)
        return Response(serializer.data)
    
class RejectUpdateView(APIView):
    permission_classes = [AllowAny]

    serializer_class=AcceptedTutorSerializer
    def post(self, request):
        #use validated_data instead of .save to simply modify existing data
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
        #use validated_data instead of .save to simply modify existing data
        student = request.data.get('student')
        value = request.data.get('value')
        try:
            change = AcceptedTutor.objects.get(student=student)
            currentStatus = change.status
            if(value==False):
                change.status = "DISPUTED"
                change.save()
                return Response({
            "message": "Success! Status changed.",
            "student": student,
            "previous_status": currentStatus,
            "new_status": change.status,
        })
            if(value==True):
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
        #Serializer does not have query.params, it is used to validate and save data. Use self instead. Cannot use query.params if data was sent on payload
        studentUsername = serializer.validated_data.get('student')
        if not studentUsername:
            raise ValidationError("Missing 'student' query parameter")    
        user = User.objects.get(username=studentUsername)
        parent = user.parent
    
        custom_data = {"parent": parent}
        serializer.save(**custom_data)

class ParentHoursListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        parentUsername = request.query_params.get("parent")
        requests = Hours.objects.filter(
            parent=parentUsername
        ).order_by('-created_at')  # Fetch requests from the database
        serializer = HoursSerializer(requests, many=True)
        return Response(serializer.data)
    
class DisputeHours(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        print("Dispute post received")
        disputeID = request.data.get('eventId')
        print(disputeID)
        disputeMessage = request.data.get('message')
        print(disputeMessage)

        selectedHour = Hours.objects.filter(id=disputeID).update(status='DISPUTE')
        self.send_dispute_email(self.request)
        return Response("Status changed to 'DISPUTE'")

    def send_dispute_email(self, request):
        #Hey Elvis, get user email via queury
        print("Dispute send email received")
        to_email = request.data.get('email')  # safer than query param

        subject = "Dispute Received!"
        message = f"Our team is currently reviewing your dispute. Thank you for bringing this to our attention,"
        from_email = "egstutor@gmail.com"

        send_mail(subject, message, from_email, [to_email])
        return Response("Dispute Email Sent")


class WeeklyHoursListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Input string (Should take the current date [Monday])
        date_str = request.query_params.get("currentDay")
        target_date = datetime.strptime(date_str, "%Y-%m-%d") #Converts date_str into a dateTime object

        # Ensure datetime is timezone-aware
        target_date = make_aware(target_date) #Makes target_date time_aware

        # Get last week's Monday 00:00:00 and Sunday 23:59:59
        start_date = (target_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        last_date = (target_date - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Query for objects in that date range
        weekly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date') #"order-by" breaks the uniqueness of parent. set() helps with

        serializer = HoursSerializer(weekly_hours, many=True)
        return Response(serializer.data)

    def post(self, request):
            entries = request.data
            created = False
            for entry in entries:
                #Makes sure that even if button pressed multiple times, it wont create duplicate tuples
                email = User.objects.filter(username=entry['parent']).values('email').first()
                if email:
                    email = email['email']
                exists = WeeklyHours.objects.filter(
                    date=entry['date'],
                    parent=entry['parent'],
                    email=email,
                    OnlineHours=entry['OnlineHours'],
                    InPersonHours=entry['InPersonHours']
                ).exists()

                if not exists:
                    WeeklyHours.objects.create(
                        date=entry['date'],
                        parent=entry['parent'],
                        email=email,
                        OnlineHours=entry['OnlineHours'],
                        InPersonHours=entry['InPersonHours'],
                        TotalBeforeTax=entry['TotalBeforeTax']
                    )
                    created = True #Cant have the return here or else after 1 entry it will automatically return without checking the other entries.

                   
            if created:
                return Response({"status": "created"}, status=201)
            else:
                return Response({"status": "Not Created, Duplicate"}, status=301)

class calculateTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
            # Input string (Should take the current date [Monday])
            date_str = request.query_params.get("currentDay")
            target_date = datetime.strptime(date_str, "%Y-%m-%d") #Converts date_str into a dateTime object

            # Ensure datetime is timezone-aware
            target_date = make_aware(target_date) #Makes target_date time_aware

            # Get last week's Monday 00:00:00 and Sunday 23:59:59
            start_date = (target_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            last_date = (target_date - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

            # Query for objects in that date range
            weekly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date') #"order-by" breaks the uniqueness of parent. set() helps with that
            parents = set(weekly_hours.values_list('parent', flat=True))
            print("This is list of parents: ")
            print(list(parents))
            print(current_time)
            rate = User.objects.filter(roles='parent', is_active=1)
            

            online_rate_dict = {
                item['parent']: Decimal(item['rateOnline']) if item['rateOnline'] is not None else Decimal('0')
                for item in rate.values('parent', 'rateOnline')
            }

            inperson_rate_dict = {
                item['parent']: Decimal(item['rateInPerson']) if item['rateInPerson'] is not None else Decimal('0')
                for item in rate.values('parent', 'rateInPerson')
            }

            results = []

            for parent in parents:
                parent_hours = weekly_hours.filter(parent=parent)
                online_hours =  parent_hours.filter(location='Online').aggregate(Sum('totalTime'))['totalTime__sum'] or 0
                inperson_hours = parent_hours.filter(location='In-Person').aggregate(Sum('totalTime'))['totalTime__sum'] or 0
                online_rate = online_rate_dict.get(parent)
                inperson_rate = inperson_rate_dict.get(parent)

                online_hours = Decimal(online_hours)
                inperson_hours = Decimal(inperson_hours)


                totalOnline = online_hours * online_rate
                totalInPerson = inperson_hours * inperson_rate
                totalBeforeTax = totalOnline + totalInPerson

                results.append({
                    "date": target_date.date(),
                    "parent": parent,
                    "OnlineHours": float(online_hours),
                    "InPersonHours": float(inperson_hours),
                    "TotalBeforeTax": float(totalBeforeTax)
                })

            return Response(results)

class CreateInvoiceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        existing_customer = []
        today = request.query_params.get('currentDay', None)
        customersEmail = WeeklyHours.objects.filter(date=today).values('email')
        for email_entry in customersEmail:
            email_str = email_entry['email'] #Convert from email = ... to just example@gmail.com
            result = stripe.Customer.list(email=email_str)
            if result:
                existing_customer.append(result.data[0]) #[0] ensures it only grabs the first matching data.

                    
        
        for parent in existing_customer:
            amount_S = WeeklyHours.objects.filter(date=today, email=parent.email).values('TotalBeforeTax').first()
            if not amount_S or 'TotalBeforeTax' not in amount_S:
                continue  

            amountS = Decimal(Decimal(amount_S['TotalBeforeTax']) * 100)

            invoice = stripe.Invoice.create(
                customer=parent.id,
                collection_method='send_invoice',
                days_until_due=7
            )
            stripe.InvoiceItem.create(
                customer=parent.id,
                quantity=1,
                unit_amount_decimal=amountS,
                currency='cad',
                description='Tutoring Sessions',
                invoice=invoice.id
            )

            

            stripe.Invoice.finalize_invoice(invoice.id) #Stripe does not need to link invoice item with the invoice, it automatically links the latest item to the newest invoice

            stripe.Invoice.send_invoice(invoice.id)

            print('Invoice for ', parent.email, ' was sent.' )
            print('Amount: ', type(amountS) )

        return Response("All done!")
       
        
class InvoiceListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        response = []
        result = []
        customerEmail = request.query_params.get("email", None)
        result = stripe.Customer.list(email=customerEmail)
        firstResult = result.data[0]
        invoices = stripe.Invoice.list(customer=firstResult.id, limit=55)
        for invoice in invoices.auto_paging_iter():
            if not invoice:
                return Response("No Invoices")
            readable_time = datetime.fromtimestamp(invoice.created)
            readable_due = datetime.fromtimestamp(invoice.due_date)
            response.append({
                "id": invoice.id,
                "date": readable_time,
                "amount": invoice.amount_due,
                "due_date": readable_due,
                "status": invoice.status,
                "link": invoice.hosted_invoice_url, 
            })
            print(invoice.id, readable_time, invoice.amount_due, invoice.status)
        return Response(response)
    
class MonthlyHoursListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        # Input string (Should take the current date [Monday])
        date_str = request.query_params.get("currentDay")
        target_date = datetime.strptime(date_str, "%Y-%m-%d") #Converts date_str into a dateTime object

        # Ensure datetime is timezone-aware
        target_date = make_aware(target_date) #Makes target_date time_aware

        # Get last week's Monday 00:00:00 and Sunday 23:59:59
        last_date = (target_date - timedelta(days=1))
        start_date = last_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Query for objects in that date range
        monthly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date') #"order-by" breaks the uniqueness of parent. set() helps with

        serializer = HoursSerializer(monthly_hours, many=True)
        return Response(serializer.data)

    def post(self, request):
            entries = request.data
            created = False
            for entry in entries:
                #Makes sure that even if button pressed multiple times, it wont create duplicate tuples
                email = User.objects.filter(username=entry['parent']).values('email').first()
                if email:
                    email = email['email']
                exists = MonthlyHours.objects.filter(
                    date=entry['date'],
                    tutor=entry['tutor'],
                    email=email,
                    OnlineHours=entry['OnlineHours'],
                    InPersonHours=entry['InPersonHours']
                ).exists()

                if not exists:
                    MonthlyHours.objects.create(
                        date=entry['date'],
                        tutor=entry['tutor'],
                        email=email,
                        OnlineHours=entry['OnlineHours'],
                        InPersonHours=entry['InPersonHours'],
                        TotalBeforeTax=entry['TotalBeforeTax']
                    )
                    created = True #Cant have the return here or else after 1 entry it will automatically return without checking the other entries.

                   
            if created:
                return Response({"status": "created"}, status=201)
            else:
                return Response({"status": "Not Created, Duplicate"}, status=301)
            

class calculateMonthlyTotal(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
            # Input string (Should take the current date [Monday])
            date_str = request.query_params.get("currentDay")
            target_date = datetime.strptime(date_str, "%Y-%m-%d") #Converts date_str into a dateTime object

            # Ensure datetime is timezone-aware
            target_date = make_aware(target_date) #Makes target_date time_aware

            # Get last week's Monday 00:00:00 and Sunday 23:59:59
            start_date = (target_date - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            last_date = (target_date - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = last_date.replace(hour=23, minute=59, second=59, microsecond=999999)

            # Query for objects in that date range
            monthly_hours = Hours.objects.filter(date__range=(start_date, end_date)).order_by('date') #"order-by" breaks the uniqueness of parent. set() helps with that
            tutors = set(monthly_hours.values_list('tutor', flat=True))
            print("This is list of tutors: ")
            print(list(tutors))
            print(current_time)
            rate = User.objects.filter(roles='tutor', is_active=1)
            

            #online_rate_dict = {
                #item['parent']: Decimal(item['rateOnline']) if item['rateOnline'] is not None else Decimal('0')
                #for item in rate.values('parent', 'rateOnline')
            #}

            #inperson_rate_dict = {
                #item['parent']: Decimal(item['rateInPerson']) if item['rateInPerson'] is not None else Decimal('0')
                #for item in rate.values('parent', 'rateInPerson')
            #}

            results = []

            for tutor in tutors:
                tutor_hours = monthly_hours.filter(tutor=tutor)
                online_hours =  tutor_hours.filter(location='Online').aggregate(Sum('totalTime'))['totalTime__sum'] or 0
                inperson_hours = tutor_hours.filter(location='In-Person').aggregate(Sum('totalTime'))['totalTime__sum'] or 0
                #online_rate = online_rate_dict.get(parent)
                #inperson_rate = inperson_rate_dict.get(parent)

                online_hours = Decimal(online_hours)
                inperson_hours = Decimal(inperson_hours)


                totalOnline = online_hours * 60
                totalInPerson = inperson_hours * 35
                totalBeforeTax = totalOnline + totalInPerson

                results.append({
                    "date": target_date.date(),
                    "tutor": tutor,
                    "OnlineHours": float(online_hours),
                    "InPersonHours": float(inperson_hours),
                    "TotalBeforeTax": float(totalBeforeTax)
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

    if request.method== 'POST':
        message = request.data.get('message')
        if not message:
            return Response(
                {'error: ' 'Message is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        session.send(message)
    return Response(serializer.data)