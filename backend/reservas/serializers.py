from rest_framework import serializers

from hospedes.models import Hospede
from hospedes.serializers import HospedeSerializer

from .models import Reserva


class DiariaSerializer(serializers.Serializer):
    data = serializers.DateField()
    fim_de_semana = serializers.BooleanField()
    valor_diaria = serializers.DecimalField(max_digits=10, decimal_places=2)


class CobrancaSerializer(serializers.Serializer):
    diarias = DiariaSerializer(many=True)
    noites = serializers.IntegerField()
    total_diarias = serializers.DecimalField(max_digits=10, decimal_places=2)
    check_out_atrasado = serializers.BooleanField()
    multa_check_out = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_geral = serializers.DecimalField(max_digits=10, decimal_places=2)


class ReservaSerializer(serializers.ModelSerializer):

    hospede = serializers.PrimaryKeyRelatedField(queryset=Hospede.objects.all())
    hospede_detalhe = HospedeSerializer(source='hospede', read_only=True)

    class Meta:
        model = Reserva
        fields = (
            'id',
            'hospede',
            'hospede_detalhe',
            'data_entrada',
            'data_saida',
            'status',
            'check_in_em',
            'check_out_em',
            'valor_total',
            'criado_em',
            'atualizado_em',
        )
        read_only_fields = (
            'id',
            'status',
            'check_in_em',
            'check_out_em',
            'valor_total',
            'criado_em',
            'atualizado_em',
        )

    def validate(self, attrs):
        entrada = attrs.get('data_entrada', getattr(self.instance, 'data_entrada', None))
        saida = attrs.get('data_saida', getattr(self.instance, 'data_saida', None))

        if entrada and saida and saida <= entrada:
            raise serializers.ValidationError(
                {'data_saida': 'A saída deve ser posterior à entrada.'}
            )
        return attrs


class ConfirmacaoSerializer(serializers.Serializer):
    confirmar = serializers.BooleanField(default=False)


class EstimativaSerializer(serializers.Serializer):

    data_entrada = serializers.DateTimeField()
    data_saida = serializers.DateTimeField()

    def validate(self, attrs):
        if attrs['data_saida'] <= attrs['data_entrada']:
            raise serializers.ValidationError(
                {'data_saida': 'A saída deve ser posterior à entrada.'}
            )
        return attrs
