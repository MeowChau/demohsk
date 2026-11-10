import { randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_NONCE_COOKIE = "hsk_google_nonce";
export const GOOGLE_NONCE_MAX_AGE = 600;

export function googleClientId() {
  const value = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  return /^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(value) ? value : "";
}

export const createGoogleNonce = () => randomBytes(32).toString("base64url");

// Only checks the browser challenge here. The existing backend verifies Google's
// signature, issuer, audience and expiry before checking admin approval.
export function matchesGoogleNonce(idToken: unknown, expected: string | undefined): idToken is string {
  if (typeof idToken !== "string" || idToken.length > 16384 || !expected || !/^[\w-]{43}$/.test(expected)) return false;
  const parts = idToken.split(".");
  if (parts.length !== 3 || !parts.every(part => /^[\w-]+$/.test(part))) return false;
  try {
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString("utf8")) as { nonce?: unknown };
    if (typeof payload?.nonce !== "string") return false;
    const actual = Buffer.from(payload.nonce);
    const nonce = Buffer.from(expected);
    return actual.length === nonce.length && timingSafeEqual(actual, nonce);
  } catch { return false; }
}
