# Skill: database-patterns

## Propósito

Convenções de banco de dados: naming, indexes, migrations, soft delete, audit fields e multi-tenancy. Garante schema consistente, performático e auditável.

## Quando consultar

- Ao modelar dados (architect)
- Ao criar migrations e seeds (data-engineer)
- Ao escrever queries e repositories (backend-dev)
- Ao revisar schema ou queries (code-reviewer)

## Regras

### Naming

1. **Tabelas:** `snake_case`, plural (ex: `mood_entries`, `user_profiles`).
2. **Colunas:** `snake_case`, singular (ex: `created_at`, `mood_level`).
3. **Primary key:** sempre `id` (UUID v7 preferido, ou auto-increment).
4. **Foreign key:** `<tabela_singular>_id` (ex: `user_id`, `mood_entry_id`).
5. **Tabela de junção (N:N):** `<tabela1>_<tabela2>` em ordem alfabética (ex: `tags_users`).
6. **Indexes:** `idx_<tabela>_<colunas>` (ex: `idx_mood_entries_user_id_created_at`).
7. **Unique constraints:** `uq_<tabela>_<colunas>` (ex: `uq_users_email`).
8. **Enums:** definir como tipo no banco ou tabela de lookup. Nunca string livre para valores finitos.

### Campos obrigatórios

9. **Toda tabela:** `id`, `created_at`, `updated_at`.
10. **Soft delete (quando aplicável):** `deleted_at` (nullable timestamp). Nunca delete físico em dados de usuário.
11. **Audit fields (quando NFR exige):** `created_by`, `updated_by` (FK para users).
12. **Versionamento (quando concorrência):** `version` (integer) para optimistic locking.

### Migrations

13. **Nomenclatura:** `YYYYMMDDHHMMSS_descricao_da_mudanca` (ex: `20260315120000_create_mood_entries`).
14. **Reversibilidade:** toda migration tem `up` e `down`. Sem exceção.
15. **Atômica:** uma migration, uma mudança lógica. Não misture criação de tabela com seed.
16. **Imutável:** nunca altere uma migration já aplicada. Crie uma nova.
17. **Sem dados em migration:** use seeds para dados. Migration é schema apenas.
18. **Ordem de criação:** tabelas sem FK primeiro → tabelas com FK → indexes → views → triggers.

### Indexes

19. **Toda FK tem index.** Sem exceção — JOINs sem index são bombs.
20. **Index composto:** coluna mais seletiva primeiro (ex: `(user_id, created_at)` e não `(created_at, user_id)`).
21. **Não indexe colunas de baixa cardinalidade** (boolean, status com 3 valores) — exceto se query pattern exige.
22. **Partial index:** use para queries filtradas (ex: `WHERE deleted_at IS NULL`).
23. **Documente o pattern de query** que justifica cada index no `index-strategy.md`.

### Queries

24. **Nunca `SELECT *`.** Sempre especifique colunas.
25. **Paginação obrigatória** em queries que podem retornar > 100 registros.
26. **Cursor-based pagination** (keyset) para listas ordenadas por tempo.
27. **Previna N+1:** use JOINs ou batch loading (DataLoader pattern).
28. **Transactions:** para operações que modificam múltiplas tabelas.
29. **Timeout de query:** configure no connection pool (default: 5s).

### Multi-tenancy (quando aplicável)

30. **Row-level:** coluna `tenant_id` + RLS (Row Level Security) no banco.
31. **Toda query filtrada por `tenant_id`** — use middleware ou repository base.
32. **Index em `tenant_id`** em toda tabela multi-tenant.

### Dados sensíveis

33. **PII marcado:** colunas com dados pessoais devem ter comentário `[PII]` no data-dictionary.
34. **Encryption at rest:** para campos sensíveis (ex: `encrypted_note`, com chave em env var).
35. **Direito ao esquecimento (LGPD):** soft delete + anonymization. Documentar processo.

## Exemplos

### ✅ Correto
```sql
-- Migration: create table
CREATE TABLE mood_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood          VARCHAR(50) NOT NULL,
  intensity     SMALLINT NOT NULL CHECK (intensity BETWEEN 1 AND 10),
  note          TEXT,
  is_private    BOOLEAN NOT NULL DEFAULT true,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes com naming e justificativa
CREATE INDEX idx_mood_entries_user_id_created_at
  ON mood_entries (user_id, created_at DESC)
  WHERE deleted_at IS NULL;
-- Pattern: "listar mood entries de um usuário, ordenadas por data recente"

-- Query com campos explícitos, paginação cursor
SELECT id, mood, intensity, note, created_at
FROM mood_entries
WHERE user_id = $1
  AND deleted_at IS NULL
  AND created_at < $2  -- cursor
ORDER BY created_at DESC
LIMIT 21;  -- limit + 1 para saber se hasMore
```

### ❌ Incorreto
```sql
-- Naming errado
CREATE TABLE MoodEntry (         -- PascalCase, singular
  ID SERIAL PRIMARY KEY,         -- maiúscula
  UserID INT,                    -- camelCase
  moodLevel VARCHAR(255),        -- sem check, 255 é exagerado
  created TIMESTAMP              -- falta updated_at, deleted_at
);
-- Sem FK constraint, sem index, sem ON DELETE

-- Query perigosa
SELECT * FROM mood_entries;                    -- SELECT *, sem WHERE, sem LIMIT
SELECT * FROM mood_entries WHERE is_private = false;  -- index em boolean sem justificativa
```

## Referências

- [PostgreSQL Naming Conventions](https://www.postgresql.org/docs/current/sql-syntax-lexical.html)
- [Use The Index, Luke — SQL Indexing](https://use-the-index-luke.com/)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- Architect `data-model.md` em `artifacts/03-architecture/`
