#!/bin/bash
set -e

if [ -z "$DATABASE_URL" ]; then
  if [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
    if [ -z "$DATABASE_URL" ] && [ -n "$PGUSER" ] && [ -n "$PGPASSWORD" ] && [ -n "$PGDATABASE" ]; then
      export DATABASE_URL="postgresql://$PGUSER:$PGPASSWORD@localhost:5432/$PGDATABASE"
    fi
  fi
fi

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set."
  echo "Set it in .env or export it before running this script."
  exit 1
fi

echo "Pushing database schema to: $DATABASE_URL"
cd lib/db && DATABASE_URL="$DATABASE_URL" pnpm exec drizzle-kit push --force
echo "Database schema applied successfully."
