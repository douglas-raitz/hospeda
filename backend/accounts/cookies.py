"""Leitura e escrita dos cookies que carregam os tokens JWT.

Os dois tokens vão para cookies HttpOnly: o JavaScript nunca os enxerga, o que
elimina o roubo de token via XSS. Em troca, o navegador passa a enviá-los
sozinho em toda requisição — daí a proteção CSRF em `authentication.py`.
"""

from django.conf import settings

ACCESS_COOKIE = settings.SIMPLE_JWT['AUTH_COOKIE']
REFRESH_COOKIE = settings.SIMPLE_JWT['REFRESH_COOKIE']

_ACCESS_PATH = '/api/'
_REFRESH_PATH = '/api/auth/'


def _common_kwargs():
    return {
        'httponly': True,
        'secure': settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        'samesite': settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
    }


def set_access_cookie(response, token):
    response.set_cookie(
        ACCESS_COOKIE,
        str(token),
        max_age=int(settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'].total_seconds()),
        path=_ACCESS_PATH,
        **_common_kwargs(),
    )


def set_refresh_cookie(response, token):
    response.set_cookie(
        REFRESH_COOKIE,
        str(token),
        max_age=int(settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'].total_seconds()),
        path=_REFRESH_PATH,
        **_common_kwargs(),
    )


def clear_auth_cookies(response):
    """Apaga os dois cookies.

    O path precisa ser idêntico ao usado na escrita, senão o navegador entende
    que é outro cookie e o original sobrevive.
    """
    response.delete_cookie(
        ACCESS_COOKIE,
        path=_ACCESS_PATH,
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
    )
    response.delete_cookie(
        REFRESH_COOKIE,
        path=_REFRESH_PATH,
        samesite=settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE'],
    )
