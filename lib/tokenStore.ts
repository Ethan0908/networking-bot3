import crypto from "crypto";

export type StoredTokenSet = {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  updatedAt: number;
};

const STORE_SYMBOL = Symbol.for("app.gmail.tokenStore");

const globalStore = (globalThis as any)[STORE_SYMBOL] as
  | Map<string, StoredTokenSet>
  | undefined;

const tokenStore: Map<string, StoredTokenSet> = globalStore ?? new Map();

if (!globalStore) {
  (globalThis as any)[STORE_SYMBOL] = tokenStore;
}

function encrypt(value: string, secret: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
  const enc = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(value: string, secret: Buffer) {
  const buffer = Buffer.from(value, "base64");
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const data = buffer.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", secret, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString("utf8");
}

function getSecret() {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("Missing APP_ENCRYPTION_KEY or AUTH_SECRET for token storage");
  }
  return crypto.createHash("sha256").update(secret).digest();
}

export function saveUserTokens(userId: string, data: {
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
}) {
  if (!userId) return;
  const secret = getSecret();
  const existing = tokenStore.get(userId);
  const next: StoredTokenSet = {
    accessToken: data.accessToken ? encrypt(data.accessToken, secret) : existing?.accessToken ?? null,
    refreshToken: data.refreshToken
      ? encrypt(data.refreshToken, secret)
      : existing?.refreshToken ?? null,
    expiresAt:
      typeof data.expiresAt === "number"
        ? data.expiresAt
        : existing?.expiresAt ?? null,
    updatedAt: Date.now(),
  };
  tokenStore.set(userId, next);
}

export function loadUserTokens(userId: string): StoredTokenSet | null {
  if (!userId) return null;
  const secret = getSecret();
  const stored = tokenStore.get(userId);
  if (!stored) return null;
  return {
    accessToken: stored.accessToken ? decrypt(stored.accessToken, secret) : null,
    refreshToken: stored.refreshToken ? decrypt(stored.refreshToken, secret) : null,
    expiresAt: stored.expiresAt ?? null,
    updatedAt: stored.updatedAt,
  };
}

export function clearUserTokens(userId: string) {
  if (!userId) return;
  tokenStore.delete(userId);
}
