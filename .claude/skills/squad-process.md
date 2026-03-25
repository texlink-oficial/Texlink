# Skill: squad-process

## Propósito

Pipeline de desenvolvimento do AI Dev Squad. TODO agente lê esta skill antes de trabalhar.

## Fases

| # | Agente | Diretório | Depende de |
|---|--------|-----------|------------|
| 00 | squad-manager | `artifacts/00-management/` | Briefing humano |
| 01 | product-strategist | `artifacts/01-discovery/` | 00 |
| 02 | ux-designer | `artifacts/02-design/` | 01 |
| 03 | architect | `artifacts/03-architecture/` | 01 + 02 |
| 04 | frontend-dev | `artifacts/04-frontend/` + `src/` | 02 + 03 |
| 05 | backend-dev | `artifacts/05-backend/` + `src/` | 03 + 07 |
| 06 | ai-engineer | `artifacts/06-ai/` + `src/` | 03 |
| 07 | data-engineer | `artifacts/07-data/` + `src/database/` | 03 |
| 08 | qa-engineer | `artifacts/08-qa/` | 04-07 |
| 09 | security-analyst | `artifacts/09-security/` | Código + 08 |
| 10 | devops | `artifacts/10-devops/` | 08 + 09 |
| 11 | code-reviewer | `artifacts/11-review/` | 08 + 09 |
| 12 | tech-writer | `artifacts/12-documentation/` | Qualquer |
| 13 | project-reporter | `artifacts/13-reporting/` | Qualquer |
| 14 | eval-engineer | `artifacts/14-evaluation/` | 06 |
| 15 | prompt-engineer | `artifacts/15-prompts/` | 06 + 14 |

## Regras

1. **Leitura obrigatória:** PROJECT.md → esta skill → skills do agente → handoff anterior
2. **Artefatos no lugar certo:** Salve em `artifacts/XX-nome/`. Nunca fora.
3. **Handoff obrigatório:** Gere `handoff.yaml` ao concluir. Formato em `skills/handoff-protocol.md`.
4. **Atualize PROJECT.md:** Marque fase como completa, atualize progresso.
5. **Gates:** Pare e peça aprovação humana nas transições: 01→02, 02→03, 03→04-07, 08+09→10.
6. **Rastreabilidade:** Referencie IDs (US-XXX, FR-XXX, TASK-XXX) quando existirem.
7. **Não invente:** Se falta informação, pergunte. Não assuma.

## Gates de aprovação

| Gate | Transição | Quem aprova | O que avaliar |
|------|-----------|-------------|---------------|
| G1 | 01 → 02,03 | Humano via squad-manager | Discovery completo? User stories cobrem escopo? |
| G2 | 02 → 03,04 | Humano via squad-manager | Wireframes cobrem todas as stories? Tokens definidos? |
| G3 | 03 → 04-07 | Humano via squad-manager | Arquitetura viável? API spec completa? Data model correto? |
| G4 | 08+09 → 10 | Humano via squad-manager | Cobertura ≥ 80%? 0 bugs critical? 0 security P0? |

## Paralelismo

Fases 04, 05, 06 e 07 rodam em paralelo após 03 ser aprovada (G3).
- **05 (backend-dev)** pode iniciar após 03, mas bloqueia em endpoints que dependem de schema — usa mocks até 07 completar migrations.
- **04 (frontend-dev)** pode iniciar após 02+03, usa mock data até 05 disponibilizar endpoints.

Fases 08 e 09 podem rodar em paralelo (QA + Security).
Fases 11 (code-review) roda após 08+09.
Fases 12 e 13 rodam a qualquer momento (suporte).
Fases 14 e 15 rodam após 06 (se houver IA no projeto).

## Loop de avaliação de IA

Quando o projeto tem componente de IA, as fases 06, 14 e 15 formam um ciclo iterativo:

```
06 (ai-engineer) → 14 (eval-engineer) → decisão:
  ├─ Safety < 99% ou Accuracy < 85%  → 15 (prompt-engineer) → 06 → 14 (re-eval)
  └─ Thresholds atingidos             → ✅ aprovado → 08 (qa-engineer)
```

**Critérios de saída:**
- Safety rate ≥ 99%
- Accuracy ≥ 85% (core features) ou ≥ 75% (experimental)
- Format compliance ≥ 95%
- 0 regressões em golden dataset

**Limite de iterações:** máximo 3 ciclos. Se após 3 iterações os thresholds não forem atingidos, escale para o architect e o humano para redefinir escopo ou aceitar risco documentado.
