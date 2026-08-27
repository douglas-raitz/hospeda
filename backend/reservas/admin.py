from django.contrib import admin

from .models import Reserva


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'hospede',
        'status',
        'data_entrada',
        'data_saida',
        'valor_total',
    )
    list_filter = ('status',)
    search_fields = ('hospede__nome', 'hospede__documento', 'hospede__telefone')
    autocomplete_fields = ('hospede',)
    readonly_fields = ('check_in_em', 'check_out_em', 'criado_em', 'atualizado_em')
