from django.contrib import admin
from django.urls import path, include, re_path
from django.http import HttpResponse
from playground.views import CreateUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from playground.views import RequestListView, RequestResponseCreateView
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.permissions import AllowAny
import os


def serve_spa(request):
    """Serve the React SPA index.html for all non-API routes (React Router support)."""
    index_path = os.path.join(settings.BASE_DIR, 'frontend', 'dist', 'index.html')
    try:
        with open(index_path, 'rb') as f:
            return HttpResponse(f.read(), content_type='text/html; charset=utf-8')
    except FileNotFoundError:
        return HttpResponse('Frontend not built.', status=503)

# Create custom token views with AllowAny permission
class PublicTokenObtainPairView(TokenObtainPairView):
    permission_classes = [AllowAny]

class PublicTokenRefreshView(TokenRefreshView):
    permission_classes = [AllowAny]


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/user/register/", CreateUserView.as_view(), name="register"),
    path("api/token/", PublicTokenObtainPairView.as_view(), name="get_token"),
    path("api/token/refresh/", PublicTokenRefreshView.as_view(), name="refresh"),
    path("api-auth/", include("rest_framework.urls")),
    path("api/", include("playground.urls")), 
]

# Serve media files in all environments (including production)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Catch-all: serve the React SPA for every route not matched above
urlpatterns += [re_path(r'^.*$', serve_spa)]



