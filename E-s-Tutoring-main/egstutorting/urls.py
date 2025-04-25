from django.contrib import admin
from django.urls import path, include
from playground.views import CreateUserView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from playground.views import RequestListView, RequestResponseCreateView  # Adjust the import path based on your app's name


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/user/register/", CreateUserView.as_view(), name="register"),
    path("api/token/", TokenObtainPairView.as_view(), name="get_token"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="refresh"),
    path("api-auth/", include("rest_framework.urls")),
    path("api/", include("playground.urls")), 
    #path('api/requests/', RequestListView.as_view(), name='request-list'),                                             
]



