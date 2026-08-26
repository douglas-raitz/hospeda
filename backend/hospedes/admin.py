from django.contrib import admin

from .models import Hospede


@admin.register(Hospede)
class HospedeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'telefone', 'documento', 'criado_em', 'atualizado_em')
    search_fields = ('nome', 'documento', 'telefone')
