import crypto from "crypto";

// AES-256-GCM symmetric encryption for secrets at rest (social credentials,
// OAuth tokens). The key lives only in CONNECTIONS_ENC_KEY (32 bytes, base64);
// the database only ever stores ciphertext. Output format is
// base64(iv | ciphertext | authTag).

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // GCM standard nonce length
const TAG_BYTES = 16;

/** Returns the 32-byte key, or null when not configured / invalid. */
function maybeKey(): Buffer | null {
  const b64 = process.env.CONNECTIONS_ENC_KEY;
  if (!b64) return null;
  try {
    const key = Buffer.from(b64, "base64");
    return key.length === 32 ? key : null;
  } catch {
    return null;
  }
}

export function isEncryptionConfigured(): boolean {
  return maybeKey() !== null;
}

export function encryptSecret(plaintext: string): string {
  const key = maybeKey();
  if (!key) throw new Error("CONNECTIONS_ENC_KEY is not configured (need a 32-byte base64 key).");
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, ct, tag]).toString("base64");
}

export function decryptSecret(blob: string): string {
  const key = maybeKey();
  if (!key) throw new Error("CONNECTIONS_ENC_KEY is not configured (need a 32-byte base64 key).");
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, IV_BYTES);
  const tag = buf.subarray(buf.length - TAG_BYTES);
  const ct = buf.subarray(IV_BYTES, buf.length - TAG_BYTES);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

/** Encrypt only when there's a value; returns null for empty/undefined input. */
export function encryptMaybe(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;
  return encryptSecret(plaintext);
}

/** Decrypt only when there's a value; returns "" for empty/undefined input. */
export function decryptMaybe(blob: string | null | undefined): string {
  if (blob == null || blob === "") return "";
  return decryptSecret(blob);
}
