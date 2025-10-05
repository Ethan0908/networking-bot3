import { NextRequest } from "next/server";

function firstHeaderValue(value: string | null) {
  if (!value) return null;
  const [first] = value.split(",");
  return first?.trim() || null;
}

function sanitizeHost(value: string | null) {
  const first = firstHeaderValue(value);
  if (!first) return null;
  return first.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

function resolveRequestOrigin(req: NextRequest) {
  const explicitEnv = process.env.APP_ORIGIN?.trim();
  if (explicitEnv) {
    try {
      return new URL(explicitEnv).origin;
    } catch {
      // fall through if the env var is malformed
    }
  }

  const forwardedHost = sanitizeHost(req.headers.get("x-forwarded-host"));
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const host =
    forwardedHost ||
    sanitizeHost(process.env.VERCEL_URL || null) ||
    sanitizeHost(req.headers.get("host"));
  if (!host) {
    return req.nextUrl.origin;
  }

  const normalizedProto = (() => {
    if (!forwardedProto) return host.includes("localhost") ? "http" : "https";
    const proto = forwardedProto.toLowerCase();
    return proto === "http" || proto === "https"
      ? proto
      : host.includes("localhost")
      ? "http"
      : "https";
  })();

  const origin = `${normalizedProto}://${host}`;
  try {
    return new URL(origin).origin;
  } catch {
    return req.nextUrl.origin;
  }
}

export function resolveRedirectUri(req: NextRequest) {
  const envRedirect = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (envRedirect) {
    try {
      return new URL(envRedirect).toString();
    } catch (error) {
      throw new Error(
        `Invalid GOOGLE_REDIRECT_URI: ${(error as Error).message}`
      );
    }
  }

  const origin = resolveRequestOrigin(req);
  return new URL("/api/oauth/google/callback", origin).toString();
}

export function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
