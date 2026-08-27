from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from reservas.models import Reserva

from .models import Hospede
from .serializers import HospedeSerializer


class HospedeViewSet(viewsets.ModelViewSet):

    queryset = Hospede.objects.all()
    serializer_class = HospedeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        situacao = params.get('situacao')
        if situacao == 'no_hotel':
            queryset = queryset.filter(reservas__status=Reserva.HOSPEDADO)
        elif situacao == 'aguardando_check_in':
            queryset = queryset.filter(reservas__status=Reserva.PENDENTE)

        return queryset.distinct()

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)
