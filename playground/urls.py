#URLS from egstutoring/url.py/ are forwarded here
from django.urls import path, include
from . import views
from playground.views import create_chat_session, chat_session

urlpatterns = [
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"),
    path('user/', views.current_user_view, name='current-user'),
    path('students/', views.StudentsListView.as_view(), name='students-list'),
    path('TutorStudents/', views.TutorStudentsListView.as_view(), name='TutorStudents-list'),
    path("requests/create/", views.RequestListCreateView.as_view(), name="perform_create"),
    path("requests/list/", views.RequestListView.as_view(), name="request-list"),
    path('requests/RejectReply/', views.RejectUpdateView.as_view(), name='request-RejectRrply'),
    path("requests/reply/", views.RequestResponseCreateView.as_view(), name="request-reply"),
    path("requests/ViewReply/", views.ReplyListView.as_view(), name="request-ViewReply"),
    path("requests/AcceptReply/", views.AcceptReplyCreateView.as_view(), name="request-AcceptReply"),
    path("requests/PersonalList/", views.PersonalRequestListView.as_view(), name="request-PersonalList"),
    path("log/", views.LogHoursCreateView.as_view(), name="logHours"),
    path("verifyEmail/", views.VerifyEmailView.as_view(), name="logHours"),
    path("parentCalendar/", views.ParentHoursListView.as_view(), name="ParentCalendar"),
    path("weeklyHours/", views.WeeklyHoursListView.as_view(), name="weeklyHours"),
    path("calculateHours/", views.calculateTotal.as_view(), name="calculateHours"),
    path("monthlyHours/", views.MonthlyHoursListView.as_view(), name="monthlyHours"),
    path("calculateMonthlyHours/", views.calculateMonthlyTotal.as_view(), name="calculateMonthlyHours"),
    path("checkout/", views.CreateInvoiceView.as_view(), name="checkout"),
    path("invoiceList/", views.InvoiceListView.as_view(), name="invoiceList"),
    path("chat/sessions/", create_chat_session),
    path("chat/sessions/<str:session_id>/", chat_session),
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
]
