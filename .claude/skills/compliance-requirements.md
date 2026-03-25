# Skill: compliance-requirements

## Propósito

Requisitos de compliance por regulamentação (LGPD, GDPR, HIPAA, PCI-DSS). Checklist de conformidade, obrigações legais e implementação técnica. Referência obrigatória quando o projeto lida com dados pessoais, saúde ou financeiro.

## Quando consultar

- Ao definir requisitos não-funcionais de compliance (product-strategist)
- Ao auditar conformidade regulatória (security-analyst)
- Ao modelar dados com PII (data-engineer, architect)
- Ao implementar consentimento e data export (backend-dev)

## Regras

### LGPD (Lei Geral de Proteção de Dados — Brasil)

1. **Base legal obrigatória:** toda coleta de dados pessoais deve ter base legal documentada (consentimento, contrato, legítimo interesse, obrigação legal).
2. **Consentimento explícito:** opt-in ativo (nunca pré-marcado). Granular por finalidade. Revogável a qualquer momento.
3. **Direito de acesso (Art. 18):** endpoint para o titular exportar todos os seus dados em formato legível.
4. **Direito de exclusão (Art. 18):** processo de anonimização/exclusão em até 15 dias. Soft delete + anonymization.
5. **Minimização:** colete apenas dados necessários para a finalidade declarada. Justifique cada campo PII.
6. **Encarregado (DPO):** projetos com tratamento de dados em escala devem designar um DPO. Documente contato.
7. **Relatório de impacto (RIPD):** necessário para tratamento de dados sensíveis (saúde, biométricos).
8. **Notificação de incidente:** em caso de breach, notificar ANPD e titulares em prazo razoável.

### GDPR (se aplicável — usuários na UE)

9. **Mesmas bases da LGPD** + direito à portabilidade (dados em formato máquina — JSON/CSV).
10. **Privacy by Design:** proteção de dados incorporada desde a concepção do sistema.
11. **DPA (Data Processing Agreement):** contrato obrigatório com todos os processadores de dados (cloud, LLM providers, analytics).
12. **Cookie consent:** banner com opções granulares (essenciais, analytics, marketing). Sem tracking antes do consentimento.

### HIPAA (se dados de saúde — EUA)

13. **PHI protection:** Protected Health Information deve ser encrypted at rest E in transit.
14. **Minimum necessary:** acesse apenas o mínimo de dados necessário para a função.
15. **Audit trail:** log de todo acesso a PHI (quem, quando, o quê).
16. **BAA (Business Associate Agreement):** contrato obrigatório com qualquer serviço que acesse PHI.
17. **Breach notification:** notificação em até 60 dias após descoberta.

### PCI-DSS (se dados financeiros/pagamento)

18. **Nunca armazene CVV/CVC.** Nunca. Em nenhuma circunstância.
19. **Tokenização:** use gateway de pagamento (Stripe, Adyen) — nunca processe cartão diretamente.
20. **PAN masking:** número de cartão exibido apenas como últimos 4 dígitos.
21. **Network segmentation:** sistemas que processam pagamento isolados da rede geral.

### Implementação técnica (cross-regulation)

22. **Classificação de dados:** toda coluna PII marcada no data-dictionary com `[PII]` e categoria (nome, email, saúde, financeiro).
23. **Encryption at rest:** AES-256 para dados sensíveis. Chaves em secret manager (nunca no código).
24. **Encryption in transit:** TLS 1.2+ obrigatório. Sem exceções.
25. **Retenção de dados:** defina TTL por tipo de dado. Dados de log: 90 dias. Dados de conta: duração da conta + 30 dias.
26. **Anonimização:** ao excluir conta, substitua PII por hash irreversível ou placeholder. Mantenha dados estatísticos agregados.
27. **Consent tracking:** registre consentimento com: versão do termo, timestamp, IP, quais finalidades aceitas.
28. **Data flow diagram:** documente onde dados pessoais fluem (frontend → backend → banco → LLM provider → analytics).

## Exemplos

### ✅ Correto
```typescript
// Consent tracking
const consent = await db.consents.create({
  userId: user.id,
  version: 'privacy-policy-v2.1',
  purposes: ['essential', 'journaling', 'ai-companion'], // granular
  acceptedAt: new Date(),
  ipAddress: hashIp(req.ip), // hash, não plain text
  revocable: true,
});

// Data export endpoint
app.get('/api/me/data-export', authenticate, async (req, res) => {
  const userData = await dataExportService.exportAll(req.user.id);
  // Inclui: profile, mood entries, journal, settings, consents
  res.json({ data: userData, exportedAt: new Date().toISOString() });
});

// Account deletion (anonymization)
async function deleteAccount(userId: string): Promise<void> {
  await db.$transaction([
    db.users.update({
      where: { id: userId },
      data: {
        email: `deleted-${hash(userId)}@anon.local`,
        name: '[Deleted User]',
        avatarUrl: null,
        deletedAt: new Date(),
      },
    }),
    db.moodEntries.updateMany({
      where: { userId },
      data: { note: null }, // Remove conteúdo sensível, mantém dados agregados
    }),
    db.consents.updateMany({
      where: { userId },
      data: { revokedAt: new Date() },
    }),
  ]);
}
```

### ❌ Incorreto
```typescript
// Sem consentimento granular
app.post('/api/register', async (req, res) => {
  const user = await createUser(req.body);
  // 😱 Nenhum consentimento registrado. Nenhum opt-in.
});

// Delete que não anonimiza
app.delete('/api/me', authenticate, async (req, res) => {
  await db.users.delete({ where: { id: req.user.id } });
  // 😱 Hard delete — perde audit trail
  // 😱 Não anonimiza mood entries (dados sensíveis de saúde permanecem)
});

// PII enviada a third-party sem DPA
const analysis = await llmClient.chat({
  messages: [{
    role: 'user',
    content: `Analyze journal for ${user.name} (${user.email}): ${entry.note}`
    // 😱 Nome, email e conteúdo de saúde mental enviados ao LLM provider
  }],
});
```

## Referências

- [LGPD — Lei 13.709/2018 (texto completo)](http://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)
- [GDPR — Regulamento (UE) 2016/679](https://gdpr-info.eu/)
- [HIPAA Summary](https://www.hhs.gov/hipaa/for-professionals/index.html)
- [PCI-DSS Quick Reference](https://www.pcisecuritystandards.org/)
- Skill `security-checklist.md` — controles técnicos complementares
- Skill `database-patterns.md` — campos PII e anonimização
