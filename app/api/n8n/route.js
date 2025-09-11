import { NextResponse } from "next/server";
export const runtime = "nodejs";

function formDataToJson(fd) {
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

async function buildBody(req) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    return await req.json();
  } else if (ct.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    const obj = {};
    for (const [k, v] of new URLSearchParams(text).entries()) obj[k] = v;
    return obj;
  } else if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    return formDataToJson(fd);
  } else {
    // Fallback: try text
    const text = await req.text();
    return { raw: text };
  }
}

async function handle(req) {
  const base = process.env.N8N_WEBHOOK_URL?.replace(/\/+$/, "");
  if (!base) return NextResponse.json({ error: "Missing N8N_WEBHOOK_URL" }, { status: 500 });

  const method = req.method;
  const headers = { "Content-Type": "application/json" };
  if (process.env.N8N_AUTH_HEADER_KEY && process.env.N8N_AUTH_HEADER_VALUE) {
    headers[process.env.N8N_AUTH_HEADER_KEY] = process.env.N8N_AUTH_HEADER_VALUE;
  }

  let url = base;
  let body;

  if (method === "GET") {
    const qs = req.nextUrl.search || "";
    url = `${base}${qs}`;
  } else {
    const payload = await buildBody(req);
    body = JSON.stringify(payload);
  }

  try {
    const res = await fetch(url, { method, headers, body, cache: "no-store" });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: "Proxy failed", detail: e.message }, { status: 502 });
  }
}

export async function GET(req)  { return handle(req); }
export async function POST(req) { return handle(req); }
