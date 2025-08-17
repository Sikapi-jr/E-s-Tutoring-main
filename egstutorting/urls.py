from django.contrib import admin
from django.urls import path, include
from playground.views import CreateUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from playground.views import RequestListView, RequestResponseCreateView 
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.permissions import AllowAny

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

# Serve media files in both development and production
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)



