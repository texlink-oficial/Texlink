# Skill: api-design

## Propósito

Convenções REST para design de APIs: naming, status codes, paginação, versionamento, formato de erros e autenticação. Garante APIs consistentes, previsíveis e bem documentadas.

## Quando consultar

- Ao definir novos endpoints (architect)
- Ao implementar endpoints (backend-dev)
- Ao consumir endpoints (frontend-dev)
- Ao documentar APIs (tech-writer)

## Regras

### URL conventions

1. **Base path:** `/api/` para todas as rotas.
2. **Recursos no plural:** `/api/mood-entries`, `/api/users` (nunca singular).
3. **Kebab-case:** `/api/mood-entries` (nunca camelCase ou snake_case em URLs).
4. **Hierarquia para sub-recursos:** `/api/users/:userId/mood-entries` (máximo 2 níveis de nesting).
5. **Sem verbos na URL:** use HTTP methods. `/api/mood-entries` + POST, nunca `/api/create-mood-entry`.
6. **Ações não-CRUD:** POST em sub-recurso descritivo (`POST /api/mood-entries/:id/archive`).

### HTTP Methods

7. **GET:** Leitura. Nunca modifica dados. Idempotente.
8. **POST:** Criação. Retorna 201 + recurso criado.
9. **PUT:** Atualização completa (replace). Idempotente.
10. **PATCH:** Atualização parcial. Envia só campos que mudam.
11. **DELETE:** Remoção (soft delete por padrão). Retorna 204 ou 200.

### Status Codes

12. **200 OK:** Sucesso em GET, PUT, PATCH, DELETE.
13. **201 Created:** Sucesso em POST. Inclui `Location` header.
14. **204 No Content:** Sucesso sem body (DELETE, ações).
15. **400 Bad Request:** Input inválido (validação falhou).
16. **401 Unauthorized:** Sem autenticação (token ausente ou expirado).
17. **403 Forbidden:** Autenticado mas sem permissão.
18. **404 Not Found:** Recurso não existe.
19. **409 Conflict:** Conflito de estado (duplicata, versão desatualizada).
20. **422 Unprocessable Entity:** Input válido sintaticamente mas inválido semanticamente.
21. **429 Too Many Requests:** Rate limit excedido. Inclui `Retry-After` header.
22. **500 Internal Server Error:** Erro inesperado. Nunca expõe stack trace.

### Response format

23. **Envelope consistente** para todas as responses:
```json
{
  "data": {},
  "meta": {},
  "errors": []
}
```
24. **`data`:** Recurso ou array de recursos. Null em caso de erro.
25. **`meta`:** Informações auxiliares (paginação, contagem, timestamps).
26. **`errors`:** Array de erros (vazio em sucesso).

### Paginação (cursor-based)

27. **Parâmetros:** `?limit=20&cursor=abc123`.
28. **Response meta:**
```json
{
  "meta": {
    "limit": 20,
    "cursor": "abc123",
    "nextCursor": "def456",
    "hasMore": true,
    "total": 150
  }
}
```
29. **Limite padrão:** 20. Máximo: 100. Se `limit > 100`, retorne 100.
30. **Ordenação:** `?sort=createdAt&order=desc`. Default: `createdAt desc`.

### Error format

31. **Formato de erro:**
```json
{
  "errors": [
    {
      "code": "VALIDATION_ERROR",
      "message": "Intensity must be between 1 and 10",
      "field": "intensity",
      "details": {}
    }
  ]
}
```
32. **Error codes:** UPPER_SNAKE_CASE, descritivos (`VALIDATION_ERROR`, `UNAUTHORIZED`, `RATE_LIMITED`, `NOT_FOUND`).
33. **Mensagens:** para humanos, em inglês, sem dados sensíveis.
34. **Field:** presente apenas em erros de validação, indica qual campo.

### Autenticação e segurança

35. **Bearer token:** `Authorization: Bearer <jwt>`.
36. **Rate limiting:** headers `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
37. **CORS:** configurado por ambiente (restritivo em produção).
38. **Sem dados sensíveis** em query params (use body ou headers).

### Versionamento

39. **URL prefix:** `/api/v1/` quando necessário breaking change.
40. **Novo campo:** não é breaking (adicionar é seguro).
41. **Remover/renomear campo:** é breaking → nova versão.

## Exemplos

### ✅ Correto
```
GET    /api/mood-entries?limit=20&cursor=abc        → 200 { data: [...], meta: { hasMore } }
GET    /api/mood-entries/123                         → 200 { data: { id, mood, ... } }
POST   /api/mood-entries         body: { mood, ... } → 201 { data: { id, mood, ... } }
PATCH  /api/mood-entries/123     body: { note: "x" } → 200 { data: { id, mood, note, ... } }
DELETE /api/mood-entries/123                         → 204
POST   /api/mood-entries/123/archive                → 200 { data: { id, archived: true } }

GET    /api/users/456/mood-entries                   → 200 (sub-resource, max 2 níveis)
```

### ❌ Incorreto
```
GET  /api/getMoodEntries              → verbo na URL
GET  /api/mood_entries                → snake_case na URL
GET  /api/moodEntry                   → singular + camelCase
POST /api/mood-entries/create         → verbo na URL
GET  /api/users/456/mood-entries/789/reactions/012   → 3 níveis de nesting (máx 2)
DELETE /api/mood-entries/123  → 200 { success: true }   → formato inconsistente, deveria ser 204
GET  /api/mood-entries?page=5&pageSize=20            → offset pagination (use cursor)
```

## Referências

- [HTTP Status Codes — MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [REST API Design Best Practices](https://restfulapi.net/)
- [JSON:API Specification](https://jsonapi.org/)
- Architect `api-spec.md` em `artifacts/03-architecture/`
