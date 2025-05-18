from django.db.models.signals import post_save
from django.dispatch import receiver
from playground.models import AiRequest
from playground.tasks import handle_ai_request_job

@receiver(post_save, sender=AiRequest) #This function is ran anytimes a new AiRequest object is saved
def queue_ai_request_job(sender, instance, created, **kwargs):
    if created: #Prevents duplicates, will only run once, when the object is created (not updated)
        print("Signal: queuing job for new AiRequest")
        handle_ai_request_job.delay(instance.id)