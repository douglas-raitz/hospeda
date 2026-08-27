# hospeda

Sistema de recepção de hotel: cadastro de hóspedes, reservas e o fluxo de
check-in / check-out com o cálculo automático da conta.

As regras de cobrança são:

- Diária de R$ 120,00 em dia útil e R$ 180,00 em sábado e domingo.
- Check-in a partir das 14h. Antes disso o sistema alerta, mas deixa seguir.
- Check-out até as 12h. Depois disso entra multa de 50% da diária do dia.

Backend em Django + DRF, frontend em React (Vite), banco PostgreSQL — tudo em
Docker.

## Rodar em outra máquina

Só é preciso ter **Docker e Docker Compose** instalados:

```bash
git clone https://github.com/douglas-raitz/hospeda.git
cd hospeda
```
o .env não é versionado (contém credenciais), então crie o seu a partir do modelo
Após clonar o repositório, é necessário fazer uma copia do arquivo .env.example para permitir adicionar a chave gerada, segue o comando:
➜ cp .env.example .env

Arquivo gerado, agora é necessário gerar uma nova chave assinada, segue o comando:
➜ python3 -c "import secrets; print(secrets.token_urlsafe(50))"
Após gerar a chave, você terá um retorno semelhante à ➜ pplqhU_xkpcyU1L_2tfudbZxXxKMrdL945YFKSbGxprbf7j7Ak_f9KJUASS0bgPPyrA

Próximo passo, procure pelo arquivo .env na raiz do projeto, e atribua essa chave no campo `DJANGO_SECRET_KEY`:
Resultado esperado ➜ DJANGO_SECRET_KEY=pplqhU_xkpcyU1L_2tfudbZxXxKMrdL945YFKSbGxprbf7j7Ak_f9KJUASS0bgPPyrA

```docker compose up --build```
O `DJANGO_SECRET_KEY` vem em branco no `.env.example` e **precisa ser
preenchido** — o compose se recusa a subir enquanto ele estiver vazio:

required variable DJANGO_SECRET_KEY is missing a value
Confira também o `UID`/`GID` no `.env`: eles fazem os arquivos gerados pelo
container (migrations, etc.) pertencerem ao seu usuário em vez de root. Os seus
saem com `id -u && id -g`.

Para usar o sistema em si, crie sua conta pela tela de cadastro do próprio site.

## URLs

| O quê | URL | Acesso |
|---|---|---|
| Site | http://localhost | crie sua conta na tela de cadastro |
| pgAdmin | http://localhost:5050 | `admin@hospeda.dev` / `admin` |
| Django admin | http://localhost/admin/ | `admin` / `admin` |

No pgAdmin o servidor **"hospeda (docker)"** já vem cadastrado; ao abri-lo pela
primeira vez ele pede a senha do banco, que é `hospeda`.

## Comandos do Docker

```bash
docker compose up            # sobe a aplicação
docker compose up --build    # sobe reconstruindo as imagens (após mudar dependências)
docker compose down          # derruba, preservando os dados do banco
docker compose down -v       # derruba e APAGA os dados do banco
```

## Testes

Com a aplicação no ar:

```bash
docker compose exec backend python manage.py test
```

São 23 testes, que rodam num banco separado — os dados de desenvolvimento não
são afetados.

## Estrutura

```
backend/     Django + DRF (accounts, hospedes, reservas)
frontend/    React + Vite
docker/      configs auxiliares dos containers
```
