# hospeda

Projeto com backend em Django (DRF) + PostgreSQL e frontend em React (Vite),
rodando inteiramente em Docker.

## Pré-requisitos

- Docker e Docker Compose
- Uma entrada no `/etc/hosts` para o domínio local:

  ```bash
  echo "127.0.0.1 admin.hospeda" | sudo tee -a /etc/hosts
  ```

## Como rodar

```bash
docker compose up --build
```

O `--build` só é necessário na primeira vez ou quando mudarem as dependências
(`requirements.txt` ou `package.json`). Nas demais vezes basta `docker compose up`.

Isso sobe quatro serviços: `db`, `backend`, `frontend` e `pgadmin`.

## URLs

| Serviço | URL | Observação |
|---|---|---|
| Aplicação (React) | http://admin.hospeda | porta 80, sem `:porta` na URL |
| Django admin | http://admin.hospeda/admin/ | via proxy do Vite |
| API | http://admin.hospeda/api/ | proxy já configurado, mas ainda **sem rotas** no Django (404) |
| pgAdmin | http://localhost:5050 | |
| Backend direto | http://localhost:8000 | útil para depurar sem o proxy |
| PostgreSQL | `localhost:5432` | para DBeaver, psql, etc. |

O frontend faz proxy de `/api` e `/admin` para o Django, então **a aplicação
inteira é acessada por uma única origem** (`admin.hospeda`) e não há CORS para
configurar.

O prefixo `/api` já está encaminhado no Vite, mas ainda não existe nenhuma rota
correspondente em `backend/hospeda/urls.py` — ao criar a primeira, basta
registrá-la sob `path('api/', ...)` que o proxy já funciona.

## Credenciais (somente desenvolvimento local)

Definidas em `.env`, que não é versionado. Se estiver clonando o projeto do
zero, crie-o com:

```env
UID=1000
GID=1000

POSTGRES_DB=hospeda
POSTGRES_USER=hospeda
POSTGRES_PASSWORD=hospeda

PGADMIN_EMAIL=admin@hospeda.dev
PGADMIN_PASSWORD=admin
```

Ajuste `UID`/`GID` para os do seu usuário (`id -u` e `id -g`) — é o que faz os
arquivos criados pelo container do backend não ficarem com dono `root`.

### pgAdmin

Acesse http://localhost:5050 e entre com `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`.

O servidor **"hospeda (docker)"** já aparece cadastrado (via
`docker/pgadmin-servers.json`). Ao expandi-lo pela primeira vez ele pede a senha
do banco — use `POSTGRES_PASSWORD` e marque *Save password*.

> Dentro do pgAdmin o host do banco é **`db`**, não `localhost`. `localhost` ali
> se refere ao próprio container do pgAdmin. De fora do Docker (DBeaver, psql),
> use `localhost:5432`.

### Django admin

Precisa de um superusuário, criado uma única vez:

```bash
docker compose exec backend python manage.py createsuperuser
```

Depois acesse http://admin.hospeda/admin/.

## Comandos úteis

```bash
docker compose up              # sobe o ambiente
docker compose down               # derruba (os dados do Postgres continuam)
docker compose down -v            # derruba e APAGA os dados do Postgres

docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py makemigrations
docker compose exec db psql -U hospeda -d hospeda
```

As migrations rodam automaticamente a cada subida do backend.

## Desenvolvimento

Ambos os serviços tem hot reload — o código é montado por volume, então
alterações em `backend/` e `frontend/src/` são refletidas sem rebuild.

Como o frontend é publicado na porta 80 do host mas o Vite escuta na 5173 dentro
do container, o websocket do HMR usa `VITE_HMR_CLIENT_PORT=80`. Se você mudar a
porta publicada, mude essa variável junto, senão o hot reload para de funcionar.

## Estrutura

```
backend/     Django + DRF
frontend/    React + Vite
docker/      configs auxiliares de containers (servers.json do pgAdmin)
docker-compose.yml
.env         credenciais locais (não versionado)
```
