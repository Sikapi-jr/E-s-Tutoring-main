import os
import django
from celery import Celery, shared_task

django.setup() #Forces django to be fully setup before any commands are ran

from playground import models

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'egstutorting.settings')

app = Celery('egstutorting')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related configuration keys
#   should have a `CELERY_` prefix.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

#To run the shell: 
# docker compose run --rm playground sh -c "python manage.py shell"
# from playground import tasks
# task.hello_task("Mark")  -> This will be ran by the program
# task.hello_task.delay("Mark") -> This will queue the task in the message queue (Worker)

#To add a task for background processing, take the logic code from the view, and place it into the task.py file. Then, in the view section
#replace the code that was there with task.TASKNAME.delay(ARGUMENTS)