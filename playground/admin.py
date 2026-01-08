from django.contrib import admin
from .models import (
    User,
    Session,
    Invoice,
    TutoringRequest,
    TutorResponse,
    AcceptedTutor,
    Hours,
    WeeklyHours,
    AiChatSession,
    AiRequest,
    DiscountRegistration,
    GroupTutoringClass,
    GroupEnrollment,
    DiagnosticTest,
    DiagnosticTestSubmission,
    ClassSession,
    ClassAttendance,
    ClassFile,
    Quiz,
    QuizQuestion,
    QuizSubmission,
)

# If you want to customize admin interface per model, you can define ModelAdmin classes here.

# Custom admin for better management
class DiagnosticTestInline(admin.TabularInline):
    model = DiagnosticTest
    extra = 1
    fields = ('question_text', 'question_type', 'correct_answer', 'points', 'order')

class ClassSessionInline(admin.TabularInline):
    model = ClassSession
    extra = 1
    fields = ('session_date', 'start_time', 'end_time', 'title', 'is_cancelled')

class ClassFileInline(admin.TabularInline):
    model = ClassFile
    extra = 1
    fields = ('title', 'file', 'week_number', 'is_current')

class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 1
    fields = ('question_text', 'question_type', 'correct_answer', 'points', 'order')

@admin.register(GroupTutoringClass)
class GroupTutoringClassAdmin(admin.ModelAdmin):
    list_display = ('title', 'difficulty', 'subject', 'start_date', 'end_date', 'enrolled_count', 'max_students', 'is_active')
    list_filter = ('difficulty', 'subject', 'is_active')
    search_fields = ('title', 'description')
    inlines = [DiagnosticTestInline, ClassSessionInline, ClassFileInline]
    readonly_fields = ('enrolled_count', 'created_at', 'updated_at')

@admin.register(GroupEnrollment)
class GroupEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'tutoring_class', 'status', 'requires_diagnostic', 'diagnostic_score', 'created_at')
    list_filter = ('status', 'requires_diagnostic', 'tutoring_class')
    search_fields = ('student__firstName', 'student__lastName', 'parent__firstName', 'parent__lastName')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(DiagnosticTestSubmission)
class DiagnosticTestSubmissionAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'token_used', 'submitted_at', 'score', 'reviewed_by', 'reviewed_at')
    list_filter = ('token_used', 'reviewed_by')
    search_fields = ('enrollment__student__firstName', 'enrollment__student__lastName', 'access_token')
    readonly_fields = ('access_token', 'created_at')

@admin.register(ClassSession)
class ClassSessionAdmin(admin.ModelAdmin):
    list_display = ('tutoring_class', 'session_date', 'start_time', 'end_time', 'title', 'is_cancelled')
    list_filter = ('tutoring_class', 'is_cancelled', 'session_date')
    search_fields = ('title', 'description')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(ClassAttendance)
class ClassAttendanceAdmin(admin.ModelAdmin):
    list_display = ('session', 'enrollment', 'status', 'marked_by', 'marked_at')
    list_filter = ('status', 'session__tutoring_class', 'session__session_date')
    search_fields = ('enrollment__student__firstName', 'enrollment__student__lastName', 'notes')
    readonly_fields = ('marked_at',)

@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'tutoring_class', 'scheduled_date', 'is_active', 'passing_score')
    list_filter = ('tutoring_class', 'is_active', 'scheduled_date')
    search_fields = ('title', 'description')
    inlines = [QuizQuestionInline]
    readonly_fields = ('created_at', 'updated_at')

@admin.register(QuizSubmission)
class QuizSubmissionAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'enrollment', 'score', 'passed', 'submitted_at')
    list_filter = ('quiz', 'passed')
    search_fields = ('enrollment__student__firstName', 'enrollment__student__lastName')
    readonly_fields = ('started_at',)

admin.site.register(User)
admin.site.register(Session)
admin.site.register(Invoice)
admin.site.register(TutoringRequest)
admin.site.register(TutorResponse)
admin.site.register(AcceptedTutor)
admin.site.register(Hours)
admin.site.register(WeeklyHours)
admin.site.register(AiChatSession)
admin.site.register(AiRequest)
admin.site.register(DiscountRegistration)
admin.site.register(DiagnosticTest)
admin.site.register(ClassFile)
admin.site.register(QuizQuestion)
