import { NextResponse } from "next/server";
import https from "https";
export const runtime = "nodejs";

function tlsAgent() {
  return process.env.ALLOW_INSECURE_TLS === "true"
    ? new https.Agent({ rejectUnauthorized: false })
    : undefined;
}

async function parseBody(req) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json();
  if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text).entries());
  }
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    return Object.fromEntries(fd.entries());
  }
  const text = await req.text();
  return text ? { raw: text } : {};
}

async function proxy(req) {
  const base = process.env.N8N_WEBHOOK_URL?.replace(/\/+$/, "");
  if (!base) return NextResponse.json({ error: "Missing N8N_WEBHOOK_URL" }, { status: 500 });

  const method = req.method;
  const qs = req.nextUrl.search || "";
  const url = method === "GET" ? `${base}${qs}` : base;

  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_AUTH_HEADER_KEY && process.env.N8N_AUTH_HEADER_VALUE) {
    headers[process.env.N8N_AUTH_HEADER_KEY] = process.env.N8N_AUTH_HEADER_VALUE;
  }

  try {
    const body = method === "GET" ? undefined : JSON.stringify(await parseBody(req));
    const res = await fetch(url, { method, headers, body, cache: "no-store", agent: tlsAgent() });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return NextResponse.json({ statusFromN8n: res.status, data }, { status: res.status });
  } catch (e) {
    const cause = e.cause || {};
    return NextResponse.json(
      {
        error: "Fetch to n8n failed",
        detail: e.message,
        code: cause.code || null,
        errno: cause.errno || null,
        syscall: cause.syscall || null,
        hostname: cause.hostname || null,
        address: cause.address || null,
        url
      },
      { status: 502 }
    );
  }
}

export async function GET(req)  { return proxy(req); }
export async function POST(req) { return proxy(req); }
