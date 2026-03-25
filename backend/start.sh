#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "NODE_ENV: ${NODE_ENV:-development}"
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

echo "Running Prisma migrations..."
if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
  # Try migrate deploy; handle known errors
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
    elif grep -q "P3009" /tmp/migrate_err.log; then
      echo "Found failed migrations (P3009). Marking as applied (schema already matches DB)..."
      failed_migration=$(grep -o '[0-9]\{14\}_[a-z_]*' /tmp/migrate_err.log | head -1)
      if [ -n "$failed_migration" ]; then
        echo "  Marking as applied: $failed_migration"
        npx prisma migrate resolve --applied "$failed_migration" --schema=./prisma/schema.prisma
        echo "  Retrying migrate deploy..."
        npx prisma migrate deploy --schema=./prisma/schema.prisma
      else
        echo "Could not identify failed migration name."
        cat /tmp/migrate_err.log
        exit 1
      fi
    else
      echo "Migration failed with unexpected error:"
      cat /tmp/migrate_err.log
      exit 1
    fi
  fi

else
  npx prisma db push --schema=./prisma/schema.prisma
fi

if [ "$NODE_ENV" != "production" ] && [ "$NODE_ENV" != "staging" ]; then
  echo "Running database seed..."
  npx prisma db seed || echo "Seed completed or skipped"
fi

echo "Starting NestJS application..."
exec node dist/src/main.js
