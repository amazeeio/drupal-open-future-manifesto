#!/bin/sh
set -eu

cd /app

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

npx prisma migrate deploy
if [ "${LAGOON_ENVIRONMENT_TYPE:-}" != "production" ]; then
	npm run db:import-json
fi
exec npm run start -- --hostname 0.0.0.0 --port 3000