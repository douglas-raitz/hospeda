from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Representação pública do usuário — é o que /me e /login devolvem.

    Como o token nunca aparece no corpo da resposta, este payload é a única
    forma de o frontend descobrir quem está logado.
    """

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'is_staff')
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    """Cadastro público.

    A unicidade do username e o formato aceito de caracteres vêm de graça do
    ModelSerializer, que reaproveita as constraints e validators do próprio
    modelo User.
    """

    password = serializers.CharField(
        write_only=True, style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, style={'input_type': 'password'}
    )

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'password_confirm')
        extra_kwargs = {'email': {'required': False, 'allow_blank': True}}

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': 'As senhas não coincidem.'}
            )

        candidate = User(
            username=attrs.get('username'), email=attrs.get('email', '')
        )
        try:
            validate_password(attrs['password'], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({'password': list(exc.messages)})

        attrs.pop('password_confirm')
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})

    def validate(self, attrs):
        user = authenticate(
            request=self.context.get('request'),
            username=attrs['username'],
            password=attrs['password'],
        )

        if user is None:
            raise serializers.ValidationError('Usuário ou senha inválidos.')
        if not user.is_active:
            raise serializers.ValidationError('Esta conta está desativada.')

        attrs['user'] = user
        return attrs
