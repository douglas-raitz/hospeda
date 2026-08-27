from re import sub


def validar_cpf(cpf: str) -> bool:
    """
    Valida um número de CPF e retorna um boolean informando se é válido ou não.

    Args:
        cpf (str): O CPF a ser validado, com ou sem formatação.

    Returns:
        bool: Boolean indicando se o CPF é válido ou inválido.
    """
    cpf = sub(r"\D", "", cpf)

    if len(cpf) != 11 or cpf in (c * 11 for c in "0123456789"):
        return False

    def calcular_digito(cpf_parcial, peso_inicial):
        soma = sum(
            int(digito) * peso
            for digito, peso in zip(cpf_parcial, range(peso_inicial, 1, -1))
        )
        resto = (soma * 10) % 11
        return "0" if resto == 10 else str(resto)

    digito1 = calcular_digito(cpf[:9], 10)
    digito2 = calcular_digito(cpf[:10], 11)

    return cpf[-2:] == digito1 + digito2


def apenas_digitos(valor: str) -> str:
    return sub(r"\D", "", valor)
