from django.utils import timezone
from rest_framework import status as http
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from . import services
from .models import Reserva
from .serializers import (
    CobrancaSerializer,
    ConfirmacaoSerializer,
    EstimativaSerializer,
    ReservaSerializer,
)


class ReservaViewSet(viewsets.ModelViewSet):

    queryset = Reserva.objects.select_related('hospede')
    serializer_class = ReservaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        return queryset

    @action(detail=False, methods=['post'], url_path='estimativa')
    def estimativa(self, request):
        """Total previsto para datas que ainda não viraram reserva."""
        entrada = EstimativaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data

        cobranca = services.calcular_cobranca(
            dados['data_entrada'], dados['data_saida']
        )
        return Response(CobrancaSerializer(cobranca).data)

    @action(detail=True, methods=['get'], url_path='resumo')
    def resumo(self, request, pk=None):
        reserva = self.get_object()
        cobranca = reserva.calcular_cobranca()
        return Response(CobrancaSerializer(cobranca).data)

    @action(detail=True, methods=['post'], url_path='check-in')
    def check_in(self, request, pk=None):
        reserva = self.get_object()

        if reserva.status != Reserva.PENDENTE:
            return Response(
                {'detail': f'Reserva {reserva.get_status_display()}: check-in indisponível.'},
                status=http.HTTP_409_CONFLICT,
            )

        entrada = ConfirmacaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        agora = timezone.now()
        if services.check_in_antecipado(agora) and not entrada.validated_data['confirmar']:
            return Response(
                {
                    'codigo': 'check_in_antecipado',
                    'alerta': (
                        'O check-in está previsto para as '
                        f'{services.HORARIO_CHECK_IN:%H:%M}. '
                        'Confirme para realizar mesmo assim.'
                    ),
                },
                status=http.HTTP_409_CONFLICT,
            )

        reserva.realizar_check_in(agora)
        return Response(self.get_serializer(reserva).data)

    @action(detail=True, methods=['post'], url_path='check-out')
    def check_out(self, request, pk=None):
        reserva = self.get_object()

        if reserva.status != Reserva.HOSPEDADO:
            return Response(
                {'detail': 'Só é possível realizar o checkout de um hóspede no hotel.'},
                status=http.HTTP_409_CONFLICT,
            )

        cobranca = reserva.realizar_check_out()
        return Response(
            {
                'reserva': self.get_serializer(reserva).data,
                'cobranca': CobrancaSerializer(cobranca).data,
            }
        )
