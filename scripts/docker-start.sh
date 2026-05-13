#!/bin/sh
set -e

echo "Running database migrations..."
cd /app
DATABASE_URL="$DATABASE_URL" node -e "
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);
migrate(db, { migrationsFolder: './lib/db/drizzle' }).then(() => {
  console.log('Migrations complete');
  pool.end();
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
" 2>/dev/null || echo "Skipping migration (drizzle folder not found, using push)"

echo "Starting Neo FMC API server..."
exec node artifacts/api-server/dist/index.cjs
