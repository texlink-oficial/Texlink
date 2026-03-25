# Skill: git-workflow

## Propósito

Branching strategy, conventional commits, regras de PR e merge strategy. Garante histórico limpo, rastreável e colaboração sem conflitos.

## Quando consultar

- Antes de criar uma branch
- Antes de commitar
- Antes de abrir ou revisar um PR
- Ao resolver conflitos de merge

## Regras

### Branching strategy (GitHub Flow simplificado)

1. **`main`:** Branch de produção. Sempre deployável. Nunca commite direto.
2. **Feature branches:** `feat/[ID]-descricao-curta` (ex: `feat/US-012-mood-picker`).
3. **Bug fix branches:** `fix/[ID]-descricao-curta` (ex: `fix/BUG-003-streak-reset`).
4. **Hotfix branches:** `hotfix/descricao-curta` — para correções urgentes em produção.
5. **Chore branches:** `chore/descricao` — para configs, deps, CI (ex: `chore/update-eslint`).
6. **Uma branch por feature/fix.** Nunca misture múltiplas features em uma branch.
7. **Branch de vida curta:** Merge em < 3 dias. Se a feature é grande, quebre em incrementos.

### Conventional Commits

8. **Formato:** `tipo(escopo): descrição` — tudo em minúscula, sem ponto final.
9. **Tipos permitidos:**
   - `feat` — nova funcionalidade
   - `fix` — correção de bug
   - `refactor` — refatoração sem mudança de comportamento
   - `test` — adição ou correção de testes
   - `docs` — documentação
   - `style` — formatação (sem mudança de lógica)
   - `chore` — tarefas de manutenção (deps, CI, configs)
   - `perf` — melhoria de performance
10. **Escopo:** módulo ou feature afetada (ex: `feat(mood-picker): add emotion intensity slider`).
11. **Descrição:** imperativo, em inglês, máximo 72 caracteres (ex: `add`, `fix`, `remove`, não `added`, `fixes`).
12. **Body (opcional):** explica o porquê, não o quê. Separado por linha em branco.
13. **Breaking changes:** prefixo `!` antes de `:` (ex: `feat(api)!: change pagination to cursor-based`).
14. **Referência de issue:** rodapé `Refs: US-012` ou `Closes: BUG-003`.

### Pull Requests

15. **Título:** segue formato de conventional commit (ex: `feat(mood-picker): add emotion intensity slider`).
16. **Descrição:** template com: O que mudou, Por quê, Como testar, Screenshots (se UI).
17. **Tamanho:** máximo ~400 linhas de diff. Se maior, quebre em PRs menores.
18. **Review obrigatório:** mínimo 1 aprovação antes de merge.
19. **CI verde:** todos os checks devem passar (lint, test, build) antes de merge.
20. **Sem WIP no título:** se não está pronto, use Draft PR.
21. **Labels:** `feat`, `fix`, `breaking`, `needs-review`, `blocked`.

### Merge strategy

22. **Squash merge:** para feature branches (histórico limpo no main).
23. **Merge commit:** apenas para branches de release ou hotfix.
24. **Rebase:** permitido localmente para atualizar branch, proibido em branch compartilhada.
25. **Conflitos:** quem abre o PR resolve os conflitos, nunca o reviewer.
26. **Delete branch:** após merge, delete a branch (automático via GitHub settings).

### Proteções

27. **Branch protection em `main`:** requer PR, review, CI verde, sem force push.
28. **Sem commits diretos em `main`.** Sem exceção.
29. **Sem `--force` push** em branches compartilhadas.
30. **Sem `--no-verify`** para pular hooks. Se o hook falha, corrija o problema.

## Exemplos

### ✅ Correto
```bash
# Branch naming
git checkout -b feat/US-012-mood-picker

# Commits convencionais
git commit -m "feat(mood-picker): add emotion intensity slider"
git commit -m "fix(streak): reset counter after 2-day gap instead of 1"
git commit -m "test(mood-picker): add unit tests for intensity validation"
git commit -m "chore(deps): update vitest to 2.1.0"

# Commit com body e referência
git commit -m "feat(api): add cursor-based pagination to mood entries

Previous offset-based pagination caused performance issues on large datasets.
Cursor-based pagination provides consistent performance regardless of dataset size.

Refs: US-034, NFR-012"

# Breaking change
git commit -m "feat(api)!: change auth from session to JWT

BREAKING CHANGE: all clients must send Bearer token in Authorization header.

Refs: ADR-005"
```

### ❌ Incorreto
```bash
# Branch naming ruim
git checkout -b my-feature          # sem tipo, sem ID
git checkout -b feat/stuff          # sem descrição
git checkout -b feat/US-012-add-the-mood-picker-component-with-slider  # muito longo

# Commits ruins
git commit -m "fix stuff"           # vago, sem escopo
git commit -m "WIP"                 # WIP não é commit
git commit -m "feat: Added mood picker"  # passado, não imperativo
git commit -m "FEAT(MOOD): ADD PICKER"   # maiúscula
git commit -m "feat(mood-picker): add emotion intensity slider for the mood logging feature."  # ponto final, muito longo

# Merge perigoso
git push --force origin main        # NUNCA force push em main
git commit --no-verify              # NUNCA pular hooks
```

## Referências

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/)
- [GitHub Flow](https://docs.github.com/en/get-started/quickstart/github-flow)
- Skill `coding-standards.md` — naming de branches segue `kebab-case`
