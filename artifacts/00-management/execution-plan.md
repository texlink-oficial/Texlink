# Plano de Execução — AI Dev Squad

> Texlink Fação Manager — Projeto Brownfield

**Data:** 2026-03-25
**Autor:** squad-manager
**Tipo:** Brownfield (codebase existente com 324 source files, 392 commits, 410 testes)

---

## Diagnóstico do Estado Atual

### Trabalho já realizado (pipeline legado)

| Fase Legada | Mapeamento Squad | Artefatos | Estado | Observações |
|-------------|-----------------|-----------|--------|-------------|
| 00-audit | — (pré-Squad) | 5 files, 693 lines | Completo | Score 45/100 (RED), 68 issues (13 P0) |
| 02-design | 02-ux-designer | 14 files, 6.479 lines | Completo | Design system, tokens, wireframes, improvement plan |
| 03-architecture | 03-architect | 3 files, 1.696 lines | Parcial | Implementation plan + payment ADR; falta API spec formal |
| 04-qa | 08-qa-engineer | 5 files, 4.594 lines | Em progresso | Test plans criados, 410 testes passando, E2E stubs prontos |
| 05-deploy | 10-devops | 4 files, 2.392 lines | Completo | Playbook completo (Railway, Docker, staging) |
| 07-reports | 13-project-reporter | 4 files, 1.199 lines | Em progresso | Reports até W12 (Mar 20) |
| 08-reviews | 11-code-reviewer | 16 files, 5.354 lines | Em progresso | 6 sprints revisados; blockers em sprint 5 e 6 |
| 09-security | 09-security-analyst | 11 files, 1.228 lines | Crítico | 13 P0, 7 IDOR; assessment = HIGH risk |

### Fases que NÃO foram executadas

| Fase Squad | Motivo | Ação |
|------------|--------|------|
| 01-discovery | Brownfield — produto já existe | Pular (decisão documentada) |
| 04-frontend | Código já existe (145 componentes, 104 páginas) | Ativar para melhorias/correções |
| 05-backend | Código já existe (33 módulos NestJS) | Ativar para remediação de segurança |
| 06-ai | Gemini Vision API já integrada | Avaliar se precisa de mais trabalho |
| 07-data | Prisma schema já definido | Pular por enquanto |
| 12-tech-writer | Sem docs formais | Baixa prioridade |
| 14-eval-engineer | Depende de decisão sobre IA | Condicional |
| 15-prompt-engineer | Depende de decisão sobre IA | Condicional |

---

## Prioridades (ordenadas por impacto/risco)

### P0 — Crítico (bloqueia produção)

1. **Remediação de segurança** (09-security-analyst)
   - 7 vulnerabilidades IDOR/access control
   - Secrets em git history (SEC-001)
   - Session invalidation ausente (SEC-002)
   - Upload sem tenant check (SEC-003)
   - Redis sem autenticação (VULN-003)
   - Token storage inseguro (VULN-001)

2. **Resolução de code review blockers** (11-code-reviewer → 05-backend-dev / 04-frontend-dev)
   - Sprint 5: 3 blocking issues
   - Sprint 6: 2 blocking issues

### P1 — Alto (qualidade e confiabilidade)

3. **Completar QA** (08-qa-engineer)
   - Instalar Playwright + seed users para E2E
   - Testes IDOR para todas as entidades
   - Phase 2: chat, notifications, credentials, admin
   - Meta: cobertura ≥ 80%

4. **CI/CD** (10-devops)
   - GitHub Actions com test suite
   - Coverage thresholds
   - E2E execution

### P2 — Médio (melhoria contínua)

5. **Implementar design improvements** (04-frontend-dev)
   - 22 áreas de melhoria mapeadas em `02-design/improvement-plan.md`
   - Design tokens prontos em `02-design/design-tokens.json`

6. **Completar arquitetura** (03-architect)
   - API spec formal (Swagger/OpenAPI)
   - Data model documentation

### P3 — Baixo (nice-to-have)

7. **Documentação** (12-tech-writer)
8. **Reports** (13-project-reporter)

---

## Plano de Execução por Ondas

### Onda 1 — Estabilização (URGENTE)

```
09-security-analyst ──→ 05-backend-dev ──→ 08-qa-engineer (testes IDOR)
                   └──→ 04-frontend-dev (fix blockers)
```

**Agentes:** security-analyst, backend-dev, frontend-dev, qa-engineer
**Paralelismo:** security-analyst produz relatório de remediação → backend-dev + frontend-dev corrigem em paralelo → qa-engineer valida
**Entregáveis:**
- `artifacts/09-security/remediation-plan.md` — plano detalhado de correções
- Código corrigido (IDOR fixes, token storage, session management)
- Testes IDOR cobrindo todas as entidades críticas
- Code review blockers resolvidos (sprints 5 e 6)

**Gate G4:** Após Onda 1 → humano aprova que 0 P0 security issues restam

### Onda 2 — Qualidade

```
08-qa-engineer (E2E + Phase 2) ──→ 10-devops (CI/CD)
11-code-reviewer (validar fixes)
```

**Agentes:** qa-engineer, devops, code-reviewer
**Entregáveis:**
- Playwright E2E rodando (chromium instalado, seed users criados)
- Phase 2 testes: chat, notifications, credentials, admin
- GitHub Actions pipeline com thresholds
- Review das correções da Onda 1

### Onda 3 — Evolução

```
03-architect (API spec) ──→ 04-frontend-dev (design improvements)
                        └──→ 05-backend-dev (melhorias)
12-tech-writer (docs)
```

**Agentes:** architect, frontend-dev, backend-dev, tech-writer
**Entregáveis:**
- API spec formal (OpenAPI/Swagger)
- Design improvements implementados (do improvement-plan.md)
- Documentação técnica

---

## Decisões Documentadas

| # | Decisão | Motivação |
|---|---------|-----------|
| D01 | Pular fase 01-discovery | Brownfield — produto já existe e está em uso |
| D02 | Priorizar segurança sobre features | Audit score 45/100, 13 P0 issues |
| D03 | Manter artifacts legados | Preservar histórico; migrar gradualmente |
| D04 | Ondas em vez de pipeline sequencial | Projeto já tem código; precisa estabilizar, não construir do zero |

---

## Métricas de Saída (Definition of Done)

| Métrica | Alvo | Atual |
|---------|------|-------|
| Security P0 issues | 0 | 13 |
| Security P1 issues | 0 | 18 |
| Test coverage | ≥ 80% | ~15% (backend), ~0% (frontend) |
| E2E tests running | Yes | No (stubs only) |
| CI/CD pipeline | Active | None |
| Code review blockers | 0 | 5 |
| Audit score | ≥ 75/100 | 45/100 |
