"""
WSGI config for egstutorting project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/wsgi/
"""

import os
from pathlib import Path

from django.core.wsgi import get_wsgi_application
from whitenoise import WhiteNoise

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'egstutorting.settings')

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

application = get_wsgi_application()

# Wrap with WhiteNoise to serve media files in production
application = WhiteNoise(application)
application.add_files(str(BASE_DIR / 'media'), prefix='media')
