import crypto from "crypto";

function normaliseSignature(raw?: string | null) {
  if (!raw) return null;
  const value = String(raw);
  const [, hash] = value.split("=");
  return hash ? hash.trim() : value.trim();
}

export function computeHmac(body: unknown, secret: string) {
  const payload =
    typeof body === "string" ? body : JSON.stringify(body ?? {});
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyHmacSignature(
  received: string | null | undefined,
  body: unknown,
  secret: string
) {
  const expected = computeHmac(body, secret);
  const candidate = normaliseSignature(received);
  if (!candidate) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(candidate, "hex"),
      Buffer.from(expected, "hex")
    );
  } catch {
    return candidate === expected;
  }
}
