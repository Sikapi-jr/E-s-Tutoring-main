#URLS from egstutoring/url.py/ are forwarded here
from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static
from playground.views import create_chat_session, chat_session, stripe_reauth_token, create_event, google_status

urlpatterns = [
    path('user/', views.current_user_view, name='current-user'),
    path('homeParent/', views.ParentHomeCreateView.as_view(), name='parent-home'),
    path('students/', views.StudentsListView.as_view(), name='students-list'),
    path('TutorStudents/', views.TutorStudentsListView.as_view(), name='TutorStudents-list'),
    path("requests/create/", views.RequestListCreateView.as_view(), name="perform_create"),
    path("requests/list/", views.RequestListView.as_view(), name="request-list"),
    path('requests/RejectReply/', views.RejectUpdateView.as_view(), name='request-RejectReply'),
    path("requests/reply/", views.RequestResponseCreateView.as_view(), name="request-reply"),
    path("requests/ViewReply/", views.ReplyListView.as_view(), name="request-ViewReply"),
    path("requests/AcceptReply/", views.AcceptReplyCreateView.as_view(), name="request-AcceptReply"),
    path("requests/PersonalList/", views.PersonalRequestListView.as_view(), name="request-PersonalList"),
    path("requests/TutorChange/", views.ChangeTutor.as_view(), name="changeTutor"),
    path("log/", views.LogHoursCreateView.as_view(), name="logHours"),
    path("verifyEmail/", views.VerifyEmailView.as_view(), name="logHours"),
    path("parentCalendar/", views.ParentHoursListView.as_view(), name="ParentCalendar"),
    path("weeklyHours/", views.WeeklyHoursListView.as_view(), name="weeklyHours"),
    path("calculateHours/", views.calculateTotal.as_view(), name="calculateHours"),
    path("monthlyHours/", views.MonthlyHoursListView.as_view(), name="monthlyHours"),
    path("calculateMonthlyHours/", views.calculateMonthlyTotal.as_view(), name="calculateMonthlyHours"),
    path("checkout/", views.CreateInvoiceView.as_view(), name="checkout"),
    path("invoiceList/", views.InvoiceListView.as_view(), name="invoiceList"),
    path("dispute/", views.DisputeHours.as_view(), name="dispute"),
    path("chat/sessions/", create_chat_session),
    path("chat/sessions/<str:session_id>/", chat_session),
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    path('stripe/reauth/<uidb64>/<token>/', stripe_reauth_token),
    path('announcements/create/', views.AnnouncementCreateView.as_view(), name='create-announcement'),
    path('announcements/', views.AnnouncementListView.as_view(), name='announcement-list'),
    path('google/oauth/init', views.GoogleOAuthInitView.as_view()),
    path('google/oauth2callback', views.GoogleOAuthCallbackView.as_view()),
    path('create-event/', create_event),
    path('google/status/', google_status),


]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
