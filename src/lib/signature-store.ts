import type { SignatureInput, SignatureRecord } from "./signature-schema";
import { prisma } from "./prisma";

function toSignatureRecord(signature: {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  createdAt: Date;
}): SignatureRecord {
  return {
    id: signature.id,
    name: signature.name,
    company: signature.company,
    role: signature.role,
    email: signature.email,
    createdAt: signature.createdAt.toISOString()
  };
}

export async function getSignatures(): Promise<SignatureRecord[]> {
  const signatures = await prisma.signature.findMany({
    orderBy: {
      createdAt: "desc"
    }
  });

  return signatures.map(toSignatureRecord);
}

export async function getSignatureCount(): Promise<number> {
  return prisma.signature.count();
}

export async function saveSignature(input: SignatureInput): Promise<{ signature: SignatureRecord; count: number }> {
  return prisma.$transaction(async (transaction) => {
    const signature = await transaction.signature.create({
      data: {
        name: input.name.trim(),
        company: input.company.trim(),
        role: input.role.trim(),
        email: input.email.trim().toLowerCase()
      }
    });

    const count = await transaction.signature.count();

    return {
      signature: toSignatureRecord(signature),
      count
    };
  });
}