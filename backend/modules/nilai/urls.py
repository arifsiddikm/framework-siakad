from django.urls import path

from modules.nilai import views

urlpatterns = [path("", views.NilaiView.as_view())]
