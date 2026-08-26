from django.db import models


class Hospede(models.Model):
    nome = models.CharField('nome', max_length=80)
    telefone = models.CharField('telefone', max_length=20)
    documento = models.CharField('documento', max_length=20, unique=True)
    criado_em = models.DateTimeField('criado em', auto_now_add=True)
    atualizado_em = models.DateTimeField('atualizado em', auto_now=True)

    class Meta:
        verbose_name = 'hóspede'
        verbose_name_plural = 'hóspedes'
        ordering = ('-criado_em',)

    def __str__(self):
        return f'{self.nome} ({self.documento})'
