#!/bin/bash
set -e

echo "============================================"
echo "  Neo FMC On-Premises Setup"
echo "============================================"

command_exists() { command -v "$1" &>/dev/null; }

if ! command_exists docker; then
  echo "ERROR: Docker is not installed. Please install Docker first."
  echo "  https://docs.docker.com/get-docker/"
  exit 1
fi

if ! command_exists docker-compose && ! docker compose version &>/dev/null 2>&1; then
  echo "ERROR: Docker Compose is not installed."
  exit 1
fi

if [ ! -f ".env" ]; then
  echo ""
  echo "No .env file found. Creating from .env.example..."
  cp .env.example .env

  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
  WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  PGPASSWORD=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")

  sed -i "s|change_this_strong_password|$PGPASSWORD|g" .env
  sed -i "s|generate_with.*JWT.*|$JWT_SECRET|" .env
  sed -i "s|generate_with.*WEBHOOK.*|$WEBHOOK_SECRET|" .env

  echo ""
  echo "Generated secrets and saved to .env"
  echo "Please review and update ALLOWED_ORIGINS and SMTP settings if needed."
  echo ""
fi

echo ""
echo "Building and starting all services..."
docker compose up -d --build

echo ""
echo "Waiting for services to be healthy..."
sleep 10

echo ""
echo "Running database schema setup..."
docker compose exec api node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT 1').then(() => { console.log('Database connected'); pool.end(); }).catch(e => { console.error(e); process.exit(1); });
"

echo ""
echo "============================================"
echo "  Neo FMC is running!"
echo "  Frontend: http://localhost"
echo "  API:      http://localhost/api"
echo "  Database: localhost:5432"
echo "============================================"
