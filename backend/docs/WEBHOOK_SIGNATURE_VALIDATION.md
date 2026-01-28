# Webhook Signature Validation

Este documento explica como configurar e usar a validação de assinatura para webhooks do SendGrid e Twilio.

---

## 🔐 Por que validar assinaturas?

A validação de assinatura garante que os webhooks recebidos são autênticos e vêm realmente do SendGrid/Twilio, prevenindo:

- **Webhooks maliciosos** - Alguém enviando dados falsos para seus endpoints
- **Replay attacks** - Reenvio de eventos antigos
- **Man-in-the-middle** - Interceptação e modificação de dados

**IMPORTANTE:** É altamente recomendado habilitar a validação em produção.

---

## 📧 SendGrid Webhook Signature

### 1. Obter a Public Key

1. Acesse [SendGrid Mail Settings](https://app.sendgrid.com/settings/mail_settings)
2. Navegue até **Event Webhook**
3. Clique em **Security Features**
4. Copie a **Verification Key** (chave pública em base64)

### 2. Configurar no .env

```env
# Habilitar validação
SENDGRID_WEBHOOK_SIGNATURE_VALIDATION=true

# Adicionar a public key (base64)
SENDGRID_WEBHOOK_PUBLIC_KEY=MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE...
```

### 3. Como funciona

O SendGrid envia os seguintes cabeçalhos:

```
X-Twilio-Email-Event-Webhook-Signature: t=1234567890,v1=base64signature
X-Twilio-Email-Event-Webhook-Timestamp: 1234567890
```

A validação:
1. Verifica se o timestamp está dentro de 10 minutos (previne replay)
2. Reconstrói o payload assinado: `timestamp + body`
3. Verifica a assinatura usando ECDSA SHA256 com a public key

### 4. Testar localmente

Para testar localmente sem configurar a validação:

```env
SENDGRID_WEBHOOK_SIGNATURE_VALIDATION=false
```

---

## 📱 Twilio Webhook Signature

### 1. Obter o Auth Token

O Auth Token já está disponível no seu painel do Twilio:

1. Acesse [Twilio Console](https://console.twilio.com/)
2. No dashboard, você verá **Account SID** e **Auth Token**
3. Copie o **Auth Token** (clique no ícone de olho para revelar)

### 2. Configurar no .env

```env
# O Auth Token já é usado para a API
TWILIO_AUTH_TOKEN=your_auth_token_here

# Habilitar validação
TWILIO_WEBHOOK_SIGNATURE_VALIDATION=true
```

### 3. Como funciona

O Twilio envia o cabeçalho:

```
X-Twilio-Signature: base64signature
```

A validação:
1. Reconstrói a URL completa do webhook
2. Ordena os parâmetros alfabeticamente
3. Concatena: `url + key1 + value1 + key2 + value2...`
4. Calcula HMAC SHA1 usando o Auth Token
5. Compara com a assinatura usando timing-safe comparison

### 4. Configurar webhook no Twilio

Ao configurar o webhook no Twilio:

```
Webhook URL: https://seu-dominio.com/api/webhooks/twilio
Method: POST
```

**Importante:** Use HTTPS em produção!

### 5. Testar localmente

Para desenvolvimento local:

```env
TWILIO_WEBHOOK_SIGNATURE_VALIDATION=false
```

Ou use [ngrok](https://ngrok.com/) para expor seu localhost com HTTPS:

```bash
ngrok http 3000
```

Use a URL do ngrok no Twilio:
```
https://abc123.ngrok.io/api/webhooks/twilio
```

---

## 🧪 Testando a Validação

### SendGrid

```bash
# Simular evento com assinatura inválida (deve retornar 401)
curl -X POST http://localhost:3000/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -H "X-Twilio-Email-Event-Webhook-Signature: t=1234567890,v1=invalidsignature" \
  -d '[{"event": "delivered", "email": "test@example.com"}]'

# Sem validação habilitada (deve retornar 200)
curl -X POST http://localhost:3000/api/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -d '[{"event": "delivered", "email": "test@example.com"}]'
```

### Twilio

```bash
# Simular evento com assinatura inválida (deve retornar 401)
curl -X POST http://localhost:3000/api/webhooks/twilio \
  -H "Content-Type: application/json" \
  -H "X-Twilio-Signature: invalidsignature" \
  -d '{"MessageSid": "SM123", "MessageStatus": "delivered"}'

# Sem validação habilitada (deve retornar 200)
curl -X POST http://localhost:3000/api/webhooks/twilio \
  -H "Content-Type: application/json" \
  -d '{"MessageSid": "SM123", "MessageStatus": "delivered"}'
```

---

## ⚙️ Configuração por Ambiente

### Desenvolvimento
```env
SENDGRID_WEBHOOK_SIGNATURE_VALIDATION=false
TWILIO_WEBHOOK_SIGNATURE_VALIDATION=false
```

### Staging
```env
SENDGRID_WEBHOOK_SIGNATURE_VALIDATION=true
SENDGRID_WEBHOOK_PUBLIC_KEY=your_public_key_here
TWILIO_WEBHOOK_SIGNATURE_VALIDATION=true
```

### Produção
```env
SENDGRID_WEBHOOK_SIGNATURE_VALIDATION=true
SENDGRID_WEBHOOK_PUBLIC_KEY=your_public_key_here
TWILIO_WEBHOOK_SIGNATURE_VALIDATION=true
```

---

## 🔍 Logs e Debugging

Os serviços de validação registram logs úteis:

```typescript
// Validação desabilitada
[SendGridSignatureService] SendGrid signature validation is disabled, skipping

// Validação bem-sucedida
[SendGridSignatureService] SendGrid signature validated successfully

// Erro de validação
[SendGridSignatureService] Failed to validate SendGrid signature
```

Para ver logs detalhados:

```bash
# Modo debug
LOG_LEVEL=debug npm run start:dev
```

---

## 🚨 Troubleshooting

### SendGrid: "Webhook timestamp is too old"

**Causa:** O servidor está com clock desincronizado ou o webhook está demorando muito.

**Solução:**
- Sincronize o relógio do servidor: `sudo ntpdate -s time.nist.gov`
- Verifique latência da rede
- Em desenvolvimento, aumente o timeout (não recomendado em produção)

### Twilio: "Invalid webhook signature"

**Causa:** URL não corresponde ou parâmetros foram modificados.

**Solução:**
- Verifique se a URL configurada no Twilio é exata (incluindo HTTPS)
- Certifique-se de que o Auth Token está correto
- Use ngrok em desenvolvimento local
- Não modifique os parâmetros do body

### Chave pública não configurada

**Aviso:**
```
SendGrid webhook signature validation is enabled but SENDGRID_WEBHOOK_PUBLIC_KEY is not configured
```

**Solução:** Configure a variável de ambiente com a chave do SendGrid.

---

## 📚 Referências

- [SendGrid Event Webhook Security](https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features)
- [Twilio Webhook Security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)
- [ECDSA Signature Verification](https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm)
- [HMAC SHA1](https://en.wikipedia.org/wiki/HMAC)

---

## ✅ Checklist de Produção

Antes de fazer deploy em produção:

- [ ] Obter Public Key do SendGrid
- [ ] Configurar `SENDGRID_WEBHOOK_SIGNATURE_VALIDATION=true`
- [ ] Adicionar `SENDGRID_WEBHOOK_PUBLIC_KEY` no .env de produção
- [ ] Configurar `TWILIO_WEBHOOK_SIGNATURE_VALIDATION=true`
- [ ] Verificar que `TWILIO_AUTH_TOKEN` está correto
- [ ] Usar URLs HTTPS para webhooks
- [ ] Testar webhooks em staging primeiro
- [ ] Monitorar logs de validação
- [ ] Configurar alertas para falhas de validação

---

*Última atualização: 2026-01-28*
