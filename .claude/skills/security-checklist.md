# Skill: security-checklist

## Propósito

Checklist de segurança cobrindo OWASP Top 10, LGPD, encryption, autenticação, headers e validação de input. Referência obrigatória para todo código que toca dados de usuário, autenticação ou integrações externas.

## Quando consultar

- Ao definir arquitetura de autenticação/autorização (architect)
- Ao implementar endpoints, middlewares e validações (backend-dev)
- Ao fazer auditoria de segurança (security-analyst)
- Ao fazer code review de módulos sensíveis (code-reviewer)

## Regras

### Autenticação

1. **JWT com expiração curta:** access token ≤ 15min, refresh token ≤ 7 dias.
2. **Hashing de senhas:** bcrypt (cost ≥ 12) ou argon2id. Nunca MD5, SHA-1 ou SHA-256 sozinho.
3. **Rate limit em login:** máximo 5 tentativas por minuto por IP/email. Depois: lockout progressivo.
4. **MFA:** obrigatório para admin/moderador. Opcional (mas incentivado) para usuários.
5. **Sessão:** invalidar todos os tokens ao trocar senha. Invalidar refresh token ao fazer logout.

### Autorização

6. **RBAC no servidor:** nunca confie no frontend para controle de acesso.
7. **Verificação por recurso:** além do role, verifique ownership (`user_id === resource.userId`).
8. **Deny by default:** todo endpoint é protegido. Marque explicitamente os públicos.
9. **Sem IDOR:** nunca use ID sequencial como único controle de acesso. Valide ownership.

### Input validation

10. **Valide TUDO no servidor.** Validação no frontend é UX, não segurança.
11. **Schema validation:** use Zod, Joi ou similar em todo endpoint.
12. **Sanitize strings:** trim, escape HTML em inputs de texto.
13. **Limite de tamanho:** body max 1MB (default), file upload max definido por feature.
14. **Rejeite tipos inesperados:** número onde espera string → 400, não coerção silenciosa.

### Injection prevention

15. **SQL injection:** use ORM/query builder com prepared statements. Nunca concatene SQL.
16. **NoSQL injection:** valide tipos antes de passar para query.
17. **Command injection:** nunca passe input de usuário para `exec`/`spawn` sem sanitização.
18. **XSS:** escape output em HTML. Use framework que escapa por padrão (React, Vue).
19. **CSRF:** token CSRF para formulários que alteram estado (ou use SameSite cookies).

### Headers de segurança

20. **HTTPS only:** `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
21. **CSP:** `Content-Security-Policy` restritivo (sem `unsafe-inline` em produção).
22. **X-Content-Type-Options:** `nosniff`.
23. **X-Frame-Options:** `DENY` (ou `SAMEORIGIN` se iframe é necessário).
24. **Referrer-Policy:** `strict-origin-when-cross-origin`.
25. **Permissions-Policy:** desabilitar features desnecessárias (camera, microphone, geolocation).

### Criptografia

26. **TLS 1.2+ obrigatório** para toda comunicação. Sem HTTP plain text.
27. **Encryption at rest** para dados sensíveis (PII, saúde, financeiro).
28. **Chaves de criptografia** em secret manager (nunca no código ou env file commitado).
29. **Secrets rotation:** defina política de rotação (mínimo a cada 90 dias).
30. **Nunca logue dados sensíveis:** PII, tokens, senhas, chaves de API.

### LGPD/GDPR

31. **Consentimento explícito** antes de coletar dados pessoais.
32. **Direito ao acesso:** endpoint para exportar dados do usuário.
33. **Direito ao esquecimento:** processo de anonimização/exclusão documentado.
34. **Minimização:** colete apenas dados necessários para a funcionalidade.
35. **Base legal:** documente qual base legal justifica cada coleta (consentimento, contrato, legítimo interesse).
36. **Data Processing Agreement:** se usar serviço terceiro (LLM, analytics), documente o DPA.

### Dependências

37. **Audit regular:** `npm audit` / `pip audit` no CI. Block on Critical/High.
38. **Lock files commitados:** `package-lock.json` ou `pnpm-lock.yaml` sempre no repo.
39. **Sem dependências abandonadas:** se última release > 2 anos, avalie alternativa.
40. **Pinne versões:** sem `^` ou `~` para dependências críticas de segurança.

## Exemplos

### ✅ Correto
```typescript
// Input validation com Zod
const CreateMoodEntrySchema = z.object({
  mood: z.string().min(1).max(50),
  intensity: z.number().int().min(1).max(10),
  note: z.string().max(5000).optional(),
  isPrivate: z.boolean().default(true),
});

// Middleware de validação
app.post('/api/mood-entries', authenticate, async (req, res) => {
  const parsed = CreateMoodEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      errors: parsed.error.issues.map(i => ({
        code: 'VALIDATION_ERROR',
        message: i.message,
        field: i.path.join('.'),
      })),
    });
  }

  // Ownership check
  const entry = await moodService.create({
    ...parsed.data,
    userId: req.user.id, // do token, nunca do body
  });

  res.status(201).json({ data: entry });
});
```

```typescript
// Logging seguro — sem PII
logger.info('Mood entry created', {
  entryId: entry.id,
  userId: entry.userId,  // ID é ok, não é PII diretamente
  // NUNCA: email, nome, note (conteúdo de saúde mental)
});
```

### ❌ Incorreto
```typescript
// SQL injection
const entries = await db.query(
  `SELECT * FROM mood_entries WHERE user_id = '${req.params.userId}'`
  // 😱 Concatenação direta — use prepared statement
);

// IDOR — sem ownership check
app.get('/api/mood-entries/:id', async (req, res) => {
  const entry = await db.findById(req.params.id);
  res.json(entry); // 😱 Qualquer usuário acessa qualquer entry
});

// Dados sensíveis em log
logger.info('User login', {
  email: user.email,     // 😱 PII
  password: req.body.password,  // 😱 NUNCA
  token: jwt,            // 😱 Secret
});

// Senha sem hashing
await db.users.create({
  email: req.body.email,
  password: req.body.password,  // 😱 Plain text
});
```

## Referências

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [LGPD — Lei 13.709/2018](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [Security Headers](https://securityheaders.com/)
- [CWE Top 25 Most Dangerous Software Weaknesses](https://cwe.mitre.org/top25/)
