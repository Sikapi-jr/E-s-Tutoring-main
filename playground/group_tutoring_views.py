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
        if user.roles == 'admin' or user.is_staff:
            return GroupTutoringClass.objects.all().order_by('-is_active', 'start_date')

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
        """Get all enrollments for a class (admin only)"""
        if request.user.roles not in ['admin'] and not request.user.is_staff:
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)

        tutoring_class = self.get_object()
        enrollments = GroupEnrollment.objects.filter(tutoring_class=tutoring_class).order_by('-created_at')
        serializer = GroupEnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)


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
        if user.roles == 'admin' or user.is_staff:
            return GroupEnrollment.objects.all().select_related('student', 'parent', 'tutoring_class')

        # Parents can only see their own children's enrollments
        if user.roles == 'parent':
            return GroupEnrollment.objects.filter(parent=user).select_related('student', 'tutoring_class')

        # Default: no access
        return GroupEnrollment.objects.none()

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
        if request.user.roles not in ['admin'] and not request.user.is_staff:
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
        if request.user.roles not in ['admin'] and not request.user.is_staff:
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
