# Skill: ai-evaluation

## Propósito

Frameworks de avaliação de IA: golden datasets, LLM-as-judge, métricas de qualidade, experiment tracking e critérios de aprovação. Garante que features de IA são avaliadas com rigor e evidência antes de ir a produção.

## Quando consultar

- Ao definir estratégia de avaliação de features de IA (eval-engineer)
- Ao criar golden datasets e rubrics (eval-engineer)
- Ao interpretar resultados de avaliação (ai-engineer, prompt-engineer)
- Ao definir thresholds de qualidade (architect, product-strategist)

## Regras

### Golden datasets

1. **Um dataset por use case.** "mood analysis" e "journal companion" são datasets separados.
2. **Mínimo 100 examples** para avaliação estatisticamente significativa.
3. **Distribuição balanceada:** positivos (60%), negativos (20%), edge cases (10%), adversariais (10%).
4. **Formato padronizado:** `{ id, input, expectedOutput, tags[], notes, metadata{} }`.
5. **Versionamento:** datasets versionados (v1, v2). Nunca modifique dataset existente — crie nova versão.
6. **Sem dados reais:** use dados sintéticos ou anonimizados. Nunca PII real nos datasets.
7. **Tags obrigatórias:** `positive`, `negative`, `edge-case`, `adversarial`, `regression`.
8. **Regression examples:** quando um bug de IA é encontrado, o input problemático vira exemplo no dataset (tag `regression`).

### LLM-as-judge

9. **Rubric explícita:** critérios de avaliação definidos antes de avaliar. Nunca "avalie a qualidade" sem critérios.
10. **Escala definida:** 1-5 com descrição por nível. "3" não é "médio" — é "resposta aceitável mas sem profundidade".
11. **Calibração:** compare judge com avaliação humana em 50+ examples. Agreement ≥ 80% antes de confiar.
12. **Posição bias:** se apresentar múltiplas respostas para comparação, randomize a ordem.
13. **Modelo de judge ≥ modelo avaliado:** use modelo igual ou mais capaz para julgar.
14. **Sem auto-avaliação:** modelo não julga seus próprios outputs. Use modelo diferente ou versão diferente.

### Métricas

15. **Métricas por dimensão:**
    | Dimensão | Métricas | Quando usar |
    |----------|---------|-------------|
    | Correção | Accuracy, F1, Exact Match | Classificação, extração |
    | Relevância | Relevance@k, NDCG | RAG, busca |
    | Segurança | Safety rate, False positive rate | Guardrails, moderation |
    | Consistência | Variance, Agreement rate | Qualquer (múltiplas runs) |
    | Fluência | Perplexity, Human rating | Geração de texto |
    | Formato | Schema compliance rate | Structured output |
    | Latência | p50, p95, p99 | Todos |
    | Custo | $/1K requests, tokens/request | Todos |

16. **Threshold antes de avaliar:** defina "bom o suficiente" ANTES de rodar a avaliação. Não ajuste depois de ver os resultados.
17. **Intervalo de confiança:** reporte como `85.2% ± 3.1%` (com IC de 95%), não apenas `85.2%`.

### Experiment tracking

18. **Registre cada eval run:** prompt version, model, dataset version, métricas, timestamp.
19. **Comparação lado-a-lado:** nunca avalie A e B em momentos diferentes com datasets diferentes. Mesma run, mesmo dataset.
20. **Baseline obrigatório:** toda avaliação compara contra baseline (versão anterior ou modelo anterior).
21. **Reproducibility:** registre seed, temperature, top_p para reproduzir resultados.

### Critérios de aprovação (defaults)

22. **Safety:** ≥ 99%. Não negociável.
23. **Accuracy/Relevance:** ≥ 85% para features core. ≥ 75% para features experimentais.
24. **Format compliance:** ≥ 95% (structured output segue schema).
25. **Latency p95:** < 3s para UX interativa. < 30s para análises batch.
26. **Custo:** dentro do budget mensal definido nos NFRs.
27. **Regression:** 0 regressões em examples com tag `regression`.

### Failure analysis

28. **Categorize failures:** por tipo (safety, accuracy, format, timeout) e por input pattern.
29. **Top-5 failure modes:** documente os 5 padrões de falha mais frequentes com exemplos.
30. **Root cause:** para cada failure mode, proponha hipótese de causa (prompt vago, contexto insuficiente, limitação do modelo).

## Exemplos

### ✅ Correto
```markdown
## Eval Results — Mood Analysis v2 → v3

### Setup
- **Model:** claude-sonnet-4-6
- **Dataset:** mood-analysis-v2 (142 examples)
- **Prompt:** mood-classifier-v3 (changed: added 3 few-shot examples)
- **Baseline:** mood-classifier-v2

### Results
| Metric | v2 (baseline) | v3 | Delta | Target | Pass? |
|--------|--------------|-----|-------|--------|-------|
| Accuracy | 81.7% ± 3.2% | 88.0% ± 2.7% | +6.3% | ≥85% | ✅ |
| Safety | 100% | 100% | 0 | ≥99% | ✅ |
| Format compliance | 92.3% | 97.9% | +5.6% | ≥95% | ✅ |
| Latency p95 | 1.8s | 2.1s | +0.3s | <3s | ✅ |
| Regressions | - | 0/8 | - | 0 | ✅ |

### Top Failure Modes (v3)
1. **Mixed emotions (7/17 failures):** Input with 2+ emotions → model picks dominant only
   - Example: "Estou feliz pelo resultado mas ansioso pelo próximo passo"
   - Root cause: prompt says "classify as ONE of" — should allow MIXED
2. **Sarcasm (4/17 failures):** Sarcastic positive read as genuine positive
   - Example: "Ah sim, maravilhoso perder meu ônibus de novo"
   - Root cause: no sarcasm examples in few-shot

### Recommendation
✅ **Approve v3** — all thresholds met. Open items for v4:
- Add MIXED category to classification
- Add sarcasm examples to few-shot
```

### ❌ Incorreto
```markdown
## Eval Results
Tested the new prompt. It seems better. Results look good.
Accuracy is around 85%. Should be fine for production.

# Problemas:
# 😱 "Seems better" — sem baseline para comparação
# 😱 "Around 85%" — sem intervalo de confiança
# 😱 Sem dataset version, sem model info, sem setup
# 😱 Sem failure analysis
# 😱 Sem safety metric (pode estar piorando)
# 😱 "Should be fine" — sem threshold definido previamente
```

## Referências

- [Anthropic Evals Guide](https://docs.anthropic.com/en/docs/build-with-claude/develop-tests)
- [HELM — Holistic Evaluation of Language Models](https://crfm.stanford.edu/helm/)
- [LLM-as-Judge — arXiv](https://arxiv.org/abs/2306.05685)
- Skill `ai-guardrails.md` — safety thresholds
- Skill `prompt-patterns.md` — padrões de prompt sendo avaliados
