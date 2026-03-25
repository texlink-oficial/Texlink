# Skill: infra-patterns

## Propósito

Padrões de infraestrutura: containerização, IaC, ambientes, deploy strategies, scaling e cost management. Garante infra reprodutível, segura e economicamente viável.

## Quando consultar

- Ao configurar CI/CD e infra (devops)
- Ao definir requisitos de hosting e escalabilidade (architect)
- Ao revisar configurações de infra (security-analyst)

## Regras

### Containerização

1. **Multi-stage build:** Dockerfile com stage de build separado do runtime. Imagem final sem devDependencies, sem source maps.
2. **Imagem base mínima:** `node:22-alpine` ou `python:3.12-slim`. Nunca `ubuntu` ou `node:latest` para produção.
3. **Non-root user:** container roda como usuário não-root. `USER node` ou `USER appuser`.
4. **Health check no Dockerfile:** `HEALTHCHECK CMD curl -f http://localhost:3000/health || exit 1`.
5. **`.dockerignore` obrigatório:** exclua `node_modules`, `.git`, `.env`, `*.md`, `tests/`.
6. **Pinne versões:** base image com digest ou tag específica. Nunca `:latest` em produção.

### Infrastructure as Code (IaC)

7. **Tudo como código:** nenhum recurso criado manualmente no console. Terraform, Pulumi ou CDK.
8. **State remoto:** terraform state em bucket com locking (S3 + DynamoDB, GCS + lock).
9. **Módulos reutilizáveis:** infra common (VPC, DNS, SSL) como módulos. Ambientes como composições.
10. **Plan antes de apply:** todo `terraform apply` precedido por `plan` revisado. Em CI: plan no PR, apply após merge.
11. **Sem secrets no IaC:** use referência a secret manager (AWS Secrets Manager, GCP Secret Manager, Vault).

### Ambientes

12. **Três ambientes mínimos:** development (local), staging (replica de prod), production.
13. **Paridade staging-prod:** mesmo banco (versão), mesma infra (tamanho menor), mesmos env vars (valores diferentes).
14. **Env vars documentadas:** `.env.example` com todas as variáveis, tipo, obrigatoriedade e descrição.
15. **Sem dados de prod em staging:** use seeds ou dados anonimizados.

### Deploy strategies

16. **Rolling update (padrão):** novas instâncias sobem antes de derrubar as antigas. Zero downtime.
17. **Blue-green:** para mudanças de breaking change ou migration. Switch de tráfego instantâneo.
18. **Canary:** para features com risco. 5% do tráfego → valida métricas → 25% → 50% → 100%.
19. **Rollback em < 5min:** toda estratégia de deploy deve permitir rollback rápido. Teste o rollback.
20. **Database migrations separadas:** execute migrations ANTES do deploy de código. Backward-compatible.

### Scaling

21. **Horizontal primeiro:** scale out (mais instâncias) antes de scale up (instância maior).
22. **Auto-scaling baseado em métrica:** CPU > 70% ou request queue > threshold → scale up. Cooldown de 5min.
23. **Connection pooling:** banco com pool de conexões (PgBouncer, ProxySQL). Nunca conexão direta por request.
24. **CDN para assets:** CSS, JS, imagens servidos via CDN. Cache com hash no filename.
25. **Rate limiting por camada:** API gateway / load balancer + application level.

### Cost management

26. **Budget alerts:** alarme em 50%, 80% e 100% do budget mensal.
27. **Right-sizing:** revise tamanho de instâncias mensalmente. Dados de utilização > 2 semanas antes de reduzir.
28. **Spot/preemptible para non-critical:** workers de background, CI runners. Não para API principal.
29. **Recursos efêmeros:** ambientes de review (PR-based) são destruídos após merge.
30. **Tag tudo:** todo recurso cloud com tags: `project`, `environment`, `team`, `cost-center`.

## Exemplos

### ✅ Correto
```dockerfile
# Multi-stage build
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml — ambiente local completo
services:
  app:
    build: .
    ports: ["3000:3000"]
    env_file: .env
    depends_on:
      db: { condition: service_healthy }
      redis: { condition: service_started }

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app_dev
      POSTGRES_USER: app
      POSTGRES_PASSWORD: localdev
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

volumes:
  pgdata:
```

### ❌ Incorreto
```dockerfile
# Imagem enorme, roda como root, sem health check
FROM ubuntu:latest
RUN apt-get update && apt-get install -y nodejs npm
COPY . /app
WORKDIR /app
RUN npm install
# 😱 ubuntu (300MB+ vs alpine 50MB), latest, root, devDeps incluídas
# 😱 Sem multi-stage, sem .dockerignore, sem HEALTHCHECK
CMD ["npm", "start"]
```

## Referências

- [Docker Best Practices](https://docs.docker.com/develop/develop-images/guidelines/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [12-Factor App](https://12factor.net/)
- Skill `security-checklist.md` — hardening de infra
