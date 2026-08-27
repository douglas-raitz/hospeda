from django.db import models
from django.utils import timezone

from hospedes.models import Hospede

from . import services


class ReservaQuerySet(models.QuerySet):

    def no_hotel(self):
        """Reservas cujo hóspede já fez check-in e ainda não saiu."""
        return self.filter(status=Reserva.HOSPEDADO)

    def aguardando_check_in(self):
        """Reservas confirmadas cujo check-in ainda não aconteceu."""
        return self.filter(status=Reserva.PENDENTE)


class Reserva(models.Model):

    PENDENTE = 'PENDENTE'
    HOSPEDADO = 'HOSPEDADO'
    FINALIZADA = 'FINALIZADA'
    CANCELADA = 'CANCELADA'
    STATUS_CHOICES = [
        (PENDENTE, "Pendente"),
        (HOSPEDADO, "Hospedado"),
        (FINALIZADA, "Finalizada"),
        (CANCELADA, "Cancelada"),
    ]

    hospede = models.ForeignKey(
        Hospede,
        verbose_name='hóspede',
        related_name='reservas',
        on_delete=models.PROTECT,
    )
    data_entrada = models.DateTimeField('entrada prevista')
    data_saida = models.DateTimeField('saída prevista')
    status = models.CharField(
        'status', max_length=20, choices=STATUS_CHOICES, default=PENDENTE
    )
    check_in_em = models.DateTimeField('check-in em', null=True, blank=True)
    check_out_em = models.DateTimeField('check-out em', null=True, blank=True)
    valor_total = models.DecimalField(
        'valor total', max_digits=10, decimal_places=2, null=True, blank=True
    )
    criado_em = models.DateTimeField('criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('atualizado em', auto_now=True)

    objects = ReservaQuerySet.as_manager()

    class Meta:
        verbose_name = 'reserva'
        verbose_name_plural = 'reservas'
        ordering = ('-criado_em',)

    def __str__(self):
        return f'Reserva #{self.pk} - {self.hospede.nome}'

    @property
    def esta_no_hotel(self):
        return self.status == self.HOSPEDADO

    def calcular_cobranca(self, saida=None):
        entrada = self.check_in_em or self.data_entrada
        saida = saida or self.check_out_em or self.data_saida
        return services.calcular_cobranca(entrada, saida)

    def realizar_check_in(self, momento=None):
        momento = momento or timezone.now()
        self.check_in_em = momento
        self.status = self.HOSPEDADO
        self.save(update_fields=('check_in_em', 'status', 'atualizado_em'))
        return self

    def realizar_check_out(self, momento=None):
        momento = momento or timezone.now()
        cobranca = self.calcular_cobranca(saida=momento)

        self.check_out_em = momento
        self.valor_total = cobranca['total_geral']
        self.status = self.FINALIZADA
        self.save(
            update_fields=('check_out_em', 'valor_total', 'status', 'atualizado_em')
        )
        return cobranca
