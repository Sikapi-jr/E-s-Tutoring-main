#URLS from egstutoring/url.py/ are forwarded here
from django.urls import path
from . import views

urlpatterns = [
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"),
    path('user/', views.current_user_view, name='current-user'),
    path('students/', views.StudentsListView.as_view(), name='students-list'),
    path("requests/create/", views.RequestListCreateView.as_view(), name="perform_create"),
    path("requests/list/", views.RequestListView.as_view(), name="request-list"),
    path("requests/reply/", views.RequestResponseCreateView.as_view(), name="request-reply"),
    path("responses/<int:response_id>/accept/", views.accept_tutor, name="accept_tutor")
]
