# Skill: handoff-protocol

## Propósito

Define o formato e regras do handoff.yaml — o contrato entre agentes.

## Quando consultar

Sempre que um agente conclui sua fase e precisa passar o trabalho adiante.

## Formato obrigatório

```yaml
handoff:
  from: [nome-do-agente]
  to:
    - [agente-destino-1]
    - [agente-destino-2]
  date: YYYY-MM-DD

summary: |
  [Resumo do que foi feito. 3-5 linhas.
   Inclua: quantidade de artefatos, cobertura de user stories,
   decisões principais, desvios do plano original.]

deliverables:
  - path: artifacts/XX-nome/arquivo.md
    description: "[O que contém e para quem é útil]"
  - path: artifacts/XX-nome/outro-arquivo.md
    description: "[...]"

key_decisions:
  - "[Decisão e motivação — ex: 'Bottom nav com 5 itens para reduzir carga cognitiva']"

risks:
  - "[Risco identificado — ex: 'Emotion picker precisa de ilustrações custom']"

next_steps:
  - "[agente-destino]: [ação esperada — ex: 'architect: definir API baseada nos user flows']"
```

## Campos opcionais (quando aplicável)

```yaml
blockers:
  - "[Bloqueio que impede progresso do próximo agente]"

metrics:
  files_created: N
  files_modified: N
  tests_passing: N
  coverage: "XX%"
  build_status: "pass | fail"
  user_stories_covered: "XX/YY"

epics:
  - id: E01
    name: "[nome]"
    stories: N
    status: "[complete | partial | pending]"
```

## Regras

1. Todo handoff DEVE ter: from, to, date, summary, deliverables, next_steps.
2. Cada deliverable DEVE ter path e description.
3. Cada path DEVE apontar para arquivo que realmente existe.
4. O summary deve ser específico (números, IDs) e não genérico.
5. next_steps deve dizer o que cada agente destino deve FAZER, não apenas "review".
6. Se houver bloqueios, eles devem ser listados em blockers.
7. key_decisions documenta PORQUÊ algo foi feito de certo jeito (para o próximo agente entender).

## Exemplo completo (do product-strategist)

```yaml
handoff:
  from: product-strategist
  to:
    - ux-designer
    - architect
  date: 2026-03-14

summary: |
  Discovery completo para moodZ. Produzidos 8 artefatos cobrindo:
  JTBD (4 segmentos, 7 jobs), VPC com fit forte, 4 personas,
  visão com MoSCoW, 50 user stories em 11 épicos, 101 requisitos EARS,
  sizing de 77-108 dev-days, glossário com 60+ termos.

deliverables:
  - path: artifacts/01-discovery/jtbd.md
    description: "Jobs To Be Done: 4 segmentos, 7 jobs, 14 pains, 14 gains"
  - path: artifacts/01-discovery/personas.md
    description: "4 personas: Luna (ADHD), Rafael (fibro), Camila (mod), Dr. Thiago (admin)"
  - path: artifacts/01-discovery/user-stories.md
    description: "50 user stories (US-001 a US-050) com acceptance criteria"

key_decisions:
  - "Gamificação compassiva: streaks com grace period de 1 dia, sem punição"
  - "AI companion limitado a auto-reflexão: sem diagnóstico, terapia ou conselho médico"
  - "Reações de empatia (Heart, Hug, Me Too, Strength, Grateful) em vez de like/dislike"

risks:
  - "Conteúdo de crise exige detecção robusta e resposta imediata"
  - "Cold start da comunidade — precisa de estratégia de seed content"

next_steps:
  - "ux-designer: Criar sitemap, user flows e wireframes baseados nas 4 personas e 50 user stories"
  - "architect: Definir tech stack, data model e API spec baseados nos 101 requisitos"
```

## Anti-patterns (NÃO faça)

- ❌ Summary vago: "Completei a fase de discovery"
- ❌ Deliverables sem path: "Criei vários documentos de design"
- ❌ next_steps genérico: "O próximo agente deve continuar o trabalho"
- ❌ Handoff sem key_decisions: o próximo agente não sabe POR QUE algo foi feito
- ❌ Handoff sem risks: o próximo agente é pego de surpresa
