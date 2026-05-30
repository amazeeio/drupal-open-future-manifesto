#!/bin/sh
set -eu

cd /app
npx prisma migrate deploy
npm run db:import-json
exec npm run start -- --hostname 0.0.0.0 --port 3000