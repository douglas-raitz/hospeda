from rest_framework import serializers

from .models import Hospede


class HospedeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Hospede
        fields = ('id', 'nome', 'telefone', 'documento', 'criado_em', 'atualizado_em')
        read_only_fields = ('id', 'criado_em', 'atualizado_em')

    def to_internal_value(self, data):
        return super().to_internal_value(data)

    def validate_nome(self, value):
        if len(value) < 3:
            raise serializers.ValidationError(
                'O nome deve ter ao menos 3 caracteres.'
            )
        return value

    def validate_telefone(self, value):
        if len(value) not in (10, 11):
            raise serializers.ValidationError(
                'Informe o telefone com DDD (10 ou 11 dígitos).'
            )
        return value

    def validate_documento(self, value):
        if len(value) != 11:
            raise serializers.ValidationError(
                'O documento deve ter 11 dígitos.'
            )
        return value
