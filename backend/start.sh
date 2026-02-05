#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

echo "Resetting database (ONE TIME ONLY - remove after first deploy)..."
npx prisma migrate reset --force --schema=./prisma/schema.prisma

echo "Database reset complete with seed."

echo "Starting NestJS application..."
exec node dist/src/main.js
