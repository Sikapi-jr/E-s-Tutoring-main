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
)

# If you want to customize admin interface per model, you can define ModelAdmin classes here.

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
