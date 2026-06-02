import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { signatureSchema } from "@/lib/signature-schema";
import { saveSignature } from "@/lib/signature-store";

const requestBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

function buildResponse(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });

    return true;
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return false;
  }

  bucket.count += 1;
  return true;
}

function getClientKey(forwardedFor: string | null) {
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const clientKey = getClientKey(requestHeaders.get("x-forwarded-for"));

  if (!checkRateLimit(clientKey)) {
    return buildResponse({ error: "Too many submissions. Please wait a minute and try again." }, 429);
  }

  const payload = await request.json().catch(() => null);

  if (!payload) {
    return buildResponse({ error: "Invalid request body." }, 400);
  }

  const parsed = signatureSchema.safeParse(payload);

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message ?? "Invalid signature details.";
    return buildResponse({ error: firstIssue }, 400);
  }

  const { count, signature } = await saveSignature(parsed.data);

  return buildResponse(
    {
      message: "Thanks for signing the manifesto.",
      signature,
      signatureCount: count
    },
    201
  );
}