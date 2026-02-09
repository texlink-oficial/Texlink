#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

echo "Running Prisma migrations..."
if [ "$NODE_ENV" = "production" ]; then
  # Try migrate deploy; if it fails with P3005 (non-empty schema), baseline first
  if ! npx prisma migrate deploy --schema=./prisma/schema.prisma >/tmp/migrate_err.log 2>&1; then
    if grep -q "P3005" /tmp/migrate_err.log; then
      echo "Database needs baselining (P3005). Marking existing migrations as applied..."
      for migration_dir in prisma/migrations/*/; do
        migration_name=$(basename "$migration_dir")
        if [ "$migration_name" != "migration_lock.toml" ]; then
          echo "  Resolving: $migration_name"
          npx prisma migrate resolve --applied "$migration_name" --schema=./prisma/schema.prisma
        fi
      done
      echo "Baseline complete."
    else
      echo "Migration failed with unexpected error:"
      cat /tmp/migrate_err.log
      exit 1
    fi
  fi

  # Always sync schema to ensure DB matches schema.prisma
  echo "Syncing database schema..."
  npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
else
  npx prisma db push --schema=./prisma/schema.prisma
fi

echo "Running database seed..."
npx prisma db seed || echo "Seed completed or skipped"

echo "Starting NestJS application..."
exec node dist/src/main.js
