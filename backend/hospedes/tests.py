from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from reservas.models import Reserva

from .models import Hospede
from .serializers import HospedeSerializer
from .services import validar_cpf

DADOS_VALIDOS = {
    'nome': 'Maria Souza',
    'telefone': '47999998888',
    'documento': '52998224725',
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
        self.assertEqual(dados['documento'], '52998224725')

    def test_nome_curto_e_rejeitado(self):
        serializer = HospedeSerializer(data={**DADOS_VALIDOS, 'nome': 'Jo'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('nome', serializer.errors)

    def test_telefone_precisa_de_ddd(self):
        for telefone, valido in [('999998888', False), ('4799999888', True), ('47999998888', True)]:
            serializer = HospedeSerializer(
                data={**DADOS_VALIDOS, 'telefone': telefone}
            )
            self.assertEqual(serializer.is_valid(), valido, telefone)

    def test_documento_precisa_de_11_digitos(self):
        serializer = HospedeSerializer(data={**DADOS_VALIDOS, 'documento': '123'})
        self.assertFalse(serializer.is_valid())
        self.assertIn('documento', serializer.errors)

    def test_documento_com_digitos_verificadores_invalidos_e_rejeitado(self):
        for documento in ('12345678901', '9' * 11, '52998224724'):
            serializer = HospedeSerializer(
                data={**DADOS_VALIDOS, 'documento': documento}
            )

            self.assertFalse(serializer.is_valid(), documento)
            self.assertIn('documento', serializer.errors)

    def test_documento_formatado_e_aceito_e_normalizado(self):
        serializer = HospedeSerializer(
            data={**DADOS_VALIDOS, 'documento': '529.982.247-25'}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['documento'], '52998224725')


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
        self.assertTrue(Hospede.objects.filter(documento='52998224725').exists())

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
            nome='João Lima', telefone='4788887777', documento='11144477735'
        )

        resposta = self.client.get('/api/hospedes/')

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data), 2)

    def test_filtra_pela_situacao_da_reserva(self):
        hospede = Hospede.objects.create(**DADOS_VALIDOS)
        Hospede.objects.create(
            nome='João Lima', telefone='4788887777', documento='11144477735'
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


class ValidarCpfTests(TestCase):
    """Regras dos dígitos verificadores, sem passar pelo serializer."""

    def test_aceita_cpf_valido_com_e_sem_formatacao(self):
        for cpf in ('52998224725', '529.982.247-25', '111.444.777-35'):
            self.assertTrue(validar_cpf(cpf), cpf)

    def test_rejeita_digitos_verificadores_errados(self):
        self.assertFalse(validar_cpf('52998224724'))
        self.assertFalse(validar_cpf('12345678901'))

    def test_rejeita_sequencias_repetidas(self):
        for digito in '0123456789':
            self.assertFalse(validar_cpf(digito * 11), digito)

    def test_rejeita_quantidade_de_digitos_diferente_de_onze(self):
        for cpf in ('', '123', '5299822472', '529982247251'):
            self.assertFalse(validar_cpf(cpf), cpf)
