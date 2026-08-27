from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from reservas.models import Reserva

from .models import Hospede
from .serializers import HospedeSerializer

DADOS_VALIDOS = {
    'nome': 'Maria Souza',
    'telefone': '47999998888',
    'documento': '12345678901',
}


class HospedeSerializerTests(TestCase):
    """Validações do serializer, sem passar pela API."""

    def test_serializa_hospede_mockado_sem_tocar_no_banco(self):
        agora = timezone.now()
        hospede = mock.Mock(
            spec=Hospede, id=7, criado_em=agora, atualizado_em=agora, **DADOS_VALIDOS
        )

        dados = HospedeSerializer(hospede).data

        self.assertEqual(dados['id'], 7)
        self.assertEqual(dados['nome'], 'Maria Souza')
        self.assertEqual(dados['documento'], '12345678901')

    def test_nome_curto_e_rejeitado(self):
        serializer = HospedeSerializer(data={**DADOS_VALIDOS, 'nome': 'Jo'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('nome', serializer.errors)

    def test_telefone_precisa_de_ddd(self):
        for telefone, valido in [('999998888', False), ('4799999888', True), ('47999998888', True)]:
            serializer = HospedeSerializer(
                data={**DADOS_VALIDOS, 'telefone': telefone, 'documento': '9' * 11}
            )
            self.assertEqual(serializer.is_valid(), valido, telefone)

    def test_documento_precisa_de_11_digitos(self):
        serializer = HospedeSerializer(data={**DADOS_VALIDOS, 'documento': '123'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('documento', serializer.errors)


class HospedeApiTests(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            'atendente', password='senha-teste'
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_exige_autenticacao(self):
        resposta = APIClient().get('/api/hospedes/')
        self.assertEqual(resposta.status_code, 401)

    def test_cadastra_hospede(self):
        resposta = self.client.post('/api/hospedes/', DADOS_VALIDOS, format='json')

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data['nome'], 'Maria Souza')
        self.assertTrue(Hospede.objects.filter(documento='12345678901').exists())

    def test_documento_duplicado_e_rejeitado(self):
        Hospede.objects.create(**DADOS_VALIDOS)

        resposta = self.client.post(
            '/api/hospedes/', {**DADOS_VALIDOS, 'nome': 'Outro Nome'}, format='json'
        )

        self.assertEqual(resposta.status_code, 400)
        self.assertIn('documento', resposta.data)

    def test_lista_hospedes_cadastrados(self):
        Hospede.objects.create(**DADOS_VALIDOS)
        Hospede.objects.create(
            nome='João Lima', telefone='4788887777', documento='98765432100'
        )

        resposta = self.client.get('/api/hospedes/')

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data), 2)

    def test_filtra_pela_situacao_da_reserva(self):
        hospede = Hospede.objects.create(**DADOS_VALIDOS)
        Hospede.objects.create(
            nome='João Lima', telefone='4788887777', documento='98765432100'
        )
        Reserva.objects.create(
            hospede=hospede,
            data_entrada=timezone.now(),
            data_saida=timezone.now() + timezone.timedelta(days=1),
        )

        aguardando = self.client.get('/api/hospedes/?situacao=aguardando_check_in')
        no_hotel = self.client.get('/api/hospedes/?situacao=no_hotel')

        self.assertEqual([h['nome'] for h in aguardando.data], ['Maria Souza'])
        self.assertEqual(no_hotel.data, [])
