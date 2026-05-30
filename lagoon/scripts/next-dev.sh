#!/bin/sh
set -eu

cd /app

export HOME=/tmp
export XDG_CACHE_HOME=/tmp/.cache
mkdir -p "$XDG_CACHE_HOME"

if [ ! -d /app/node_modules/next ] || [ ! -d /app/node_modules/@prisma/client ]; then
  npm ci
fi

npx prisma generate
npx prisma migrate deploy
npm run db:import-json
exec npm run dev -- --hostname 0.0.0.0 --port 3000