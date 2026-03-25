# Skill: testing-strategy

## Propósito

Pirâmide de testes, ferramentas, cobertura mínima e critérios de quando testar o quê. Garante qualidade consistente entre todos os agentes que escrevem ou validam código.

## Quando consultar

- Antes de escrever qualquer teste
- Ao decidir qual tipo de teste escrever para uma feature
- Ao configurar infraestrutura de testes
- Ao avaliar cobertura de código

## Regras

### Pirâmide de testes

1. **Unit tests (base — 70%):** Testam uma função/módulo isolado. Rápidos (< 50ms cada). Sem I/O externo.
2. **Integration tests (meio — 20%):** Testam interação entre módulos ou com banco/API. Podem ser mais lentos (< 2s cada).
3. **E2E tests (topo — 10%):** Testam fluxos completos do ponto de vista do usuário. Apenas fluxos críticos.

### Cobertura mínima

4. **Statements:** ≥ 80% global.
5. **Branches:** ≥ 75% global.
6. **Functions:** ≥ 85% global.
7. **Módulos críticos (auth, pagamento, dados sensíveis):** 100% de branches.
8. **Componentes UI:** 100% de estados (success, loading, error, empty).

### O que testar (por tipo)

9. **Unit:** Pure functions, validators, formatters, hooks, services, utils. Sempre.
10. **Integration:** API endpoints (request → response), database queries, interação entre services. Sempre.
11. **E2E:** Onboarding, login, CRUD principal, fluxos de pagamento, fluxos críticos de IA. Apenas estes.
12. **Acessibilidade:** Todo componente UI — via jest-axe (unit) e Lighthouse (e2e).
13. **Snapshot:** Somente para design tokens/configs estáveis. Nunca para componentes com lógica.

### Como testar

14. **Naming:** `describe('[Módulo]') > it('should [comportamento] when [condição]')`.
15. **Pattern:** Arrange → Act → Assert (AAA). Sem exceção.
16. **Independência:** Nenhum teste depende de outro. Cada teste configura seu próprio estado.
17. **Determinismo:** Mesma entrada → mesma saída. Sem dependência de hora, random, ou estado externo.
18. **Mocks:** Use apenas para I/O externo (APIs terceiras, timers, file system). Prefira teste real de banco.
19. **Test data:** Use factories/fixtures. Nunca dados hardcoded repetidos entre testes.
20. **Assertions:** Todo teste tem pelo menos 1 assertion explícita. Testes sem assertion são proibidos.

### Ferramentas padrão

21. **Test runner:** Vitest (frontend + backend) ou Jest.
22. **Componentes React:** React Testing Library (nunca Enzyme).
23. **E2E:** Playwright (nunca Cypress para projetos novos).
24. **Acessibilidade:** jest-axe + Lighthouse CI.
25. **API testing:** Supertest (integration) ou httpie/curl (manual).
26. **Coverage:** c8 ou istanbul (integrado ao Vitest/Jest).
27. **AI testing:** Golden datasets + LLM-as-judge (ver skill ai-guardrails).

### Quando NÃO testar

28. **Não teste:** getters/setters triviais, tipos TypeScript, CSS puro, configs estáticas.
29. **Não teste:** código de terceiros (bibliotecas). Teste sua integração com eles.
30. **Não teste com snapshot:** componentes que mudam frequentemente (gera churn sem valor).

## Exemplos

### ✅ Correto
```typescript
// Unit test — naming claro, AAA, assertions explícitas
describe('calculateStreakDays', () => {
  it('should return 0 when entries array is empty', () => {
    // Arrange
    const entries: MoodEntry[] = [];

    // Act
    const result = calculateStreakDays(entries);

    // Assert
    expect(result).toBe(0);
  });

  it('should count consecutive days with 1-day grace period', () => {
    // Arrange
    const entries = MoodEntryFactory.createConsecutive(5, {
      gapDays: [0, 0, 1, 0], // 3rd entry has 1-day gap
    });

    // Act
    const result = calculateStreakDays(entries);

    // Assert
    expect(result).toBe(5); // grace period allows 1-day gap
  });
});
```

```typescript
// Integration test — endpoint real, banco real
describe('POST /api/mood-entries', () => {
  it('should create mood entry and return 201 with entry data', async () => {
    // Arrange
    const user = await UserFactory.create();
    const payload = { mood: 'calm', intensity: 7, note: 'Good day' };

    // Act
    const response = await request(app)
      .post('/api/mood-entries')
      .set('Authorization', `Bearer ${user.token}`)
      .send(payload);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      mood: 'calm',
      intensity: 7,
      userId: user.id,
    });
  });
});
```

### ❌ Incorreto
```typescript
// Sem assertion (teste vazio)
it('should work', () => {
  calculateStreakDays([]);
});

// Dependência entre testes (compartilha estado)
let sharedEntry: MoodEntry;
it('should create entry', () => {
  sharedEntry = createEntry(); // 😱 próximo teste depende deste
});
it('should read entry', () => {
  expect(sharedEntry.id).toBeDefined(); // 😱 falha se o teste acima falhar
});

// Naming ruim, sem AAA
it('test1', () => {
  expect(calc([])).toBe(0); // O que é calc? O que está sendo testado?
});

// Mock desnecessário (prefira teste real)
jest.mock('@/database'); // 😱 mocking do banco quando teste de integração seria melhor
```

## Referências

- [Testing Trophy — Kent C. Dodds](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [React Testing Library — Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- Skill `coding-standards.md` — convenções de naming se aplicam a testes
