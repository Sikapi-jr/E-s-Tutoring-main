"""
API views for Group Tutoring system
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta
from django.db.models import Q, Prefetch
from django.core.mail import send_mail
from django.conf import settings

from .models import (
    GroupTutoringClass, GroupEnrollment, DiagnosticTest, DiagnosticTestSubmission,
    ClassSession, ClassAttendance, ClassFile, Quiz, QuizQuestion, QuizSubmission, User
)
from .serializers import (
    GroupTutoringClassSerializer, GroupEnrollmentSerializer,
    DiagnosticTestSerializer, DiagnosticTestPublicSerializer, DiagnosticTestSubmissionSerializer,
    ClassSessionSerializer, ClassAttendanceSerializer, ClassFileSerializer,
    QuizSerializer, QuizQuestionPublicSerializer, QuizSubmissionSerializer
)


class GroupTutoringClassViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Group Tutoring Classes
    """
    queryset = GroupTutoringClass.objects.all()
    serializer_class = GroupTutoringClassSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter classes based on user role"""
        user = self.request.user

        # Admins can see all classes
        if user.roles == 'admin' or user.is_staff or user.is_superuser:
            return GroupTutoringClass.objects.all().order_by('-is_active', 'start_date')

        # Tutors can only see classes they're assigned to
        if user.roles == 'tutor':
            return GroupTutoringClass.objects.filter(tutors=user).order_by('-is_active', 'start_date')

        # Parents can only see active classes
        if user.roles == 'parent':
            return GroupTutoringClass.objects.filter(is_active=True).order_by('start_date')

        # Default: no access
        return GroupTutoringClass.objects.none()

    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        """Get all sessions for a class"""
        tutoring_class = self.get_object()
        sessions = ClassSession.objects.filter(tutoring_class=tutoring_class).order_by('session_date', 'start_time')
        serializer = ClassSessionSerializer(sessions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """Get all files for a class"""
        tutoring_class = self.get_object()
        files = ClassFile.objects.filter(tutoring_class=tutoring_class).order_by('-week_number', '-uploaded_at')
        serializer = ClassFileSerializer(files, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def enrollments(self, request, pk=None):
        """Get all enrollments for a class (admin or assigned tutor)"""
        tutoring_class = self.get_object()
        user = request.user

        # Allow admins and tutors assigned to this class
        if user.roles not in ['admin', 'tutor'] and not user.is_staff and not user.is_superuser:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

        # If tutor, verify they're assigned to this class
        if user.roles == 'tutor' and user not in tutoring_class.tutors.all():
            return Response({'error': 'You are not assigned to this class'}, status=status.HTTP_403_FORBIDDEN)

        enrollments = GroupEnrollment.objects.filter(tutoring_class=tutoring_class).order_by('-created_at')
        serializer = GroupEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def available_tutors(self, request):
        """Get list of available tutors (admin only)"""
        if request.user.roles not in ['admin'] and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        tutors = User.objects.filter(roles='tutor', is_active=True).order_by('firstName', 'lastName')
        tutor_list = [
            {
                'id': tutor.id,
                'name': f"{tutor.firstName} {tutor.lastName}",
                'email': tutor.email
            }
            for tutor in tutors
        ]
        return Response(tutor_list)

    @action(detail=True, methods=['post'])
    def upload_file(self, request, pk=None):
        """Upload a file for a class (tutor only)"""
        user = request.user
        tutoring_class = self.get_object()

        # Check if user is a tutor assigned to this class
        if user.roles != 'tutor' or user not in tutoring_class.tutors.all():
            return Response({'error': 'Only assigned tutors can upload files'}, status=status.HTTP_403_FORBIDDEN)

        title = request.data.get('title')
        file = request.FILES.get('file')
        week_number = request.data.get('week_number')
        is_current = request.data.get('is_current', False)

        if not title or not file:
            return Response({'error': 'Title and file are required'}, status=status.HTTP_400_BAD_REQUEST)

        class_file = ClassFile.objects.create(
            tutoring_class=tutoring_class,
            title=title,
            file=file,
            week_number=week_number if week_number else None,
            is_current=is_current,
            uploaded_by=user
        )

        serializer = ClassFileSerializer(class_file)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def create(self, request, *args, **kwargs):
        """Create a new class (admin only)"""
        if request.user.roles not in ['admin'] and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Update a class (admin only)"""
        if request.user.roles not in ['admin'] and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Delete a class (admin only)"""
        if request.user.roles not in ['admin'] and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        return super().destroy(request, *args, **kwargs)


class GroupEnrollmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing Group Enrollments
    """
    queryset = GroupEnrollment.objects.all()
    serializer_class = GroupEnrollmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter enrollments based on user role"""
        user = self.request.user

        # Admins can see all enrollments
        if user.roles == 'admin' or user.is_staff or user.is_superuser:
            return GroupEnrollment.objects.all().select_related('student', 'parent', 'tutoring_class')

        # Parents can only see their own children's enrollments
        if user.roles == 'parent':
            return GroupEnrollment.objects.filter(parent=user).select_related('student', 'tutoring_class')

        # Default: no access
        return GroupEnrollment.objects.none()

    @action(detail=False, methods=['get'])
    def my_students(self, request):
        """Get parent's students (children)"""
        if request.user.roles != 'parent':
            return Response({'error': 'Only parents can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)

        students = User.objects.filter(parent=request.user, roles='student')
        student_list = [
            {
                'id': student.id,
                'name': f"{student.firstName} {student.lastName}",
                'email': student.email
            }
            for student in students
        ]
        return Response(student_list)

    def create(self, request, *args, **kwargs):
        """Create a new enrollment"""
        user = request.user

        # Only parents can create enrollments for their children
        if user.roles != 'parent':
            return Response(
                {'error': 'Only parents can enroll students'},
                status=status.HTTP_403_FORBIDDEN
            )

        tutoring_class_id = request.data.get('tutoring_class')
        student_id = request.data.get('student')

        # Verify the student is actually the parent's child
        try:
            student = User.objects.get(id=student_id, parent=user)
        except User.DoesNotExist:
            return Response(
                {'error': 'Student not found or not your child'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if class exists and is active
        try:
            tutoring_class = GroupTutoringClass.objects.get(id=tutoring_class_id, is_active=True)
        except GroupTutoringClass.DoesNotExist:
            return Response(
                {'error': 'Class not found or not active'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if class is full
        if tutoring_class.is_full:
            return Response(
                {'error': 'Class is full'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if student is already enrolled
        if GroupEnrollment.objects.filter(tutoring_class=tutoring_class, student=student).exists():
            return Response(
                {'error': 'Student is already enrolled in this class'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Determine if diagnostic is required
        # Beginner classes don't require diagnostic
        # Students who haven't enrolled in any class before require diagnostic
        requires_diagnostic = (
            tutoring_class.difficulty != 'beginner' and
            not GroupEnrollment.objects.filter(student=student, status='enrolled').exists()
        )

        # Create the enrollment
        enrollment = GroupEnrollment.objects.create(
            tutoring_class=tutoring_class,
            student=student,
            parent=user,
            status='pending_diagnostic' if requires_diagnostic else 'approved',
            requires_diagnostic=requires_diagnostic
        )

        # If diagnostic is required, create the diagnostic test submission with token
        if requires_diagnostic:
            submission = DiagnosticTestSubmission.objects.create(
                enrollment=enrollment,
                token_expires_at=timezone.now() + timedelta(days=7)  # Token valid for 7 days
            )
            submission.generate_token()
            submission.save()

            # Send email with diagnostic test link
            diagnostic_url = f"{settings.FRONTEND_URL}/diagnostic-test/{submission.access_token}"
            try:
                send_mail(
                    subject='Complete Your Diagnostic Test - EGS Tutoring',
                    message=f"""
Hello {user.firstName},

Thank you for enrolling {student.firstName} in {tutoring_class.title}!

Before we can confirm the enrollment, {student.firstName} needs to complete a diagnostic test to ensure they're placed in the appropriate level.

Please click the link below to access the test (valid for 7 days):
{diagnostic_url}

Best regards,
EGS Tutoring Team
                    """,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                )
            except Exception as e:
                print(f"Failed to send diagnostic email: {e}")

        serializer = self.get_serializer(enrollment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve an enrollment (admin only)"""
        if request.user.roles not in ['admin'] and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        enrollment = self.get_object()
        enrollment.status = 'enrolled'
        enrollment.enrolled_at = timezone.now()
        enrollment.save()

        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an enrollment (admin only)"""
        if request.user.roles not in ['admin'] and not request.user.is_staff and not request.user.is_superuser:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        enrollment = self.get_object()
        admin_notes = request.data.get('admin_notes', '')
        enrollment.status = 'rejected'
        enrollment.admin_notes = admin_notes
        enrollment.save()

        serializer = self.get_serializer(enrollment)
        return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
def diagnostic_test(request, token):
    """
    Public endpoint for diagnostic test
    GET: Retrieve test questions
    POST: Submit test answers
    """
    try:
        submission = DiagnosticTestSubmission.objects.select_related(
            'enrollment__student',
            'enrollment__tutoring_class'
        ).get(access_token=token)
    except DiagnosticTestSubmission.DoesNotExist:
        return Response({'error': 'Invalid or expired test link'}, status=status.HTTP_404_NOT_FOUND)

    # Check if token is expired
    if timezone.now() > submission.token_expires_at:
        return Response({'error': 'Test link has expired'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if token was already used
    if submission.token_used:
        return Response({'error': 'This test has already been completed'}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'GET':
        # Return test questions (without correct answers)
        questions = DiagnosticTest.objects.filter(
            tutoring_class=submission.enrollment.tutoring_class
        ).order_by('order')

        questions_data = DiagnosticTestPublicSerializer(questions, many=True).data

        return Response({
            'student_name': f"{submission.enrollment.student.firstName} {submission.enrollment.student.lastName}",
            'class_title': submission.enrollment.tutoring_class.title,
            'questions': questions_data
        })

    elif request.method == 'POST':
        # Submit test answers
        answers = request.data.get('answers', {})

        submission.answers = answers
        submission.submitted_at = timezone.now()
        submission.token_used = True

        # Calculate score (auto-grade multiple choice only)
        questions = DiagnosticTest.objects.filter(
            tutoring_class=submission.enrollment.tutoring_class
        )

        total_points = 0
        earned_points = 0

        for question in questions:
            total_points += question.points
            if question.question_type == 'multiple_choice':
                student_answer = answers.get(str(question.id), '')
                if student_answer.strip().lower() == question.correct_answer.strip().lower():
                    earned_points += question.points

        if total_points > 0:
            submission.score = (earned_points / total_points) * 100
        else:
            submission.score = 0

        submission.save()

        # Update enrollment status
        enrollment = submission.enrollment
        enrollment.status = 'diagnostic_submitted'
        enrollment.diagnostic_score = submission.score
        enrollment.save()

        return Response({
            'message': 'Test submitted successfully',
            'score': submission.score
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parent_dashboard(request):
    """
    Get parent's group tutoring dashboard data
    """
    if request.user.roles != 'parent':
        return Response({'error': 'Parent access required'}, status=status.HTTP_403_FORBIDDEN)

    # Get parent's children
    children = User.objects.filter(parent=request.user)

    # Get enrollments for parent's children
    enrollments = GroupEnrollment.objects.filter(
        parent=request.user
    ).select_related('student', 'tutoring_class')

    # Get available classes
    available_classes = GroupTutoringClass.objects.filter(is_active=True).order_by('start_date')

    return Response({
        'children': [
            {
                'id': child.id,
                'firstName': child.firstName,
                'lastName': child.lastName
            } for child in children
        ],
        'enrollments': GroupEnrollmentSerializer(enrollments, many=True).data,
        'available_classes': GroupTutoringClassSerializer(available_classes, many=True).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_attendance(request, enrollment_id):
    """
    Get attendance records for a specific enrollment
    """
    try:
        enrollment = GroupEnrollment.objects.select_related('student', 'parent', 'tutoring_class').get(id=enrollment_id)
    except GroupEnrollment.DoesNotExist:
        return Response({'error': 'Enrollment not found'}, status=status.HTTP_404_NOT_FOUND)

    # Verify access (parent or admin)
    if not (request.user.id == enrollment.parent.id or request.user.roles == 'admin' or request.user.is_staff):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    # Get attendance records
    attendance = ClassAttendance.objects.filter(
        enrollment=enrollment
    ).select_related('session').order_by('-session__session_date')

    serializer = ClassAttendanceSerializer(attendance, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_files(request, enrollment_id):
    """
    Get class files for a specific enrollment
    """
    try:
        enrollment = GroupEnrollment.objects.select_related('student', 'parent', 'tutoring_class').get(id=enrollment_id)
    except GroupEnrollment.DoesNotExist:
        return Response({'error': 'Enrollment not found'}, status=status.HTTP_404_NOT_FOUND)

    # Verify access (parent or admin)
    if not (request.user.id == enrollment.parent.id or request.user.roles == 'admin' or request.user.is_staff):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    # Get class files
    files = ClassFile.objects.filter(
        tutoring_class=enrollment.tutoring_class
    ).order_by('-week_number', '-uploaded_at')

    serializer = ClassFileSerializer(files, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def parent_sessions_calendar(request):
    """
    Get all sessions for a parent's enrolled students with attendance status
    Generates sessions dynamically based on class schedule
    """
    from datetime import datetime, date, time as dt_time

    user = request.user

    if user.roles != 'parent':
        return Response({'error': 'Only parents can access this endpoint'}, status=status.HTTP_403_FORBIDDEN)

    # Get all enrollments for this parent's children
    enrollments = GroupEnrollment.objects.filter(
        parent=user,
        status='enrolled'
    ).select_related('student', 'tutoring_class')

    session_data = []

    # Map day names to weekday numbers (0 = Monday, 6 = Sunday)
    day_name_to_num = {
        'monday': 0,
        'tuesday': 1,
        'wednesday': 2,
        'thursday': 3,
        'friday': 4,
        'saturday': 5,
        'sunday': 6
    }

    for enrollment in enrollments:
        tutoring_class = enrollment.tutoring_class

        # Skip if class doesn't have schedule configured
        if not tutoring_class.schedule_days or not tutoring_class.schedule_time:
            continue

        # Get class date range
        start_date = tutoring_class.start_date
        end_date = tutoring_class.end_date

        # Generate sessions for each scheduled day
        current_date = start_date
        while current_date <= end_date:
            # Check if this day is in the schedule
            day_name = current_date.strftime('%A').lower()

            if day_name in [d.lower() for d in tutoring_class.schedule_days]:
                # Calculate end time based on duration
                start_time = tutoring_class.schedule_time
                duration = timedelta(minutes=tutoring_class.duration_minutes)

                # Create a datetime to calculate end time
                start_datetime = datetime.combine(current_date, start_time)
                end_datetime = start_datetime + duration
                end_time = end_datetime.time()

                # Create unique session identifier (date + class + student)
                session_id = f"{tutoring_class.id}-{enrollment.student.id}-{current_date}"

                # Check if there's an attendance record
                attendance_status = None
                existing_session_id = None
                try:
                    # Try to find existing session
                    existing_session = ClassSession.objects.get(
                        tutoring_class=tutoring_class,
                        session_date=current_date
                    )
                    existing_session_id = existing_session.id
                    # Check attendance
                    try:
                        attendance = ClassAttendance.objects.get(
                            session=existing_session,
                            enrollment=enrollment
                        )
                        attendance_status = attendance.status
                    except ClassAttendance.DoesNotExist:
                        pass
                except ClassSession.DoesNotExist:
                    pass

                # Use existing session ID if available, otherwise use generated ID
                final_session_id = existing_session_id if existing_session_id else session_id

                session_data.append({
                    'id': final_session_id,
                    'enrollment_id': enrollment.id,
                    'class_title': tutoring_class.title,
                    'class_id': tutoring_class.id,
                    'student_name': f"{enrollment.student.firstName} {enrollment.student.lastName}",
                    'student_id': enrollment.student.id,
                    'session_date': str(current_date),
                    'start_time': str(start_time),
                    'end_time': str(end_time),
                    'title': f"{tutoring_class.title}",
                    'description': tutoring_class.description or '',
                    'location': tutoring_class.location or '',
                    'location_link': tutoring_class.location_link or '',
                    'attendance_status': attendance_status
                })

            current_date += timedelta(days=1)

    return Response(session_data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_upload_class_file(request, class_id):
    """
    Admin endpoint to upload files to a specific class week
    """
    user = request.user

    if user.roles not in ['admin'] and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        tutoring_class = GroupTutoringClass.objects.get(id=class_id)
    except GroupTutoringClass.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    title = request.data.get('title')
    file = request.FILES.get('file')
    week_number = request.data.get('week_number')
    description = request.data.get('description', '')
    is_current = request.data.get('is_current', False)

    if not title or not file:
        return Response({'error': 'Title and file are required'}, status=status.HTTP_400_BAD_REQUEST)

    class_file = ClassFile.objects.create(
        tutoring_class=tutoring_class,
        title=title,
        description=description,
        file=file,
        week_number=int(week_number) if week_number else None,
        is_current=is_current == 'true' or is_current == True,
        uploaded_by=user
    )

    serializer = ClassFileSerializer(class_file)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_class_file(request, file_id):
    """
    Admin endpoint to delete a class file
    """
    user = request.user

    if user.roles not in ['admin'] and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        class_file = ClassFile.objects.get(id=file_id)
        class_file.delete()
        return Response({'message': 'File deleted successfully'}, status=status.HTTP_200_OK)
    except ClassFile.DoesNotExist:
        return Response({'error': 'File not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_get_class_sessions(request, class_id):
    """
    Admin endpoint to get all sessions for a class (including dynamically generated ones)
    """
    from datetime import datetime, timedelta as td

    user = request.user

    if user.roles not in ['admin'] and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        tutoring_class = GroupTutoringClass.objects.get(id=class_id)
    except GroupTutoringClass.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get or generate sessions
    sessions = []

    if tutoring_class.schedule_days and tutoring_class.schedule_time:
        current_date = tutoring_class.start_date
        end_date = tutoring_class.end_date

        while current_date <= end_date:
            day_name = current_date.strftime('%A').lower()

            if day_name in [d.lower() for d in tutoring_class.schedule_days]:
                # Try to find existing session
                try:
                    session = ClassSession.objects.get(
                        tutoring_class=tutoring_class,
                        session_date=current_date
                    )
                    sessions.append({
                        'id': session.id,
                        'session_date': str(current_date),
                        'start_time': str(session.start_time),
                        'end_time': str(session.end_time),
                        'title': session.title,
                        'is_cancelled': session.is_cancelled,
                        'exists_in_db': True
                    })
                except ClassSession.DoesNotExist:
                    # Generate session info
                    start_time = tutoring_class.schedule_time
                    duration = td(minutes=tutoring_class.duration_minutes)
                    end_datetime = datetime.combine(current_date, start_time) + duration

                    sessions.append({
                        'id': f"{tutoring_class.id}-{current_date}",
                        'session_date': str(current_date),
                        'start_time': str(start_time),
                        'end_time': str(end_datetime.time()),
                        'title': tutoring_class.title,
                        'is_cancelled': False,
                        'exists_in_db': False
                    })

            current_date += td(days=1)

    return Response(sessions)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admin_session_attendance(request, class_id, session_date):
    """
    Admin endpoint to view and mark attendance for a session
    GET: Get all enrolled students with their attendance status
    POST: Mark attendance for multiple students
    """
    from datetime import datetime

    user = request.user

    if user.roles not in ['admin'] and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        tutoring_class = GroupTutoringClass.objects.get(id=class_id)
    except GroupTutoringClass.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    # Parse session date
    try:
        session_date_obj = datetime.strptime(session_date, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format. Use YYYY-MM-DD'}, status=status.HTTP_400_BAD_REQUEST)

    # Get or create the session
    session, created = ClassSession.objects.get_or_create(
        tutoring_class=tutoring_class,
        session_date=session_date_obj,
        defaults={
            'title': tutoring_class.title,
            'start_time': tutoring_class.schedule_time,
            'end_time': (
                datetime.combine(session_date_obj, tutoring_class.schedule_time) +
                timedelta(minutes=tutoring_class.duration_minutes)
            ).time()
        }
    )

    if request.method == 'GET':
        # Get all enrolled students
        enrollments = GroupEnrollment.objects.filter(
            tutoring_class=tutoring_class,
            status='enrolled'
        ).select_related('student')

        attendance_data = []
        for enrollment in enrollments:
            try:
                attendance = ClassAttendance.objects.get(session=session, enrollment=enrollment)
                status_value = attendance.status
                notes = attendance.notes
            except ClassAttendance.DoesNotExist:
                status_value = None
                notes = ''

            attendance_data.append({
                'enrollment_id': enrollment.id,
                'student_id': enrollment.student.id,
                'student_name': f"{enrollment.student.firstName} {enrollment.student.lastName}",
                'status': status_value,
                'notes': notes
            })

        return Response({
            'session_id': session.id,
            'session_date': str(session_date_obj),
            'class_title': tutoring_class.title,
            'attendance': attendance_data
        })

    elif request.method == 'POST':
        # Mark attendance for students
        attendance_records = request.data.get('attendance', [])

        for record in attendance_records:
            enrollment_id = record.get('enrollment_id')
            status_value = record.get('status')
            notes = record.get('notes', '')

            if not enrollment_id or not status_value:
                continue

            try:
                enrollment = GroupEnrollment.objects.get(id=enrollment_id)
            except GroupEnrollment.DoesNotExist:
                continue

            attendance, created = ClassAttendance.objects.update_or_create(
                session=session,
                enrollment=enrollment,
                defaults={
                    'status': status_value,
                    'notes': notes,
                    'marked_by': user
                }
            )

        return Response({'message': 'Attendance marked successfully'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_email_class_parents(request, class_id):
    """
    Admin endpoint to send emails to all parents of enrolled students in a class
    """
    user = request.user

    if user.roles not in ['admin'] and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        tutoring_class = GroupTutoringClass.objects.get(id=class_id)
    except GroupTutoringClass.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    subject = request.data.get('subject')
    message = request.data.get('message')

    if not subject or not message:
        return Response({'error': 'Subject and message are required'}, status=status.HTTP_400_BAD_REQUEST)

    # Get all parents of enrolled students
    enrollments = GroupEnrollment.objects.filter(
        tutoring_class=tutoring_class,
        status='enrolled'
    ).select_related('parent', 'student')

    # Group by parent to avoid duplicate emails
    parent_emails = {}
    for enrollment in enrollments:
        if enrollment.parent.email not in parent_emails:
            parent_emails[enrollment.parent.email] = {
                'parent': enrollment.parent,
                'students': []
            }
        parent_emails[enrollment.parent.email]['students'].append(enrollment.student)

    sent_count = 0
    failed_count = 0

    for email, data in parent_emails.items():
        parent = data['parent']
        students = data['students']
        student_names = ', '.join([f"{s.firstName} {s.lastName}" for s in students])

        # Personalize message
        personalized_message = f"""
Hello {parent.firstName},

This message is regarding your child(ren) enrolled in {tutoring_class.title}: {student_names}

{message}

Best regards,
EGS Tutoring Team
        """

        try:
            send_mail(
                subject=f"{subject} - {tutoring_class.title}",
                message=personalized_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
            sent_count += 1
        except Exception as e:
            print(f"Failed to send email to {email}: {e}")
            failed_count += 1

    return Response({
        'message': f'Emails sent successfully',
        'sent_count': sent_count,
        'failed_count': failed_count,
        'total_parents': len(parent_emails)
    })


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def admin_update_class_schedule(request, class_id):
    """
    Admin endpoint to update class schedule and notify parents
    """
    user = request.user

    if user.roles not in ['admin'] and not user.is_staff and not user.is_superuser:
        return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

    try:
        tutoring_class = GroupTutoringClass.objects.get(id=class_id)
    except GroupTutoringClass.DoesNotExist:
        return Response({'error': 'Class not found'}, status=status.HTTP_404_NOT_FOUND)

    # Store old schedule for comparison
    old_schedule = {
        'schedule_days': tutoring_class.schedule_days,
        'schedule_time': str(tutoring_class.schedule_time) if tutoring_class.schedule_time else None,
        'start_date': str(tutoring_class.start_date) if tutoring_class.start_date else None,
        'end_date': str(tutoring_class.end_date) if tutoring_class.end_date else None,
        'location': tutoring_class.location,
        'location_link': tutoring_class.location_link
    }

    # Update schedule fields
    if 'schedule_days' in request.data:
        tutoring_class.schedule_days = request.data['schedule_days']
    if 'schedule_time' in request.data:
        tutoring_class.schedule_time = request.data['schedule_time']
    if 'start_date' in request.data:
        tutoring_class.start_date = request.data['start_date']
    if 'end_date' in request.data:
        tutoring_class.end_date = request.data['end_date']
    if 'duration_minutes' in request.data:
        tutoring_class.duration_minutes = request.data['duration_minutes']
    if 'location' in request.data:
        tutoring_class.location = request.data['location']
    if 'location_link' in request.data:
        tutoring_class.location_link = request.data['location_link']

    tutoring_class.save()

    # Notify parents if requested
    notify_parents = request.data.get('notify_parents', False)

    if notify_parents:
        # Get all parents of enrolled students
        enrollments = GroupEnrollment.objects.filter(
            tutoring_class=tutoring_class,
            status='enrolled'
        ).select_related('parent', 'student')

        parent_emails = {}
        for enrollment in enrollments:
            if enrollment.parent.email not in parent_emails:
                parent_emails[enrollment.parent.email] = {
                    'parent': enrollment.parent,
                    'students': []
                }
            parent_emails[enrollment.parent.email]['students'].append(enrollment.student)

        # Build schedule change summary
        new_schedule = {
            'schedule_days': tutoring_class.schedule_days,
            'schedule_time': str(tutoring_class.schedule_time) if tutoring_class.schedule_time else None,
            'start_date': str(tutoring_class.start_date) if tutoring_class.start_date else None,
            'end_date': str(tutoring_class.end_date) if tutoring_class.end_date else None,
            'location': tutoring_class.location,
            'location_link': tutoring_class.location_link
        }

        changes = []
        if old_schedule['schedule_days'] != new_schedule['schedule_days']:
            old_days = ', '.join([d.capitalize() for d in (old_schedule['schedule_days'] or [])])
            new_days = ', '.join([d.capitalize() for d in (new_schedule['schedule_days'] or [])])
            changes.append(f"- Class days changed from [{old_days}] to [{new_days}]")
        if old_schedule['schedule_time'] != new_schedule['schedule_time']:
            changes.append(f"- Class time changed from {old_schedule['schedule_time']} to {new_schedule['schedule_time']}")
        if old_schedule['start_date'] != new_schedule['start_date']:
            changes.append(f"- Start date changed from {old_schedule['start_date']} to {new_schedule['start_date']}")
        if old_schedule['end_date'] != new_schedule['end_date']:
            changes.append(f"- End date changed from {old_schedule['end_date']} to {new_schedule['end_date']}")
        if old_schedule['location'] != new_schedule['location']:
            changes.append(f"- Location changed from '{old_schedule['location']}' to '{new_schedule['location']}'")
        if old_schedule['location_link'] != new_schedule['location_link']:
            changes.append(f"- Location link updated")

        if changes:
            change_summary = '\n'.join(changes)

            sent_count = 0
            for email, data in parent_emails.items():
                parent = data['parent']
                students = data['students']
                student_names = ', '.join([f"{s.firstName} {s.lastName}" for s in students])

                message = f"""
Hello {parent.firstName},

We wanted to inform you about a schedule change for {tutoring_class.title}.

Your enrolled child(ren): {student_names}

Changes made:
{change_summary}

New Schedule:
- Days: {', '.join([d.capitalize() for d in (tutoring_class.schedule_days or [])])}
- Time: {tutoring_class.schedule_time}
- Duration: {tutoring_class.duration_minutes} minutes
- Dates: {tutoring_class.start_date} to {tutoring_class.end_date}
- Location: {tutoring_class.location or 'TBD'}
{f'- Link: {tutoring_class.location_link}' if tutoring_class.location_link else ''}

If you have any questions, please contact us.

Best regards,
EGS Tutoring Team
                """

                try:
                    send_mail(
                        subject=f"Schedule Change - {tutoring_class.title}",
                        message=message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[email],
                        fail_silently=True,
                    )
                    sent_count += 1
                except Exception as e:
                    print(f"Failed to send schedule notification to {email}: {e}")

            return Response({
                'message': 'Schedule updated and parents notified',
                'notifications_sent': sent_count,
                'class': GroupTutoringClassSerializer(tutoring_class).data
            })

    return Response({
        'message': 'Schedule updated successfully',
        'class': GroupTutoringClassSerializer(tutoring_class).data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_session_attendance(request, session_id):
    """
    Cancel attendance for a specific session
    Parent must cancel at least 6 hours in advance
    Handles dynamically generated sessions
    """
    from datetime import datetime

    user = request.user

    if user.roles != 'parent':
        return Response({'error': 'Only parents can cancel attendance'}, status=status.HTTP_403_FORBIDDEN)

    enrollment_id = request.data.get('enrollment_id')

    try:
        enrollment = GroupEnrollment.objects.get(id=enrollment_id, parent=user, status='enrolled')
    except GroupEnrollment.DoesNotExist:
        return Response({'error': 'Enrollment not found'}, status=status.HTTP_404_NOT_FOUND)

    # Handle dynamically generated session IDs (format: "classid-studentid-date")
    if isinstance(session_id, str) and '-' in session_id and not session_id.isdigit():
        parts = session_id.split('-')
        if len(parts) >= 3:
            class_id = parts[0]
            student_id = parts[1]
            session_date_str = '-'.join(parts[2:])  # YYYY-MM-DD

            try:
                session_date = datetime.strptime(session_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid session date format'}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create the session
            tutoring_class = enrollment.tutoring_class
            session, created = ClassSession.objects.get_or_create(
                tutoring_class=tutoring_class,
                session_date=session_date,
                defaults={
                    'title': f"{tutoring_class.title}",
                    'start_time': tutoring_class.schedule_time,
                    'end_time': (
                        datetime.combine(session_date, tutoring_class.schedule_time) +
                        timedelta(minutes=tutoring_class.duration_minutes)
                    ).time()
                }
            )
    else:
        # Handle traditional numeric session ID
        try:
            session = ClassSession.objects.get(id=session_id)
        except ClassSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check if session is in the future
    session_datetime = timezone.make_aware(
        timezone.datetime.combine(session.session_date, session.start_time)
    )
    now = timezone.now()

    if session_datetime <= now:
        return Response({'error': 'Cannot cancel past sessions'}, status=status.HTTP_400_BAD_REQUEST)

    # Check if cancellation is at least 6 hours in advance
    time_until_session = (session_datetime - now).total_seconds() / 3600  # Convert to hours

    if time_until_session < 6:
        # Mark as absent (too late to cancel)
        attendance, created = ClassAttendance.objects.get_or_create(
            session=session,
            enrollment=enrollment,
            defaults={
                'status': 'absent',
                'notes': 'Late cancellation (less than 6 hours notice)',
                'marked_by': user
            }
        )
        if not created:
            attendance.status = 'absent'
            attendance.notes = 'Late cancellation (less than 6 hours notice)'
            attendance.marked_by = user
            attendance.save()

        return Response({
            'message': 'Session cancelled, but marked as absent due to late notice (less than 6 hours)',
            'status': 'absent'
        }, status=status.HTTP_200_OK)
    else:
        # Mark as cancelled in advance
        attendance, created = ClassAttendance.objects.get_or_create(
            session=session,
            enrollment=enrollment,
            defaults={
                'status': 'cancelled_advance',
                'notes': 'Cancelled by parent in advance',
                'marked_by': user
            }
        )
        if not created:
            attendance.status = 'cancelled_advance'
            attendance.notes = 'Cancelled by parent in advance'
            attendance.marked_by = user
            attendance.save()

        return Response({
            'message': 'Session cancelled successfully',
            'status': 'cancelled_advance'
        }, status=status.HTTP_200_OK)
