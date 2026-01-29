# Deploy no Railway - Texlink

Este guia explica como fazer deploy do Texlink no Railway.

## Arquitetura

O projeto consiste em:
- **Frontend**: React + Vite (servido via nginx)
- **Backend**: NestJS + Prisma
- **Database**: PostgreSQL
- **Cache**: Redis (opcional)

## Passo a Passo

### 1. Criar Projeto no Railway

1. Acesse [railway.app](https://railway.app)
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte seu repositorio GitHub

### 2. Adicionar PostgreSQL

1. No projeto, clique em "New"
2. Selecione "Database" > "PostgreSQL"
3. O Railway criara automaticamente a variavel `DATABASE_URL`

### 3. Adicionar Redis (Opcional)

1. Clique em "New" > "Database" > "Redis"
2. O Railway criara automaticamente a variavel `REDIS_URL`

### 4. Criar Servico Backend

1. Clique em "New" > "GitHub Repo"
2. Selecione o mesmo repositorio
3. Configure:
   - **Root Directory**: `backend`
   - **Branch**: `main`

#### Variaveis de Ambiente (Backend)

```env
# Obrigatorias
NODE_ENV=production
JWT_SECRET=<gerar-secret-forte-min-32-chars>
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Opcionais
REDIS_URL=${{Redis.REDIS_URL}}
JWT_EXPIRATION=7d
JWT_REFRESH_EXPIRATION=30d
CORS_ORIGINS=https://seu-frontend.up.railway.app
```

Para gerar um JWT_SECRET forte:
```bash
openssl rand -base64 32
```

### 5. Criar Servico Frontend

1. Clique em "New" > "GitHub Repo"
2. Selecione o mesmo repositorio
3. Configure:
   - **Root Directory**: `/` (raiz)
   - **Branch**: `main`

#### Variaveis de Ambiente (Frontend)

```env
# Build args (usados durante o build)
VITE_API_URL=https://seu-backend.up.railway.app
VITE_MOCK_MODE=false
VITE_APP_NAME=Texlink
```

### 6. Configurar Dominios (Opcional)

1. Em cada servico, va em "Settings" > "Domains"
2. Adicione um dominio customizado ou use o dominio `.up.railway.app`

### 7. Configurar CORS

Apos obter a URL do frontend, atualize a variavel `CORS_ORIGINS` no backend:

```env
CORS_ORIGINS=https://texlink-frontend.up.railway.app,https://app.texlink.com.br
```

## Estrutura de Servicos no Railway

```
Projeto Railway
├── PostgreSQL (Database)
│   └── DATABASE_URL (auto-gerada)
├── Redis (Database) [opcional]
│   └── REDIS_URL (auto-gerada)
├── Backend (GitHub)
│   ├── Root: /backend
│   └── Dockerfile: backend/Dockerfile
└── Frontend (GitHub)
    ├── Root: /
    └── Dockerfile: Dockerfile
```

## Variaveis de Ambiente Completas

### Backend

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `NODE_ENV` | Sim | `production` |
| `DATABASE_URL` | Sim | URL do PostgreSQL (referencia Railway) |
| `JWT_SECRET` | Sim | Secret para tokens JWT (min 32 chars) |
| `REDIS_URL` | Nao | URL do Redis (referencia Railway) |
| `CORS_ORIGINS` | Sim | URLs permitidas, separadas por virgula |
| `JWT_EXPIRATION` | Nao | Expiracao do token (default: 7d) |
| `JWT_REFRESH_EXPIRATION` | Nao | Expiracao do refresh (default: 30d) |

### Frontend (Build Args)

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `VITE_API_URL` | Sim | URL do backend |
| `VITE_MOCK_MODE` | Nao | `false` para producao |
| `VITE_APP_NAME` | Nao | Nome da aplicacao |

## Health Checks

O Railway usa os health checks automaticamente:

- **Backend**: `GET /api/health`
- **Frontend**: `GET /health`

## Troubleshooting

### Backend nao conecta ao banco

1. Verifique se `DATABASE_URL` esta usando a referencia correta: `${{Postgres.DATABASE_URL}}`
2. Verifique os logs do build

### Migrations nao rodam

As migrations rodam automaticamente no start do container. Se falharem:

1. Verifique os logs do deploy
2. Acesse o terminal do Railway e rode manualmente:
   ```bash
   npx prisma migrate deploy
   ```

### CORS bloqueando requests

1. Verifique se `CORS_ORIGINS` inclui a URL exata do frontend
2. Inclua tanto URLs com www quanto sem www se aplicavel

### Frontend mostra pagina em branco

1. Verifique se `VITE_API_URL` aponta para o backend correto
2. Verifique o console do browser para erros
3. Confirme que o backend esta respondendo em `/api/health`

## Comandos Uteis

### Acessar Terminal do Container

No Railway, clique no servico > "Shell" para acessar o terminal.

### Verificar Logs

Railway mostra logs em tempo real na aba "Deployments" de cada servico.

### Rodar Migrations Manualmente

```bash
# No terminal do backend
npx prisma migrate deploy
```

### Verificar Status da API

```bash
curl https://seu-backend.up.railway.app/api/health
```

## Custos Estimados

O Railway cobra por uso (CPU, memoria, network). Estimativa para Texlink:

- **Hobby Plan** (~$5/mes): Suficiente para desenvolvimento/teste
- **Pro Plan** (~$20/mes): Recomendado para producao

O PostgreSQL e Redis sao cobrados separadamente pelo uso de storage.

## Deploy Automatico

Por padrao, o Railway faz deploy automatico a cada push na branch configurada.

Para desabilitar:
1. Va em "Settings" do servico
2. Desabilite "Auto Deploy"

## Rollback

Para voltar a uma versao anterior:
1. Va em "Deployments" do servico
2. Encontre o deploy anterior
3. Clique em "Redeploy"
