from django.urls import path

from modules.pengumuman import views

urlpatterns = [
    path("", views.PengumumanListView.as_view()),
    path("<int:pk>/", views.PengumumanDetailView.as_view()),
]
