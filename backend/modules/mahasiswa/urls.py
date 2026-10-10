from django.urls import path

from modules.mahasiswa import views

urlpatterns = [path("", views.MahasiswaListView.as_view())]
