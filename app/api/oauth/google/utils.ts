import { NextRequest } from "next/server";

function firstHeaderValue(value: string | null) {
  if (!value) return null;
  const [first] = value.split(",");
  return first?.trim() || null;
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

  const forwardedHost = firstHeaderValue(req.headers.get("x-forwarded-host"));
  const forwardedProto = firstHeaderValue(req.headers.get("x-forwarded-proto"));
  const host = forwardedHost || process.env.VERCEL_URL || firstHeaderValue(req.headers.get("host"));
  if (!host) {
    return req.nextUrl.origin;
  }

  const proto = forwardedProto || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function resolveRedirectUri(req: NextRequest) {
  const envRedirect = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (envRedirect) {
    return envRedirect;
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
