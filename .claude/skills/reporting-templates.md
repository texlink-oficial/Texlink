# Skill: reporting-templates

## Propósito

Templates e padrões para relatórios de progresso, métricas de projeto e comunicação com stakeholders. Garante relatórios consistentes, objetivos e acionáveis.

## Quando consultar

- Ao gerar status reports e métricas (project-reporter)
- Ao apresentar progresso ao humano/stakeholder (squad-manager)
- Ao consolidar resultados de fases (qualquer agente no handoff)

## Regras

### Princípios de relatório

1. **Dados, não opiniões.** "75% completo (6/8 fases)" > "quase pronto".
2. **Bad news first.** Bloqueios e riscos no topo, não escondidos no final.
3. **Acionável.** Cada problema identificado tem ação sugerida e responsável.
4. **Comparativo.** Planejado vs realizado. Anterior vs atual. Nunca número isolado.
5. **Frequência adequada.** 1 report por fase completa ou por semana. Mais que isso é ruído.

### Status Report

6. **Estrutura padrão:**
   - Resumo executivo (3 frases: onde estamos, conquista, risco)
   - Indicadores (tabela)
   - Detalhe por fase (accordion-style)
   - Riscos e bloqueios (tabela com severidade e mitigação)
   - Próximos passos (lista numerada)
7. **Indicadores obrigatórios:** progresso (%), fases completas (X/Y), bloqueios ativos, bugs critical abertos.
8. **Tendência:** use setas ↑ ↗ → ↘ ↓ para indicar se métrica está melhorando ou piorando.

### Métricas

9. **Throughput:** fases concluídas por semana.
10. **Lead time:** dias da abertura da fase até handoff completo.
11. **Quality score:** média do code review (se disponível).
12. **Test coverage:** % global e por módulo crítico.
13. **Bug density:** bugs critical+high / 1000 linhas de código.
14. **Security posture:** findings abertos por severidade.

### Visualização

15. **Timeline em Gantt (Mermaid):** planejado (linha sólida) vs realizado (linha tracejada).
16. **Tabelas para comparação:** sempre com header claro e alinhamento.
17. **Emojis para status:** ✅ completo, 🔄 em andamento, ⏳ pendente, 🚫 bloqueado, ⚠️ em risco.
18. **Sem gráficos de pizza.** Barras ou tabelas são mais informativos.

### Comunicação

19. **Resumo executivo para stakeholders não-técnicos:** sem jargão, foque em resultado de negócio.
20. **Detalhes técnicos para o squad:** inclua decisões, trade-offs, métricas de código.
21. **Transparência radical:** se atrasou, documente por quê. Se uma estimativa estava errada, diga.
22. **Formato de risco:** Descrição → Probabilidade (Alta/Média/Baixa) → Impacto (Alto/Médio/Baixo) → Mitigação → Owner.

### Templates

23. **Status report semanal:**
```markdown
# Status Report — [Projeto] — Semana [N]
> [YYYY-MM-DD]

## TL;DR
[1 frase: progresso + principal risco]

## Indicadores
| Indicador | Valor | Anterior | Tendência |
|-----------|-------|----------|-----------|

## Fases
| # | Fase | Status | Progresso |
|---|------|--------|-----------|

## Bloqueios
| Bloqueio | Severidade | Ação | Owner |
|----------|------------|------|-------|

## Próximos passos
1. [ação + responsável + prazo]
```

24. **Relatório de métricas:**
```markdown
# Métricas — [Projeto] — [Período]

## Produtividade
| Métrica | Valor | Target | Status |
|---------|-------|--------|--------|

## Qualidade
| Métrica | Valor | Target | Status |
|---------|-------|--------|--------|

## Tendência
[Gráfico Mermaid ou tabela comparativa com períodos anteriores]
```

## Exemplos

### ✅ Correto
```markdown
## TL;DR
Progresso em 62% (5/8 fases core completas). Backend bloqueado por migration de vector store — ai-engineer precisa definir dimensões do embedding antes de data-engineer prosseguir.

## Indicadores
| Indicador | Valor | Anterior | Tendência |
|-----------|-------|----------|-----------|
| Progresso Geral | 62% | 45% | ↑ |
| Fases Completas | 5/8 | 4/8 | ↑ |
| Bloqueios Ativos | 1 | 0 | ↘ |
| Bugs Critical | 0 | 0 | → |
| Lead Time Médio | 2.1 dias | 2.5 dias | ↑ |
```

### ❌ Incorreto
```markdown
## Status
O projeto está indo bem. Tivemos bom progresso essa semana.
Algumas coisas ainda precisam ser feitas mas estamos no caminho certo.
O time está trabalhando duro.

# Problemas:
# 😱 Sem números ("indo bem" não é métrica)
# 😱 Sem comparativo (progresso em relação a quê?)
# 😱 Sem bloqueios (tudo perfeito? improvável)
# 😱 Sem próximos passos acionáveis
# 😱 "Trabalhando duro" é opinião, não dado
```

## Referências

- Skill `squad-process.md` — fases e pipeline do squad
- Skill `handoff-protocol.md` — dados do handoff alimentam relatórios
- Agent `13-project-reporter.md` — consumidor principal desta skill
