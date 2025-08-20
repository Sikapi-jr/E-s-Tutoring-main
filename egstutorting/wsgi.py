"""
WSGI config for egstutorting project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'egstutorting.settings')

application = get_wsgi_application()

# Configure WhiteNoise to serve media files in production
from django.conf import settings
if hasattr(settings, 'MEDIA_ROOT') and settings.MEDIA_ROOT:
    application = WhiteNoise(application)
    application.add_files(settings.MEDIA_ROOT, prefix=settings.MEDIA_URL)
