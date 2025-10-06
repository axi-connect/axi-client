import { API_BASE_URL } from "@/config/env";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

function buildTargetUrl(path: string, search: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}${search || ""}`;
}

async function proxy(req: NextRequest) {
  const segments = req.nextUrl.pathname.replace(/^\/api\/proxy/, "");
  const targetUrl = buildTargetUrl(segments, req.nextUrl.search);

  const token = (await cookies()).get("accessToken")?.value;
  const headers = new Headers(req.headers);
  headers.set("host", new URL(API_BASE_URL).host);
  headers.set("origin", new URL(API_BASE_URL).origin);
  if (token) headers.set("authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  };

  const res = await fetch(targetUrl, init);
  const body = await res.text();
  return new NextResponse(body, { status: res.status, headers: res.headers });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };