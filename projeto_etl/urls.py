# projeto_etl/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('etl_app.urls')), # Inclui as URLs do nosso app
]