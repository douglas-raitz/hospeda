from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.utils import timezone

VALOR_DIARIA_SEMANA = Decimal('120.00')
VALOR_DIARIA_FIM_DE_SEMANA = Decimal('180.00')

HORARIO_CHECK_IN = time(14, 0)
HORARIO_CHECK_OUT = time(12, 0)

PERCENTUAL_CHECK_OUT_ATRASADO = Decimal('0.50')


def eh_fim_de_semana(dia: date) -> bool:
    return dia.weekday() >= 5


def valor_diaria(dia: date) -> Decimal:
    return VALOR_DIARIA_FIM_DE_SEMANA if eh_fim_de_semana(dia) else VALOR_DIARIA_SEMANA


def _local(momento: datetime) -> datetime:
    return timezone.localtime(momento) if timezone.is_aware(momento) else momento


def check_in_antecipado(momento: datetime) -> bool:
    return _local(momento).time() < HORARIO_CHECK_IN


def check_out_atrasado(momento: datetime) -> bool:
    return _local(momento).time() > HORARIO_CHECK_OUT


def calcular_cobranca(entrada: datetime, saida: datetime) -> dict:
    entrada = _local(entrada)
    saida = _local(saida)

    dia_entrada = entrada.date()
    dia_saida = saida.date()

    noites = max((dia_saida - dia_entrada).days, 1)

    diarias = []
    total_diarias = Decimal('0.00')

    for indice in range(noites):
        dia = dia_entrada + timedelta(days=indice)
        diaria = valor_diaria(dia)

        total_diarias += diaria
        diarias.append(
            {
                'data': dia,
                'fim_de_semana': eh_fim_de_semana(dia),
                'valor_diaria': diaria,
            }
        )

    multa = Decimal('0.00')
    atrasado = check_out_atrasado(saida)
    if atrasado:
        multa = (valor_diaria(dia_saida) * PERCENTUAL_CHECK_OUT_ATRASADO).quantize(
            Decimal('0.01')
        )

    return {
        'diarias': diarias,
        'noites': noites,
        'total_diarias': total_diarias,
        'check_out_atrasado': atrasado,
        'multa_check_out': multa,
        'total_geral': total_diarias + multa,
    }
