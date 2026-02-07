#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

echo "Running Prisma migrations..."
if [ "$NODE_ENV" = "production" ]; then
  npx prisma migrate deploy --schema=./prisma/schema.prisma
else
  npx prisma db push --schema=./prisma/schema.prisma
fi

echo "Running database seed..."
npx prisma db seed || echo "Seed completed or skipped"

echo "Starting NestJS application..."
exec node dist/src/main.js
