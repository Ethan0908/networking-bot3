import { NextRequest } from "next/server";

export function resolveRedirectUri(req: NextRequest) {
  const envRedirect = process.env.GOOGLE_REDIRECT_URI;
  if (envRedirect && envRedirect.length > 0) {
    return envRedirect;
  }

  const origin = req.nextUrl.origin;
  return `${origin}/api/oauth/google/callback`;
}
