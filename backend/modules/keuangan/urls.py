from django.urls import path

from modules.keuangan import views

urlpatterns = [
    path("", views.TagihanView.as_view()),
    path("<int:pk>/", views.TagihanDetailView.as_view()),
]
