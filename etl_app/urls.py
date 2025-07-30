# etl_app/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('extracting/', views.extract_data, name='extracting_page'),
    path('transforming/', views.transform_data, name='transforming_page'),
    path('loading/', views.load_data, name='loading_page'),
]