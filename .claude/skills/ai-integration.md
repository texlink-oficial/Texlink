# Skill: ai-integration

## Propósito

Padrões de integração com modelos de linguagem: client wrappers, model selection, error handling, fallbacks, streaming e observabilidade. Garante integração robusta, econômica e resiliente com provedores de IA.

## Quando consultar

- Ao implementar AI services e wrappers de LLM (ai-engineer)
- Ao integrar prompts otimizados no código (prompt-engineer)
- Ao definir arquitetura de componentes de IA (architect)

## Regras

### Client wrapper

1. **Wrapper centralizado:** toda chamada de LLM passa por um AI client único. Nunca chame SDKs diretamente em services.
2. **Interface agnóstica:** o wrapper expõe interface genérica (`chat`, `embed`, `classify`). Trocar de provider não deve alterar código de negócio.
3. **Config por ambiente:** model, temperature, maxTokens, timeout configuráveis via env vars. Nunca hardcoded.

### Model selection

4. **Modelo por task:**
   - Classificação/extração simples → modelo leve (Haiku)
   - Geração de texto, análise → modelo médio (Sonnet)
   - Raciocínio complexo, multi-step → modelo capaz (Opus)
5. **Justifique a escolha:** documente no `ai-services.md` por que cada feature usa o modelo escolhido (custo vs qualidade vs latência).
6. **Benchmark antes de escolher:** teste pelo menos 2 modelos com golden dataset antes de definir.

### Error handling e resiliência

7. **Timeout obrigatório:** 30s para chat, 10s para embedding, 60s para análise longa. Configurável.
8. **Retry com backoff:** max 3 tentativas, exponential backoff (1s, 2s, 4s). Não repita em 4xx (exceto 429).
9. **Fallback model:** se modelo principal falha 3x ou timeout, use modelo alternativo. Documente a cadeia.
10. **Circuit breaker:** se > 50% das requests falham em janela de 5min, abra o circuito. Retorne fallback estático por 30s antes de tentar novamente.
11. **Graceful degradation:** feature de IA indisponível ≠ app indisponível. Mostre estado degradado ao usuário.

### Streaming

12. **Use streaming para respostas longas:** qualquer resposta > 200 tokens deve usar streaming para UX.
13. **Buffer de segurança:** aplique guardrails no buffer acumulado periodicamente, não só no final.
14. **Cancellation:** usuário pode cancelar stream. Interrompa a request e registre tokens consumidos.

### Structured output

15. **JSON mode quando disponível:** use para respostas estruturadas. Mais confiável que parsing de texto.
16. **Schema validation:** valide output contra schema esperado. Se inválido, retry 1x com prompt de correção. Se falhar novamente, retorne erro.
17. **Enum constraining:** para classificações, liste valores válidos no prompt E valide no código.

### Observabilidade

18. **Log por request:** `{ requestId, model, promptVersion, tokensIn, tokensOut, latencyMs, costUsd, status }`.
19. **Métricas agregadas:** requests/min, error rate, latency p50/p95/p99, custo/hora, tokens/hora.
20. **Alertas:** error rate > 5%, latency p95 > 5s, custo diário > budget.
21. **Sem PII nos logs:** log hash do input, nunca conteúdo raw.

### Caching

22. **Cache de embeddings:** mesmo texto → mesmo embedding. Cache com TTL de 24h.
23. **Cache de responses:** para queries idênticas (deterministic), cache com TTL curto (5-15min).
24. **Cache key:** hash do prompt completo (system + user + params). Invalidar ao mudar prompt version.

## Exemplos

### ✅ Correto
```typescript
// AI Client wrapper — interface agnóstica
class AIClient {
  private primaryModel: string;
  private fallbackModel: string;
  private circuitBreaker: CircuitBreaker;

  async chat(params: ChatParams): Promise<ChatResponse> {
    const startTime = Date.now();
    const requestId = generateId();

    try {
      const response = await this.circuitBreaker.execute(() =>
        this.provider.chat({
          model: this.primaryModel,
          messages: params.messages,
          maxTokens: params.maxTokens ?? 500,
          temperature: params.temperature ?? 0.7,
          timeout: params.timeout ?? 30_000,
        })
      );

      this.logRequest(requestId, response, Date.now() - startTime);
      return response;

    } catch (error) {
      if (this.fallbackModel) {
        return this.chatWithFallback(params, requestId);
      }
      throw new AIServiceError('AI service unavailable', { requestId });
    }
  }
}
```

### ❌ Incorreto
```typescript
// Chamada direta ao SDK em service de negócio
import Anthropic from '@anthropic-ai/sdk';

async function analyzeMood(text: string) {
  const client = new Anthropic(); // 😱 SDK direto, sem wrapper
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6', // 😱 Hardcoded
    max_tokens: 4096,            // 😱 Sem limit racional
    messages: [{ role: 'user', content: text }],
    // 😱 Sem timeout, sem retry, sem fallback, sem logging
  });
  return response.content[0].text; // 😱 Sem validação de output
}
```

## Referências

- [Anthropic SDK — TypeScript](https://docs.anthropic.com/en/docs/sdks)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- Skill `ai-guardrails.md` — segurança complementa integração
- Skill `coding-standards.md` — convenções de código se aplicam a AI services
