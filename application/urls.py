from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('home/', views.home, name='home'),
    path('extracting/', views.extract_data, name='extracting_page'),
    path('transforming/', views.transform_data, name='transforming_page'),
    path('loading/', views.load_data, name='loading_page'),
    path('apply_transform/', views.apply_transform, name='apply_transform'),
    path('download/csv/', views.download_csv, name='download_csv'),
    path('download/json/', views.download_json_file, name='download_json'),
    path('download/excel/', views.download_excel, name='download_excel'),   
]