from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from .authentication import enforce_csrf
from .cookies import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    set_access_cookie,
    set_refresh_cookie,
)
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


def _issue_session(user, response):
    """Emite um par de tokens para `user` e grava os dois cookies."""
    refresh = RefreshToken.for_user(user)
    set_access_cookie(response, refresh.access_token)
    set_refresh_cookie(response, refresh)
    return response


class CSRFTokenView(APIView):
    """Entrega o cookie `csrftoken` (legível por JS) para o frontend.

    O par login/refresh/logout exige o header X-CSRFToken, e o frontend só
    consegue montá-lo depois de ter este cookie. Como é um GET, não há
    verificação de CSRF aqui — só emissão.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        # get_token() força a criação do segredo caso ainda não exista.
        get_token(request)
        return Response({'detail': 'Cookie CSRF emitido.'})


class RegisterView(APIView):
    """Cadastro público, já deixando o usuário logado.

    Ele acabou de provar que conhece a senha; mandá-lo para a tela de login em
    seguida seria atrito sem ganho de segurança.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'register'

    def post(self, request):
        enforce_csrf(request)

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        response = Response(
            UserSerializer(user).data, status=status.HTTP_201_CREATED
        )
        return _issue_session(user, response)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request):
        enforce_csrf(request)

        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        response = Response(UserSerializer(user).data)
        return _issue_session(user, response)


class RefreshView(APIView):
    """Troca o refresh do cookie por um novo par de tokens.

    Com ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION, o refresh usado é
    invalidado na hora: se um token vazar e for usado, o uso legítimo seguinte
    falha e o vazamento fica detectável.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        enforce_csrf(request)

        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if not raw_refresh:
            return Response(
                {'detail': 'Refresh token ausente.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={'refresh': raw_refresh})
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError:
            response = Response(
                {'detail': 'Refresh token inválido ou expirado.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
            clear_auth_cookies(response)
            return response

        data = serializer.validated_data
        response = Response(status=status.HTTP_204_NO_CONTENT)
        set_access_cookie(response, data['access'])
        if 'refresh' in data:
            set_refresh_cookie(response, data['refresh'])
        return response


class LogoutView(APIView):
    """Invalida o refresh e apaga os cookies.

    Aceita access expirado de propósito: quem quer sair deve conseguir sair.
    Por isso a permission é AllowAny e a proteção fica por conta do CSRF.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        enforce_csrf(request)

        raw_refresh = request.COOKIES.get(REFRESH_COOKIE)
        if raw_refresh:
            try:
                RefreshToken(raw_refresh).blacklist()
            except TokenError:
                # Token já expirado ou já na blacklist: não há o que invalidar,
                # mas os cookies do navegador continuam precisando ir embora.
                pass

        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_auth_cookies(response)
        return response


class MeView(APIView):
    """Quem está logado.

    Como o cookie é HttpOnly, o frontend não consegue inspecionar o token para
    descobrir a sessão. Esta rota é a fonte da verdade.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)
