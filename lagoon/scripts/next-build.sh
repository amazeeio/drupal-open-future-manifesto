#!/bin/sh
set -eu

cd /app
npx prisma generate
npm run build