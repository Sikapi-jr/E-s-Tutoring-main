#URLS from egstutoring/url.py/ are forwarded here
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from django.conf import settings
from django.conf.urls.static import static
from playground.views import create_chat_session, chat_session, stripe_reauth_token, create_event, google_status, list_egs_tutoring_events, list_egs_tutoring_events_unfiltered, upload_tutor_document, get_tutor_documents, delete_tutor_document, change_settings_parent
from playground import group_tutoring_views

# Router for group tutoring viewsets
router = DefaultRouter()
router.register(r'group-tutoring/classes', group_tutoring_views.GroupTutoringClassViewSet, basename='group-tutoring-class')
router.register(r'group-tutoring/enrollments', group_tutoring_views.GroupEnrollmentViewSet, basename='group-enrollment')

urlpatterns = [
    path('tutor/upload-document/', views.upload_tutor_document, name='tutor-upload-document'),
    path('user/', views.current_user_view, name='current-user'),
    path('user/mark-tour-complete/', views.mark_tour_complete, name='mark-tour-complete'),
    path('profile/<int:pk>/', change_settings_parent, name='change-settings-parent'),
    path('homeParent/', views.ParentHomeCreateView.as_view(), name='parent-home'),
    path('students/', views.StudentsListView.as_view(), name='students-list'),
    path('students/create/', views.StudentCreateView.as_view(), name='student-create'),
    path('TutorStudents/', views.TutorStudentsListView.as_view(), name='TutorStudents-list'),
    path('referral/create/', views.ReferralCreateView.as_view(), name='referral-create'),
    path('referral/list/', views.ReferralListView.as_view(), name='referral-list'),
    path('referral/admin/all/', views.AdminReferralListView.as_view(), name='admin-referral-list'),
    path("requests/create/", views.RequestListCreateView.as_view(), name="referral-create"),
    path("requests/list/", views.RequestListView.as_view(), name="request-list"),
    path('requests/RejectReply/', views.RejectUpdateView.as_view(), name='request-RejectReply'),
    path("requests/reply/", views.RequestResponseCreateView.as_view(), name="request-reply"),
    path("requests/ViewReply/", views.ReplyListView.as_view(), name="request-ViewReply"),
    path("requests/AcceptReply/", views.AcceptReplyCreateView.as_view(), name="request-AcceptReply"),
    path("requests/PersonalList/", views.PersonalRequestListView.as_view(), name="request-PersonalList"),
    path("parentRequests/", views.PersonalRequestListView.as_view(), name="parent-requests"),  # Alias for frontend
    path("requests/TutorChange/", views.ChangeTutor.as_view(), name="changeTutor"),
    path("log/", views.LogHoursCreateView.as_view(), name="logHours"),
    path("verifyEmail/", views.VerifyEmailView.as_view(), name="verifyEmail"),
    path("resendVerification/", views.ResendVerificationView.as_view(), name="resendVerification"),
    path("admin/resendVerification/", views.AdminResendVerificationView.as_view(), name="adminResendVerification"),
    path("parentHours/", views.ParentHoursListView.as_view(), name="ParentCalendar"),
    path('monthly-reports/create/', views.MonthlyReportCreateView.as_view(), name='monthly-report-create'),
    path('monthly-reports/', views.MonthlyReportListView.as_view(), name='monthly-reports-list'),
    path('monthly-reports/<int:report_id>/', views.MonthlyReportDetailView.as_view(), name='monthly-report-detail'),
    path('monthly-reports/students-status/', views.TutorStudentsReportStatusView.as_view(), name='tutor-students-report-status'),
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

    # Popup endpoints
    path('popups/create/', views.PopupCreateView.as_view(), name='create-popup'),
    path('popups/', views.PopupListView.as_view(), name='popup-list'),
    path('popups/dismiss/', views.PopupDismissView.as_view(), name='popup-dismiss'),

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
    path('student-tutors/<int:student_id>/', views.StudentTutorsDetailView.as_view(), name='student-tutors-detail'),
    
    # Admin endpoints
    path('admin/create-tutor/', views.AdminCreateTutorView.as_view(), name='admin-create-tutor'),
    
    # Tutor change request endpoints
    path('tutor-change-requests/create/', views.TutorChangeRequestCreateView.as_view(), name='tutor-change-request-create'),
    path('tutor-change-requests/', views.TutorChangeRequestListView.as_view(), name='tutor-change-requests'),
    
    # Tutor leave student endpoint
    path('tutor-leave-student/', views.TutorLeaveStudentView.as_view(), name='tutor-leave-student'),

    # Parent unassign tutor endpoint
    path('parent-unassign-tutor/', views.ParentUnassignTutorView.as_view(), name='parent-unassign-tutor'),

    # Tutor referral approval endpoint
    path('tutor-referral-approval/<str:token>/', views.TutorReferralApprovalView.as_view(), name='tutor-referral-approval'),

    # Student can't attend endpoint
    path('student-cant-attend/', views.student_cant_attend, name='student-cant-attend'),
    
    # Debug endpoints for hours
    path('existing-weekly-hours/', views.existing_weekly_hours, name='existing-weekly-hours'),
    path('existing-monthly-hours/', views.existing_monthly_hours, name='existing-monthly-hours'),

    # Admin user search endpoints
    path('admin/users/search/', views.AdminUserSearchView.as_view(), name='admin-user-search'),
    path('admin/users/<int:user_id>/hours/', views.AdminUserHoursView.as_view(), name='admin-user-hours'),
    path('admin/recent-users/', views.AdminRecentUsersView.as_view(), name='admin-recent-users'),

    # Admin test email tool
    path('admin/test-email/', views.admin_test_email, name='admin-test-email'),

    # Admin hours reminder
    path('admin/send-hours-reminder/', views.AdminSendHoursReminderView.as_view(), name='admin-send-hours-reminder'),

    # Admin batch add hours
    path('admin/batch-add-hours/', views.AdminBatchAddHoursView.as_view(), name='admin-batch-add-hours'),

    # Admin all hours overview
    path('admin/all-hours/', views.AdminAllHoursView.as_view(), name='admin-all-hours'),

    # Admin discount registration
    path('admin/discount-registration/', views.DiscountRegistrationView.as_view(), name='admin-discount-registration'),

    # Admin bulk email endpoints
    path('admin/send-parent-emails/', views.AdminSendParentEmailsView.as_view(), name='admin-send-parent-emails'),
    path('admin/send-tutor-emails/', views.AdminSendTutorEmailsView.as_view(), name='admin-send-tutor-emails'),
    path('admin/send-custom-emails/', views.AdminSendCustomEmailsView.as_view(), name='admin-send-custom-emails'),
    path('admin/send-unpaid-invoice-reminders/', views.send_unpaid_invoice_reminders, name='send-unpaid-invoice-reminders'),

    # Group Tutoring endpoints
    path('', include(router.urls)),  # Include router URLs
    path('diagnostic-test/<str:token>/', group_tutoring_views.diagnostic_test, name='diagnostic-test'),
    path('group-tutoring/parent-dashboard/', group_tutoring_views.parent_dashboard, name='parent-dashboard'),
    path('group-tutoring/student-attendance/<int:enrollment_id>/', group_tutoring_views.student_attendance, name='student-attendance'),
    path('group-tutoring/student-files/<int:enrollment_id>/', group_tutoring_views.student_files, name='student-files'),
    path('group-tutoring/parent-sessions-calendar/', group_tutoring_views.parent_sessions_calendar, name='parent-sessions-calendar'),
    path('group-tutoring/cancel-session/<str:session_id>/', group_tutoring_views.cancel_session_attendance, name='cancel-session'),

    # Admin Group Tutoring endpoints
    path('group-tutoring/admin/classes/<int:class_id>/upload-file/', group_tutoring_views.admin_upload_class_file, name='admin-upload-class-file'),
    path('group-tutoring/admin/files/<int:file_id>/', group_tutoring_views.admin_delete_class_file, name='admin-delete-class-file'),
    path('group-tutoring/admin/classes/<int:class_id>/sessions/', group_tutoring_views.admin_get_class_sessions, name='admin-class-sessions'),
    path('group-tutoring/admin/classes/<int:class_id>/attendance/<str:session_date>/', group_tutoring_views.admin_session_attendance, name='admin-session-attendance'),
    path('group-tutoring/admin/classes/<int:class_id>/email-parents/', group_tutoring_views.admin_email_class_parents, name='admin-email-class-parents'),
    path('group-tutoring/admin/classes/<int:class_id>/update-schedule/', group_tutoring_views.admin_update_class_schedule, name='admin-update-class-schedule'),
    path('group-tutoring/admin/classes/<int:class_id>/sessions/<str:session_date>/', group_tutoring_views.admin_update_session, name='admin-update-session'),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
