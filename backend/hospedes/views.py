from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Hospede
from .serializers import HospedeSerializer


class HospedeViewSet(viewsets.ModelViewSet):

    queryset = Hospede.objects.all()
    serializer_class = HospedeSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        return super().destroy(request, *args, **kwargs)