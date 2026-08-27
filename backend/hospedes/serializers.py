from rest_framework import serializers

from .models import Hospede
from .services import apenas_digitos, validar_cpf


class HospedeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Hospede
        fields = ('id', 'nome', 'telefone', 'documento', 'criado_em', 'atualizado_em')
        read_only_fields = ('id', 'criado_em', 'atualizado_em')

    def to_internal_value(self, data):
        documento = data.get('documento') if hasattr(data, 'get') else None
        if isinstance(documento, str):
            data = {**data, 'documento': apenas_digitos(documento)}
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
        documento = apenas_digitos(value)

        if len(documento) != 11:
            raise serializers.ValidationError(
                'O documento deve ter 11 dígitos.'
            )

        if not validar_cpf(documento):
            raise serializers.ValidationError(
                'Informe um CPF válido.'
            )

        return documento
