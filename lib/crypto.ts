import crypto from "node:crypto";

const DEVELOPMENT_SECRET = "local-development-secret-not-for-production";

function getKey(): Buffer {
  const secret = process.env.COOKIE_SECRET;
  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error(
      "COOKIE_SECRET must be configured with at least 32 characters in production.",
    );
  }

  return crypto.pbkdf2Sync(
    secret || DEVELOPMENT_SECRET,
    "copyparty-cookie-salt",
    100000,
    32,
    "sha256",
  );
}

export function encrypt(value: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, encrypted]);
  return payload.toString("base64");
}

export function decrypt(payloadB64: string): string | null {
  try {
    const key = getKey();
    const payload = Buffer.from(payloadB64, "base64");
    if (payload.byteLength < 29) return null;

    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const data = payload.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function generateCookieExpiration(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}
