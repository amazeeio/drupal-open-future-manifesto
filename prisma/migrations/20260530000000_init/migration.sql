CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "Signature" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Signature_createdAt_idx" ON "Signature"("createdAt");