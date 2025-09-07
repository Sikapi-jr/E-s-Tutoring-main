#URLS from egstutoring/url.py/ are forwarded here
from django.urls import path, include
from . import views
from django.conf import settings
from django.conf.urls.static import static
from playground.views import create_chat_session, chat_session, stripe_reauth_token, create_event, google_status, list_egs_tutoring_events, list_egs_tutoring_events_unfiltered, upload_tutor_document, get_tutor_documents, delete_tutor_document, change_settings_parent

urlpatterns = [
    path('tutor/upload-document/', views.upload_tutor_document, name='tutor-upload-document'),
    path('user/', views.current_user_view, name='current-user'),
    path('profile/<int:pk>/', change_settings_parent, name='change-settings-parent'),
    path('homeParent/', views.ParentHomeCreateView.as_view(), name='parent-home'),
    path('students/', views.StudentsListView.as_view(), name='students-list'),
    path('TutorStudents/', views.TutorStudentsListView.as_view(), name='TutorStudents-list'),
    path('referral/create/', views.ReferralCreateView.as_view(), name='referral-create'),
    path('referral/list/', views.ReferralListView.as_view(), name='referral-list'),
    path("requests/create/", views.RequestListCreateView.as_view(), name="referral-create"),
    path("requests/list/", views.RequestListView.as_view(), name="request-list"),
    path('requests/RejectReply/', views.RejectUpdateView.as_view(), name='request-RejectReply'),
    path("requests/reply/", views.RequestResponseCreateView.as_view(), name="request-reply"),
    path("requests/ViewReply/", views.ReplyListView.as_view(), name="request-ViewReply"),
    path("requests/AcceptReply/", views.AcceptReplyCreateView.as_view(), name="request-AcceptReply"),
    path("requests/PersonalList/", views.PersonalRequestListView.as_view(), name="request-PersonalList"),
    path("requests/TutorChange/", views.ChangeTutor.as_view(), name="changeTutor"),
    path("log/", views.LogHoursCreateView.as_view(), name="logHours"),
    path("verifyEmail/", views.VerifyEmailView.as_view(), name="verifyEmail"),
    path("resendVerification/", views.ResendVerificationView.as_view(), name="resendVerification"),
    path("parentHours/", views.ParentHoursListView.as_view(), name="ParentCalendar"),
    path('monthly-reports/create/', views.MonthlyReportCreateView.as_view(), name='monthly-report-create'),
    path('monthly-reports/', views.MonthlyReportListView.as_view(), name='monthly-reports-list'),
    path('monthly-reports/<int:report_id>/', views.MonthlyReportDetailView.as_view(), name='monthly-report-detail'),
    path('tutor-student-hours/', views.TutorStudentHoursView.as_view(), name='tutor-student-hours'),
    path("weeklyHours/", views.WeeklyHoursListView.as_view(), name="weeklyHours"),
    path("calculateHours/", views.calculateTotal.as_view(), name="calculateHours"),
    path("monthlyHours/", views.MonthlyHoursListView.as_view(), name="monthlyHours"),
    path("monthlyPayout/", views.BatchMonthlyHoursPayoutView.as_view(), name="monthlyPayout"),
    path("calculateMonthlyHours/", views.calculateMonthlyTotal.as_view(), name="calculateMonthlyHours"),
    path("checkout/", views.CreateInvoiceView.as_view(), name="checkout"),
    path("invoiceList/", views.InvoiceListView.as_view(), name="invoiceList"),
    path("dispute/", views.DisputeHours.as_view(), name="dispute"),
    path("hours/<int:hour_id>/edit/", views.EditHoursView.as_view(), name="edit-hours"),
    path("hours/<int:hour_id>/tutor-reply/", views.TutorReplyView.as_view(), name="tutor-reply"),
    path("chat/sessions/", create_chat_session),
    path("chat/sessions/<str:session_id>/", chat_session),
    path('password_reset/', include('django_rest_passwordreset.urls', namespace='password_reset')),
    path('password-reset-username/', views.UsernamePasswordResetView.as_view(), name='password-reset-username'),
    path('stripe/reauth/<uidb64>/<token>/', stripe_reauth_token),
    path('announcements/create/', views.AnnouncementCreateView.as_view(), name='create-announcement'),
    path('announcements/', views.AnnouncementListView.as_view(), name='announcement-list'),
    path('google/oauth/init', views.GoogleOAuthInitView.as_view()),
    path('google/oauth2callback', views.GoogleOAuthCallbackView.as_view()),
    path('errorTicket/', views.ErrorView.as_view()),
    path('google/update-rsvp/', views.UpdateEventRsvpView.as_view(), name='update-rsvp'),
    path('create-event/', create_event),
    path('google/events/', list_egs_tutoring_events),
    path('google/events/all/', list_egs_tutoring_events_unfiltered),
    path('google/status/', google_status),
    path('tutor/upload-document/', upload_tutor_document, name='tutor-upload-document'),
    path('tutor/documents/', get_tutor_documents, name='get-tutor-documents'),
    path('tutor/documents/<int:document_id>/', delete_tutor_document, name='delete-tutor-document'),
    path('api/media/<path:path>', views.get_media_file, name='get-media-file'),
    
    # Hour Dispute URLs
    path('disputes/create/', views.HourDisputeCreateView.as_view(), name='dispute-create'),
    path('disputes/', views.HourDisputeListView.as_view(), name='dispute-list'),
    path('disputes/<int:pk>/manage/', views.AdminDisputeManagementView.as_view(), name='admin-dispute-manage'),
    path('disputes/<int:pk>/cancel/', views.CancelDisputeView.as_view(), name='dispute-cancel'),
    
    # Tutor complaint endpoints
    path('tutor-complaints/', views.TutorComplaintListCreateView.as_view(), name='tutor-complaints'),
    path('tutor-complaints/<int:complaint_id>/manage/', views.TutorComplaintManageView.as_view(), name='manage-complaint'),
    
    # Student tutors endpoint
    path('student/tutors/', views.StudentTutorsView.as_view(), name='student-tutors'),
    
    # Admin endpoints
    path('admin/create-tutor/', views.AdminCreateTutorView.as_view(), name='admin-create-tutor'),
    
    # Tutor change request endpoints
    path('tutor-change-requests/create/', views.TutorChangeRequestCreateView.as_view(), name='tutor-change-request-create'),
    path('tutor-change-requests/', views.TutorChangeRequestListView.as_view(), name='tutor-change-requests'),
    
    # Tutor leave student endpoint
    path('tutor-leave-student/', views.TutorLeaveStudentView.as_view(), name='tutor-leave-student'),
    
    # Student can't attend endpoint
    path('student-cant-attend/', views.student_cant_attend, name='student-cant-attend'),
    
    # Debug endpoints for hours
    path('existing-weekly-hours/', views.existing_weekly_hours, name='existing-weekly-hours'),
    path('existing-monthly-hours/', views.existing_monthly_hours, name='existing-monthly-hours'),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
