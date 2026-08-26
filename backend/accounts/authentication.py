"""Autenticação JWT lendo o token do cookie em vez do header Authorization.

O SimpleJWT só sabe ler `Authorization: Bearer <token>`. Como o token aqui mora
num cookie HttpOnly, a leitura precisa ser trocada — e, junto com ela, vem a
obrigação de checar CSRF: um token enviado por header é imune a CSRF porque o
navegador não o anexa sozinho; um token em cookie, não.
"""

from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication

from .cookies import ACCESS_COOKIE


class _CSRFCheck(CsrfViewMiddleware):
    """Expõe o veredito do middleware de CSRF em vez de devolver um 403 pronto.

    `_reject` normalmente devolve um HttpResponseForbidden. Retornando o motivo
    como string, `process_view` vira um "None = passou / str = falhou" que dá
    para transformar numa exceção do DRF.
    """

    def _reject(self, request, reason):
        return reason


def enforce_csrf(request):
    """Roda a verificação de CSRF do Django manualmente.

    É preciso ser manual porque `APIView.as_view()` do DRF aplica `csrf_exempt`
    em toda view — o `CsrfViewMiddleware` global nunca chega a validar nada numa
    view de API. Métodos seguros (GET/HEAD/OPTIONS) passam direto.
    """
    check = _CSRFCheck(lambda req: None)
    check.process_request(request)
    reason = check.process_view(request, None, (), {})
    if reason:
        raise exceptions.PermissionDenied(f'Falha na verificação CSRF: {reason}')


class CookieJWTAuthentication(JWTAuthentication):
    """Autentica pelo cookie de access e exige CSRF em métodos de escrita."""

    def authenticate(self, request):
        raw_token = request.COOKIES.get(ACCESS_COOKIE)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        enforce_csrf(request)
        return self.get_user(validated_token), validated_token
