from django.core.management.base import BaseCommand
from django.conf import settings
from pathlib import Path
import os
import shutil
from playground.models import User, Announcements

class Command(BaseCommand):
    help = 'Copy existing media files to frontend public directory'

    def handle(self, *args, **options):
        self.stdout.write('Copying media files to frontend public directory...')
        
        # Get paths
        base_dir = Path(settings.BASE_DIR)
        media_root = Path(settings.MEDIA_ROOT)
        frontend_public = base_dir / "frontend" / "public" / "uploads"
        
        # Create directories
        (frontend_public / "profile_picture").mkdir(parents=True, exist_ok=True)
        (frontend_public / "announcements").mkdir(parents=True, exist_ok=True)
        (frontend_public / "user_documents").mkdir(parents=True, exist_ok=True)
        
        # Copy profile pictures
        self.stdout.write('Copying profile pictures...')
        for user in User.objects.filter(profile_picture__isnull=False):
            if user.profile_picture and os.path.exists(user.profile_picture.path):
                filename = os.path.basename(user.profile_picture.name)
                dest_path = frontend_public / "profile_picture" / filename
                try:
                    shutil.copy2(user.profile_picture.path, dest_path)
                    self.stdout.write(f'  Copied: {filename}')
                except Exception as e:
                    self.stdout.write(f'  Failed to copy {filename}: {e}')
        
        # Copy announcement images
        self.stdout.write('Copying announcement images...')
        for announcement in Announcements.objects.filter(image__isnull=False):
            if announcement.image and os.path.exists(announcement.image.path):
                filename = os.path.basename(announcement.image.name)
                dest_path = frontend_public / "announcements" / filename
                try:
                    shutil.copy2(announcement.image.path, dest_path)
                    self.stdout.write(f'  Copied: {filename}')
                except Exception as e:
                    self.stdout.write(f'  Failed to copy {filename}: {e}')
        
        self.stdout.write(self.style.SUCCESS('Media files copied successfully!'))