#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

echo "Syncing database schema (ONE TIME - db push)..."
npx prisma db push --force-reset --schema=./prisma/schema.prisma --accept-data-loss

echo "Running database seed..."
npx prisma db seed || echo "Seed completed or skipped"

echo "Starting NestJS application..."
exec node dist/src/main.js
