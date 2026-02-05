#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma --url="$DATABASE_URL"

echo "Starting NestJS application..."
exec node dist/main.js
