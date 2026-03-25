# Skill: documentation-standards

## Propósito

Padrões de escrita de documentação técnica: estilo, estrutura, tom, formatação e manutenção. Garante docs claras, navegáveis e úteis para quem não participou do projeto.

## Quando consultar

- Ao escrever README, guias e API docs (tech-writer)
- Ao documentar ADRs e arquitetura (architect)
- Ao escrever inline comments ou docstrings (todos os devs)

## Regras

### Princípios

1. **Escreva para quem não sabe.** O leitor não participou do projeto. Não assuma contexto.
2. **Docs como código:** versionadas no repo, revisadas em PR, testadas (links válidos, comandos funcionam).
3. **Single source of truth:** cada informação existe em um lugar só. Use links, nunca copie.
4. **Mantenha atualizado:** doc desatualizada é pior que nenhuma doc. Revise ao mudar funcionalidade.

### Estrutura

5. **Pirâmide invertida:** conclusão/ação primeiro, detalhes depois. O leitor pode parar a qualquer momento e já ter valor.
6. **Títulos descritivos:** "How to configure authentication" > "Authentication" > "Auth".
7. **Índice (TOC):** obrigatório em docs com mais de 3 seções.
8. **Seções curtas:** máximo 3-4 parágrafos por seção. Se maior, quebre em sub-seções.
9. **Progressive disclosure:** comece simples (Quick Start), aprofunde gradualmente (Configuration, Advanced).

### Estilo

10. **Voz ativa:** "Run the command" > "The command should be run".
11. **Frases curtas:** máximo 25 palavras por frase. Se maior, quebre em duas.
12. **Sem jargão desnecessário:** se usar termo técnico, defina na primeira ocorrência ou linke para glossário.
13. **Consistência terminológica:** escolha um termo e use-o sempre. "endpoint" OU "rota", nunca ambos para o mesmo conceito.
14. **Tom:** profissional mas acessível. Não acadêmico, não casual demais.

### Formatação

15. **Code blocks com linguagem:** ` ```typescript `, nunca ` ``` ` sem tipo.
16. **Comandos copiáveis:** todo comando em code block próprio. Sem `$` prefix (dificulta copy-paste).
17. **Tabelas para comparações:** quando há 3+ itens com 2+ atributos, use tabela.
18. **Listas para passos:** numerada para sequências, bullets para itens sem ordem.
19. **Admonitions:** use para avisos importantes: `> ⚠️ **Warning:** ...` ou `> 💡 **Tip:** ...`.
20. **Diagramas em Mermaid:** renderizável no GitHub. Alternativa: ASCII art para diagramas simples.

### Tipos de documento

21. **README:** visão geral, tech stack, quick start (< 5 comandos), estrutura, links.
22. **Setup guide:** pré-requisitos, instalação passo a passo, verificação, troubleshooting.
23. **API docs:** endpoint, method, auth, params, request/response examples, error codes.
24. **Architecture overview:** diagrama de alto nível, componentes, fluxo de dados, decisões-chave.
25. **Contributing guide:** branch workflow, commit conventions, PR template, code review process.
26. **ADR:** Context → Decision → Consequences → Alternatives. Uma decisão por ADR.
27. **Changelog:** Baseado em commits. Agrupado por versão. Categorias: Added, Changed, Fixed, Removed.

### Manutenção

28. **Verificação de links:** automatizar check de links quebrados no CI.
29. **Revisão trimestral:** docs revisadas a cada 3 meses ou a cada release major.
30. **Ownership:** cada doc tem um owner (agente ou pessoa) responsável por mantê-la atualizada.

## Exemplos

### ✅ Correto
```markdown
## Configure authentication

The app uses JWT-based authentication. You need a valid token for all protected endpoints.

### Get a token

1. Create an account via the registration endpoint
2. Login to receive your access and refresh tokens
3. Include the access token in all requests

​```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "your-password"}'
​```

Response:

​```json
{
  "data": {
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "expiresIn": 900
  }
}
​```

> ⚠️ **Warning:** Access tokens expire in 15 minutes. Use the refresh token to get a new one.

### Use the token

Include it in the `Authorization` header:

​```bash
curl http://localhost:3000/api/mood-entries \
  -H "Authorization: Bearer eyJhbG..."
​```
```

### ❌ Incorreto
```markdown
## Auth

Use JWT. Call the login endpoint to get a token and then use it.

$ curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email": "user@example.com", "password": "your-password"}'

This returns a token. Use it in your requests. The token expires after some time,
you'll need to refresh it. See the code for more details.

# Problemas:
# 😱 Título vago ("Auth")
# 😱 Sem code block para comando
# 😱 $ prefix (dificulta copy-paste)
# 😱 Sem exemplo de response
# 😱 "some time" — quanto tempo?
# 😱 "See the code" — doc deve ser auto-suficiente
```

## Referências

- [Google Developer Documentation Style Guide](https://developers.google.com/style)
- [Write the Docs — Documentation Guide](https://www.writethedocs.org/guide/)
- [Diátaxis Framework](https://diataxis.fr/) (tutorials, how-to, reference, explanation)
- Skill `api-design.md` — formato de endpoints para documentação de API
