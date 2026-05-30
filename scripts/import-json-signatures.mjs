import { readFile } from "node:fs/promises";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const legacyStorePath = path.join(process.cwd(), "data", "signatures.json");

function normalizeSignature(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const id = typeof entry.id === "string" ? entry.id : crypto.randomUUID();
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  const company = typeof entry.company === "string" ? entry.company.trim() : "";
  const role = typeof entry.role === "string" ? entry.role.trim() : "";
  const email = typeof entry.email === "string" ? entry.email.trim().toLowerCase() : "";
  const createdAt = entry.createdAt ? new Date(entry.createdAt) : new Date();

  if (!name || !company || !role || !email || Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return {
    id,
    name,
    company,
    role,
    email,
    createdAt
  };
}

try {
  const existingSignatures = await prisma.signature.count();

  if (existingSignatures > 0) {
    console.log("Signature table already contains data, skipping JSON import.");
    process.exit(0);
  }

  const legacyFile = await readFile(legacyStorePath, "utf8").catch(() => null);

  if (!legacyFile) {
    console.log("No legacy JSON signature store found, skipping import.");
    process.exit(0);
  }

  const parsed = JSON.parse(legacyFile);
  const signatures = Array.isArray(parsed) ? parsed.map(normalizeSignature).filter(Boolean) : [];

  if (signatures.length === 0) {
    console.log("Legacy JSON signature store is empty, skipping import.");
    process.exit(0);
  }

  await prisma.signature.createMany({
    data: signatures
  });

  console.log(`Imported ${signatures.length} signatures from the legacy JSON store.`);
} finally {
  await prisma.$disconnect();
}