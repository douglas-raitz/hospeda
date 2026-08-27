from datetime import datetime
from decimal import Decimal
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from hospedes.models import Hospede

from . import services
from .models import Reserva


def momento(ano, mes, dia, hora=0, minuto=0):
    """Datetime no fuso do hotel — é nele que as regras são definidas."""
    return timezone.make_aware(datetime(ano, mes, dia, hora, minuto))


class CalculoDaCobrancaTests(TestCase):
    """2026-03-09 é uma segunda-feira; 2026-03-14 e 15, sábado e domingo."""

    def test_diaria_de_dia_util(self):
        cobranca = services.calcular_cobranca(
            momento(2026, 3, 9, 14), momento(2026, 3, 10, 12)
        )
        self.assertEqual(cobranca['noites'], 1)
        self.assertEqual(cobranca['total_geral'], Decimal('120.00'))

    def test_diaria_de_fim_de_semana(self):
        cobranca = services.calcular_cobranca(
            momento(2026, 3, 14, 14), momento(2026, 3, 15, 12)
        )
        self.assertEqual(cobranca['total_geral'], Decimal('180.00'))

    def test_estadia_mistura_dias_uteis_e_fim_de_semana(self):
        # Sexta (120) + sábado (180) + domingo (180).
        cobranca = services.calcular_cobranca(
            momento(2026, 3, 13, 14), momento(2026, 3, 16, 12)
        )
        self.assertEqual(cobranca['noites'], 3)
        self.assertEqual(cobranca['total_diarias'], Decimal('480.00'))

    def test_check_out_atrasado_cobra_metade_da_diaria_do_dia(self):
        # Saída no domingo às 15h: 50% de 180.
        cobranca = services.calcular_cobranca(
            momento(2026, 3, 14, 14), momento(2026, 3, 15, 15)
        )
        self.assertTrue(cobranca['check_out_atrasado'])
        self.assertEqual(cobranca['multa_check_out'], Decimal('90.00'))
        self.assertEqual(cobranca['total_geral'], Decimal('270.00'))

    def test_check_out_no_horario_nao_gera_multa(self):
        cobranca = services.calcular_cobranca(
            momento(2026, 3, 9, 14), momento(2026, 3, 10, 12)
        )
        self.assertFalse(cobranca['check_out_atrasado'])
        self.assertEqual(cobranca['multa_check_out'], Decimal('0.00'))

    def test_estadia_no_mesmo_dia_cobra_uma_diaria(self):
        cobranca = services.calcular_cobranca(
            momento(2026, 3, 9, 14), momento(2026, 3, 9, 20)
        )
        self.assertEqual(cobranca['noites'], 1)

    def test_extrato_detalha_cada_diaria(self):
        cobranca = services.calcular_cobranca(
            momento(2026, 3, 13, 14), momento(2026, 3, 16, 12)
        )
        self.assertEqual(len(cobranca['diarias']), 3)
        self.assertEqual(cobranca['diarias'][1]['valor_diaria'], Decimal('180.00'))
        self.assertTrue(cobranca['diarias'][1]['fim_de_semana'])


class HorariosTests(TestCase):

    def test_check_in_antes_das_14h_e_antecipado(self):
        self.assertTrue(services.check_in_antecipado(momento(2026, 3, 9, 13, 59)))
        self.assertFalse(services.check_in_antecipado(momento(2026, 3, 9, 14, 0)))

    def test_check_out_depois_das_12h_e_atrasado(self):
        self.assertFalse(services.check_out_atrasado(momento(2026, 3, 9, 12, 0)))
        self.assertTrue(services.check_out_atrasado(momento(2026, 3, 9, 12, 1)))


class ReservaModelTests(TestCase):

    def setUp(self):
        self.hospede = Hospede.objects.create(
            nome='Maria Souza', telefone='47999998888', documento='52998224725'
        )
        self.reserva = Reserva.objects.create(
            hospede=self.hospede,
            data_entrada=momento(2026, 3, 9, 14),
            data_saida=momento(2026, 3, 10, 12),
        )

    def test_reserva_nasce_pendente(self):
        self.assertEqual(self.reserva.status, Reserva.PENDENTE)
        self.assertFalse(self.reserva.esta_no_hotel)

    def test_check_in_coloca_o_hospede_no_hotel(self):
        self.reserva.realizar_check_in(momento(2026, 3, 9, 15))
        self.assertTrue(self.reserva.esta_no_hotel)
        self.assertIsNotNone(self.reserva.check_in_em)

    def test_check_out_grava_o_total_e_finaliza(self):
        self.reserva.realizar_check_in(momento(2026, 3, 9, 15))
        cobranca = self.reserva.realizar_check_out(momento(2026, 3, 10, 11))

        self.reserva.refresh_from_db()
        self.assertEqual(self.reserva.status, Reserva.FINALIZADA)
        self.assertEqual(self.reserva.valor_total, Decimal('120.00'))
        self.assertEqual(cobranca['total_geral'], Decimal('120.00'))

    def test_cobranca_usa_a_entrada_real_e_nao_a_prevista(self):
        self.reserva.data_saida = momento(2026, 3, 11, 12)
        self.reserva.realizar_check_in(momento(2026, 3, 10, 15))
        cobranca = self.reserva.calcular_cobranca(saida=momento(2026, 3, 11, 11))
        self.assertEqual(cobranca['noites'], 1)

    def test_querysets_de_localizacao(self):
        self.assertEqual(Reserva.objects.aguardando_check_in().count(), 1)
        self.assertEqual(Reserva.objects.no_hotel().count(), 0)

        self.reserva.realizar_check_in(momento(2026, 3, 9, 15))
        self.assertEqual(Reserva.objects.no_hotel().count(), 1)
        self.assertEqual(Reserva.objects.aguardando_check_in().count(), 0)


class ReservaApiTests(TestCase):
    """Fluxo completo pela API, do cadastro da reserva ao checkout."""

    def setUp(self):
        self.user = get_user_model().objects.create_user('atendente', password='senha-teste')
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.hospede = Hospede.objects.create(
            nome='Maria Souza', telefone='47999998888', documento='52998224725'
        )

    def _criar_reserva(self, **extra):
        payload = {
            'hospede': self.hospede.id,
            'data_entrada': '2026-03-13T14:00:00-03:00',
            'data_saida': '2026-03-16T12:00:00-03:00',
        }
        payload.update(extra)
        return self.client.post('/api/reservas/', payload, format='json')

    def test_exige_autenticacao(self):
        resposta = APIClient().get('/api/reservas/')
        self.assertEqual(resposta.status_code, 401)

    def test_saida_anterior_a_entrada_e_rejeitada(self):
        resposta = self._criar_reserva(
            data_entrada='2026-03-16T14:00:00-03:00',
            data_saida='2026-03-13T12:00:00-03:00',
        )
        self.assertEqual(resposta.status_code, 400)
        self.assertIn('data_saida', resposta.data)

    def test_resumo_antecipa_o_total_da_estadia(self):
        reserva = self._criar_reserva()
        self.assertEqual(reserva.status_code, 201)
        self.assertEqual(reserva.data['status'], 'PENDENTE')

        resposta = self.client.get(f'/api/reservas/{reserva.data["id"]}/resumo/')
        self.assertEqual(resposta.data['noites'], 3)
        self.assertEqual(resposta.data['total_geral'], '480.00')

    def test_check_in_antes_das_14h_alerta_e_so_prossegue_confirmado(self):
        reserva_id = self._criar_reserva().data['id']
        url = f'/api/reservas/{reserva_id}/check-in/'

        with mock.patch('django.utils.timezone.now', return_value=momento(2026, 3, 13, 10)):
            alerta = self.client.post(url, {}, format='json')
            self.assertEqual(alerta.status_code, 409)
            self.assertEqual(alerta.data['codigo'], 'check_in_antecipado')

            confirmado = self.client.post(url, {'confirmar': True}, format='json')
            self.assertEqual(confirmado.status_code, 200)
            self.assertEqual(confirmado.data['status'], 'HOSPEDADO')

    def test_check_out_atrasado_detalha_o_total_com_multa(self):
        reserva_id = self._criar_reserva().data['id']
        with mock.patch('django.utils.timezone.now', return_value=momento(2026, 3, 13, 15)):
            self.client.post(f'/api/reservas/{reserva_id}/check-in/', {}, format='json')

        # Segunda-feira, 15h: passou das 12h, multa de 50% sobre a diária de 120.
        with mock.patch('django.utils.timezone.now', return_value=momento(2026, 3, 16, 15)):
            resposta = self.client.post(
                f'/api/reservas/{reserva_id}/check-out/', {}, format='json'
            )

        self.assertEqual(resposta.status_code, 200)
        cobranca = resposta.data['cobranca']
        self.assertEqual(len(cobranca['diarias']), 3)
        self.assertEqual(cobranca['multa_check_out'], '60.00')
        self.assertEqual(cobranca['total_geral'], '540.00')
        self.assertEqual(resposta.data['reserva']['status'], 'FINALIZADA')

    def test_check_out_de_reserva_ja_finalizada_e_recusado(self):
        reserva_id = self._criar_reserva().data['id']
        with mock.patch('django.utils.timezone.now', return_value=momento(2026, 3, 13, 15)):
            self.client.post(f'/api/reservas/{reserva_id}/check-in/', {}, format='json')
        with mock.patch('django.utils.timezone.now', return_value=momento(2026, 3, 16, 11)):
            self.client.post(f'/api/reservas/{reserva_id}/check-out/', {}, format='json')

        repetido = self.client.post(
            f'/api/reservas/{reserva_id}/check-out/', {}, format='json'
        )
        self.assertEqual(repetido.status_code, 409)

    def test_localizar_hospedes_pela_situacao_e_pela_busca(self):
        reserva_id = self._criar_reserva().data['id']

        aguardando = self.client.get('/api/hospedes/?situacao=aguardando_check_in')
        self.assertEqual(len(aguardando.data), 1)
        self.assertEqual(len(self.client.get('/api/hospedes/?situacao=no_hotel').data), 0)

        with mock.patch('django.utils.timezone.now', return_value=momento(2026, 3, 13, 15)):
            self.client.post(f'/api/reservas/{reserva_id}/check-in/', {}, format='json')

        self.assertEqual(len(self.client.get('/api/hospedes/?situacao=no_hotel').data), 1)
        self.assertEqual(
            len(self.client.get('/api/hospedes/?situacao=aguardando_check_in').data), 0
        )

    def test_estimativa_calcula_sem_criar_reserva(self):
        resposta = self.client.post(
            '/api/reservas/estimativa/',
            {
                'data_entrada': '2026-08-25T14:00:00-03:00',
                'data_saida': '2026-08-27T12:00:00-03:00',
            },
            format='json',
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.data['noites'], 2)
        self.assertEqual(resposta.data['total_geral'], '240.00')
        self.assertEqual(Reserva.objects.count(), 0)

    def test_estimativa_rejeita_datas_invertidas(self):
        resposta = self.client.post(
            '/api/reservas/estimativa/',
            {
                'data_entrada': '2026-08-27T14:00:00-03:00',
                'data_saida': '2026-08-25T12:00:00-03:00',
            },
            format='json',
        )
        self.assertEqual(resposta.status_code, 400)
