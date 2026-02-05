#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

echo "Resetting database (ONE TIME - schema sync)..."
npx prisma migrate reset --force --schema=./prisma/schema.prisma

echo "Database reset complete."

echo "Starting NestJS application..."
exec node dist/src/main.js
