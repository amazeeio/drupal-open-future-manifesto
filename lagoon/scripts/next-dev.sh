#!/bin/sh
set -eu

cd /app

export HOME=/tmp
export XDG_CACHE_HOME=/tmp/.cache
mkdir -p "$XDG_CACHE_HOME"

if [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_USERNAME:-}" ] && [ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${POSTGRES_DATABASE:-}" ]; then
  export DATABASE_URL="$(node <<'EOF'
const { POSTGRES_HOST, POSTGRES_USERNAME, POSTGRES_PASSWORD, POSTGRES_DATABASE } = process.env;

const connectionString = new URL(`postgresql://${POSTGRES_HOST}/${POSTGRES_DATABASE}`);
connectionString.username = POSTGRES_USERNAME;
connectionString.password = POSTGRES_PASSWORD;
connectionString.searchParams.set("schema", "public");

process.stdout.write(connectionString.toString());
EOF
)"
fi

if [ ! -d /app/node_modules/next ] || [ ! -d /app/node_modules/@prisma/client ]; then
  npm ci
fi

npx prisma generate
npx prisma migrate deploy
npm run db:import-json
exec npm run dev -- --hostname 0.0.0.0 --port 3000