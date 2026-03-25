# Skill: coding-standards

## Propósito

Convenções de código, lint, formatação e naming para todo código produzido pelo squad. Garante consistência entre frontend, backend, AI e data.

## Quando consultar

- Antes de escrever qualquer código novo
- Ao fazer code review
- Ao configurar linters e formatters
- Ao nomear variáveis, funções, arquivos ou diretórios

## Regras

### Naming

1. **Variáveis e funções:** `camelCase` — descritivas, sem abreviações crípticas.
2. **Classes e types/interfaces:** `PascalCase`.
3. **Constantes de ambiente e enums de valor fixo:** `UPPER_SNAKE_CASE`.
4. **Arquivos de componente (React):** `PascalCase.tsx` (ex: `MoodPicker.tsx`).
5. **Arquivos de módulo/util:** `camelCase.ts` (ex: `dateUtils.ts`).
6. **Diretórios:** `kebab-case` (ex: `user-profile/`).
7. **Tabelas de banco:** `snake_case`, plural (ex: `mood_entries`).
8. **Colunas de banco:** `snake_case`, singular (ex: `created_at`).
9. **API endpoints:** `kebab-case`, plural para coleções (ex: `/api/mood-entries`).
10. **Booleanos:** prefixo `is`, `has`, `can`, `should` (ex: `isActive`, `hasPermission`).

### Formatação

11. **Indentação:** 2 espaços (nunca tabs).
12. **Linha máxima:** 100 caracteres (exceção: URLs e strings longas).
13. **Ponto e vírgula:** obrigatório em TypeScript/JavaScript.
14. **Aspas:** single quotes (`'`) para strings, exceto em JSX (double quotes `"`).
15. **Trailing comma:** obrigatório em objetos e arrays multi-line.
16. **Linhas em branco:** 1 entre blocos lógicos, 0 dentro de funções curtas (< 5 linhas).

### Estrutura de código

17. **Imports:** organizados em 3 blocos — (1) externos, (2) internos, (3) relativos. Separados por linha em branco.
18. **Funções:** máximo 30 linhas de lógica. Se exceder, extraia subfunções.
19. **Arquivos:** máximo 300 linhas. Se exceder, divida em módulos.
20. **Componentes React:** máximo 200 linhas. Se exceder, extraia subcomponentes.
21. **Early return:** prefira retornos antecipados a `else` aninhado.
22. **Sem `any`:** proibido em TypeScript. Use `unknown` + type guard quando o tipo é incerto.
23. **Sem `!important`:** proibido em CSS/Tailwind (exceção: `prefers-reduced-motion` override).
24. **Sem magic numbers:** extraia para constante nomeada.
25. **Sem console.log em produção:** use logger estruturado.

### Lint e ferramentas

26. **ESLint:** configuração estrita com regras de acessibilidade (`eslint-plugin-jsx-a11y`).
27. **Prettier:** formatação automática (integrado ao ESLint).
28. **TypeScript:** `strict: true` no `tsconfig.json`.
29. **Husky + lint-staged:** lint automático em pre-commit.
30. **EditorConfig:** configurado na raiz para consistência entre editores.

## Exemplos

### ✅ Correto
```typescript
// Imports organizados
import { useState, useCallback } from 'react';

import { MoodEntry } from '@/types/mood';
import { useMoodEntries } from '@/hooks/useMoodEntries';

import { MoodIcon } from './MoodIcon';

// Naming descritivo, early return, tipagem
function calculateStreakDays(entries: MoodEntry[]): number {
  if (entries.length === 0) {
    return 0;
  }

  const MAX_GAP_DAYS = 1;
  let streakCount = 1;

  for (let i = 1; i < entries.length; i++) {
    const daysBetween = getDaysDifference(entries[i - 1].date, entries[i].date);

    if (daysBetween > MAX_GAP_DAYS) {
      break;
    }
    streakCount++;
  }

  return streakCount;
}
```

### ❌ Incorreto
```typescript
// Imports bagunçados, sem organização
import { MoodIcon } from './MoodIcon'
import { useState } from 'react'
import { useMoodEntries } from '@/hooks/useMoodEntries'
import { MoodEntry } from '@/types/mood'

// Naming ruim, any, magic number, console.log, else aninhado
function calc(e: any[]): any {
  if (e.length > 0) {
    let s = 1
    for (let i = 1; i < e.length; i++) {
      if (getDaysDifference(e[i-1].date, e[i].date) <= 1) {
        s++
      } else {
        console.log("streak broke")
        break
      }
    }
    return s
  } else {
    return 0
  }
}
// Problemas: any, abreviações, magic number 1, console.log, else desnecessário, sem ponto e vírgula
```

## Referências

- [TypeScript Handbook — Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- Architect ADRs em `artifacts/03-architecture/adrs/`
