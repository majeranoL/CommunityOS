#!/bin/sh
set -e

echo "==> Running database migrations..."
npx prisma migrate deploy

if [ "$SEED_DB" = "true" ]; then
  echo "==> Seeding database (SEED_DB=true)..."
  npm run seed
fi

echo "==> Starting CommunityOS backend..."
exec node dist/src/main.js
