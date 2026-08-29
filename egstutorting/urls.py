from django.contrib import admin
from django.urls import path, include, re_path
from playground.views import CreateUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from playground.views import RequestListView, RequestResponseCreateView
from django.conf import settings
from django.views.static import serve as static_serve
from rest_framework.permissions import AllowAny
from django.http import HttpResponse
import os

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

# Serve media files in all environments (including production).
# django.conf.urls.static.static() only registers a route when DEBUG=True
# (it's a no-op otherwise), which silently broke media serving (announcement/
# popup images, profile pictures, uploaded documents, etc.) whenever
# DEBUG=False - wire the view directly so it works regardless of DEBUG.
urlpatterns += [
    re_path(r'^%s(?P<path>.*)$' % settings.MEDIA_URL.lstrip('/'), static_serve, {'document_root': settings.MEDIA_ROOT}),
]


def serve_spa(request, path=''):
    index_path = os.path.join(settings.BASE_DIR, 'frontend', 'dist', 'index.html')
    try:
        with open(index_path, 'rb') as f:
            return HttpResponse(f.read(), content_type='text/html; charset=utf-8')
    except FileNotFoundError:
        return HttpResponse('Frontend not built.', status=503)


urlpatterns += [re_path(r'^.*$', serve_spa)]



