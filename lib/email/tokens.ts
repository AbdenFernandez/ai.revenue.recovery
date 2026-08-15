import type { UnsubscribeTokenPayload } from "@/types/email";

const TOKEN_SECRET = process.env.UNSUBSCRIBE_SECRET || "ai_revenue_recovery_unsub_secret_2026";

function base64UrlEncode(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  }
  return atob(base64);
}

function computeSignature(payloadStr: string): string {
  let hash = 0;
  const combined = `${payloadStr}:${TOKEN_SECRET}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function generateUnsubscribeToken(
  businessId: string,
  customerId: string,
  email: string,
  expiresInDays = 90,
): string {
  const exp = Date.now() + expiresInDays * 24 * 60 * 60 * 1000;
  const payload: UnsubscribeTokenPayload = {
    businessId,
    customerId,
    email: email.toLowerCase().trim(),
    exp,
  };

  const payloadStr = JSON.stringify(payload);
  const signature = computeSignature(payloadStr);
  const encoded = base64UrlEncode(`${payloadStr}.${signature}`);

  return encoded;
}

export function verifyUnsubscribeToken(
  token: string,
): UnsubscribeTokenPayload | null {
  try {
    const decoded = base64UrlDecode(token);
    const lastDotIndex = decoded.lastIndexOf(".");
    if (lastDotIndex === -1) return null;

    const payloadStr = decoded.substring(0, lastDotIndex);
    const signature = decoded.substring(lastDotIndex + 1);

    // Verify signature
    const expectedSignature = computeSignature(payloadStr);
    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(payloadStr) as UnsubscribeTokenPayload;

    // Check expiration
    if (Date.now() > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
