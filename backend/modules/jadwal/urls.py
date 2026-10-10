from django.urls import path

from modules.jadwal import views

urlpatterns = [
    path("", views.JadwalListView.as_view()),
    path("<int:pk>/", views.JadwalDetailView.as_view()),
]
