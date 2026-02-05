#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo "Running database seed..."
npx prisma db seed || echo "Seed completed or skipped"

echo "Starting NestJS application..."
exec node dist/src/main.js
