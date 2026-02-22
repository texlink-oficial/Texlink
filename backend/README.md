# Texlink Backend API

NestJS-based backend API for the Texlink manufacturing partner management platform.

## Overview

This is the backend service for Texlink, built with NestJS. It provides REST APIs for order management, supplier relationships, and real-time WebSocket communication for chat functionality.

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript
- **Database**: PostgreSQL 16
- **ORM**: Prisma
- **Authentication**: JWT with Passport
- **Real-time**: Socket.IO
- **Validation**: Class Validator & Class Transformer
- **Testing**: Jest

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Database migrations
│   └── demo-seed.ts           # Demo data seeding
├── src/
│   ├── modules/               # Feature modules
│   │   ├── auth/             # Authentication & JWT
│   │   ├── companies/        # Company management
│   │   ├── suppliers/        # Supplier profiles
│   │   ├── credentials/      # Supplier credentialing
│   │   ├── integrations/     # External APIs
│   │   ├── orders/           # Order lifecycle
│   │   ├── payments/         # Payment tracking
│   │   ├── ratings/          # Rating system
│   │   ├── chat/             # Real-time messaging
│   │   ├── team/             # Team & permissions
│   │   └── reports/          # Analytics & reports
│   ├── common/               # Shared utilities
│   │   ├── guards/          # Auth & role guards
│   │   ├── decorators/      # Custom decorators
│   │   └── filters/         # Exception filters
│   ├── config/              # Configuration
│   ├── prisma/              # Prisma service
│   └── main.ts              # Application entry point
└── test/                     # E2E tests
```

## Prerequisites

- Node.js 18+
- PostgreSQL 16
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL="postgresql://texlink:YOUR_POSTGRES_PASSWORD@localhost:5432/texlink"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRATION="7d"

# API
PORT=3000
NODE_ENV=development

# External Integrations (Optional - for full functionality)

# CNPJ Validation
BRASIL_API_BASE_URL=https://brasilapi.com.br/api
RECEITAWS_BASE_URL=https://www.receitaws.com.br/v1
RECEITAWS_API_KEY=

# Email (SendGrid)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@texlink.com
SENDGRID_FROM_NAME=Texlink Platform

# WhatsApp/SMS (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_SMS_FROM=

# Credit Analysis (Future)
SERASA_API_URL=
SERASA_API_KEY=
SERASA_API_SECRET=
```

### 3. Start Database

Using Docker Compose (recommended):

```bash
# From project root
docker-compose up -d
```

Or use your own PostgreSQL instance.

### 4. Run Migrations

```bash
npx prisma migrate dev
```

This will:
- Create all database tables
- Apply any pending migrations
- Generate Prisma Client

### 5. Seed Database (Optional)

For development and demo purposes:

```bash
npx prisma db seed
```

Or use the demo seed:

```bash
npx tsx prisma/demo-seed.ts
```

### 6. Start Development Server

```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

## Available Scripts

### Development

```bash
# Start in development mode (with hot-reload)
npm run start:dev

# Start in debug mode
npm run start:debug

# View database with Prisma Studio
npx prisma studio
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

### Testing

```bash
# Run unit tests
npm run test

# Run unit tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e

# Generate test coverage report
npm run test:cov
```

### Database

```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations to production
npx prisma migrate deploy

# Reset database (caution: deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Code Quality

```bash
# Lint code
npm run lint

# Format code
npm run format
```

## API Documentation

### REST API

Once the server is running, API documentation is available at:

- Swagger UI: `http://localhost:3000/api`
- OpenAPI JSON: `http://localhost:3000/api-json`

### WebSocket API

WebSocket connections are available at:

- Chat namespace: `ws://localhost:3000/chat`

See [Real-time Chat Documentation](../docs/modules/realtime-chat.md) for details.

## Key Modules

### Authentication (`/auth`)

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/refresh` - Refresh JWT token
- `GET /auth/profile` - Get current user profile

### Orders (`/orders`)

- `GET /orders` - List orders with filters
- `POST /orders` - Create new order
- `GET /orders/:id` - Get order details
- `PATCH /orders/:id` - Update order
- `PATCH /orders/:id/status` - Update order status

### Credentials (`/credentials`)

Supplier credentialing system. See [Supplier Credentials Documentation](../docs/modules/supplier-credentials.md).

- `POST /credentials` - Create credential
- `GET /credentials` - List credentials
- `GET /credentials/:id` - Get credential details
- `PATCH /credentials/:id` - Update credential
- `POST /credentials/:id/validate` - Validate CNPJ
- `POST /credentials/:id/send-invitation` - Send invitation

### Chat (`/chat`)

WebSocket-based real-time messaging. See [Real-time Chat Documentation](../docs/modules/realtime-chat.md).

- Connect to `/chat` namespace
- Events: `join-order`, `send-message`, `typing`, etc.

## External Integrations

The backend integrates with several external services. See [Integrations Documentation](../docs/modules/integrations.md).

### CNPJ Validation

- Brasil API (primary)
- ReceitaWS (fallback)

### Notifications

- SendGrid for emails
- Twilio for WhatsApp/SMS

### Credit Analysis (Future)

- Serasa Experian
- Boa Vista SCPC

## Security

### Authentication

All protected routes require a valid JWT token in the Authorization header:

```
Authorization: Bearer <jwt-token>
```

### Guards

- `JwtAuthGuard` - Validates JWT token
- `RolesGuard` - Validates user role
- `PermissionsGuard` - Validates specific permissions
- `BrandGuard` - Validates access to brand resources
- `SupplierGuard` - Validates access to supplier resources

### Rate Limiting

Recommended for production (not included by default):

```bash
npm install @nestjs/throttler
```

## Performance

### Database Optimization

- Indexes are defined in Prisma schema
- Connection pooling configured
- Use `include` selectively to avoid over-fetching

### Caching

Redis caching is recommended for production:

```bash
npm install @nestjs/cache-manager cache-manager
npm install cache-manager-redis-store
```

## Monitoring

### Logging

Structured logs are output to console. For production, consider:

- Winston for advanced logging
- LogStash for log aggregation
- CloudWatch, Stackdriver, etc.

### Health Checks

```bash
GET /health
```

Returns service health status and database connectivity.

### Metrics

Consider adding:

- Prometheus metrics
- APM tools (New Relic, DataDog)
- Error tracking (Sentry)

## Deployment

### Environment Variables

Ensure all required environment variables are set in production:

- `DATABASE_URL` - Production database connection
- `JWT_SECRET` - Strong secret key (use secrets manager)
- `NODE_ENV=production`
- External API keys (if using integrations)

### Build and Deploy

```bash
# Build
npm run build

# Start
npm run start:prod
```

### Database Migrations

```bash
# Apply pending migrations
npx prisma migrate deploy
```

### Docker

A Dockerfile can be added for containerized deployment:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
CMD ["npm", "run", "start:prod"]
```

## Troubleshooting

### Database Connection Issues

1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Ensure database exists
4. Check network/firewall rules

### Migration Issues

```bash
# Check migration status
npx prisma migrate status

# Force reset (caution: data loss)
npx prisma migrate reset

# Generate client after schema changes
npx prisma generate
```

### Module Import Issues

```bash
# Clear cache and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### External API Issues

Check logs for detailed error messages. Verify:
- API keys are correct
- Services are not rate-limited
- Network connectivity
- Provider status pages

## Testing

### Unit Tests

```bash
npm run test
```

Tests are located alongside source files: `*.spec.ts`

### Integration Tests

```bash
npm run test:e2e
```

Tests are in `test/` directory: `*.e2e-spec.ts`

### Coverage

```bash
npm run test:cov
```

Aim for >80% coverage on business logic.

## Contributing

When adding new features:

1. Create a feature module in `src/modules/`
2. Define DTOs with validation
3. Implement service with business logic
4. Add guards for authentication/authorization
5. Write unit tests
6. Write e2e tests
7. Update Prisma schema if needed
8. Create migration
9. Document in `/docs/` if significant

## Support

For technical documentation, see:
- [Main Documentation](../docs/README.md)
- [Supplier Credentials](../docs/modules/supplier-credentials.md)
- [Integrations](../docs/modules/integrations.md)
- [Real-time Chat](../docs/modules/realtime-chat.md)

## License

Private and unlicensed. All rights reserved.

---

Built with [NestJS](https://nestjs.com/)
