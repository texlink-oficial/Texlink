# Texlink - Checklist de Deploy para Produção

## Pré-requisitos

Antes de fazer o deploy, certifique-se de ter:

- [ ] PostgreSQL 16+ configurado
- [ ] Redis configurado (opcional, mas recomendado)
- [ ] Conta SendGrid para emails
- [ ] Conta Twilio para WhatsApp (opcional)
- [ ] Domínio configurado com SSL

## 1. Configuração do Backend

### 1.1 Gerar JWT Secret seguro

```bash
# Gere um secret forte (64+ caracteres)
openssl rand -base64 64
```

### 1.2 Configurar variáveis de ambiente

Copie e configure o arquivo de ambiente:

```bash
cd backend
cp .env.production .env
```

**Variáveis obrigatórias:**

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_URL` | URL do PostgreSQL | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret JWT (64+ chars) | Use `openssl rand -base64 64` |
| `CORS_ORIGINS` | Domínios permitidos | `https://app.texlink.com.br` |

**Variáveis opcionais (mas recomendadas):**

| Variável | Descrição |
|----------|-----------|
| `REDIS_URL` | URL do Redis para cache e rate limiting |
| `SENDGRID_API_KEY` | API key do SendGrid para emails |
| `TWILIO_ACCOUNT_SID` | SID da conta Twilio |
| `TWILIO_AUTH_TOKEN` | Token de autenticação Twilio |

### 1.3 Executar migrations

```bash
cd backend
npx prisma migrate deploy
```

### 1.4 Build e iniciar

```bash
npm run build
npm run start:prod
```

## 2. Configuração do Frontend

### 2.1 Configurar variáveis de ambiente

```bash
# Criar arquivo .env.production.local
VITE_API_URL=https://app.texlink.com.br
VITE_MOCK_MODE=false
```

### 2.2 Build

```bash
npm run build
```

### 2.3 Deploy dos arquivos estáticos

O build gera arquivos em `dist/`. Deploy para:
- Vercel
- Netlify
- AWS S3 + CloudFront
- Nginx como static server

## 3. Configurações de Segurança

### 3.1 Webhooks

Configure os webhooks nos painéis:

**SendGrid:**
1. Acesse: https://app.sendgrid.com/settings/mail_settings/event_webhooks
2. URL: `https://app.texlink.com.br/api/webhooks/sendgrid`
3. Selecione eventos: Delivered, Opened, Clicked, Bounce, Dropped
4. Habilite assinatura e copie a public key para `SENDGRID_WEBHOOK_PUBLIC_KEY`

**Twilio:**
1. Acesse: https://console.twilio.com/
2. Configure Status Callback URL: `https://app.texlink.com.br/api/webhooks/twilio`
3. Habilite validação de assinatura

### 3.2 SSL/TLS

- Certifique-se de que todos os endpoints usam HTTPS
- Configure HSTS headers

### 3.3 Rate Limiting

O sistema já possui rate limiting:
- API: 60 req/min por IP
- WebSocket: 10 mensagens/min por usuário
- Conexões: 5/min por IP

## 4. Deploy com Docker

### 4.1 Build das imagens

```bash
# Backend
cd backend
docker build -t texlink-backend .

# Frontend
docker build -t texlink-frontend \
  --build-arg VITE_API_URL=https://app.texlink.com.br \
  --build-arg VITE_MOCK_MODE=false \
  .
```

### 4.2 Docker Compose (Produção)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 5. Deploy no Railway

### 5.1 Backend

1. Crie um novo projeto no Railway
2. Adicione um PostgreSQL
3. Adicione um Redis
4. Configure as variáveis:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `REDIS_URL`: `${{Redis.REDIS_URL}}`
   - `JWT_SECRET`: Gere com openssl
   - Demais variáveis conforme `.env.production`

### 5.2 Frontend

1. Deploy como Static Site ou use Vercel/Netlify
2. Configure `VITE_API_URL` para o URL do Railway

## 6. Monitoramento

### 6.1 Health Check

```bash
curl https://app.texlink.com.br/api/health
curl https://app.texlink.com.br/api/health/db
```

### 6.2 Sentry (Opcional)

Configure `SENTRY_DSN` para tracking de erros.

## 7. Troubleshooting

### Erro: "Invalid token"
- Verifique se `JWT_SECRET` está configurado corretamente
- Certifique-se de que o secret é o mesmo em todas as instâncias

### Erro: "CORS blocked"
- Verifique `CORS_ORIGINS` inclui o domínio do frontend

### Emails não chegam
- Verifique `SENDGRID_API_KEY` está correto
- Verifique domínio está verificado no SendGrid

### WebSocket não conecta
- Verifique se proxy/load balancer suporta WebSocket
- Certifique-se de que o frontend está usando o URL correto

## Contato

Para suporte: support@texlink.com.br
