import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { API_BASE_URL } from "@/core/config/env";
import { refreshToken as refreshWithHelper } from "@/shared/auth/auth.handlers";

export const runtime = "nodejs";

function buildTargetUrl(path: string, search: string) {
  const base = API_BASE_URL.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}${search || ""}`;
}

async function proxy(req: NextRequest) {
  try {
    const store = await cookies();
    const segments = req.nextUrl.pathname.replace(/^\/api\/proxy/, "");
    const targetUrl = buildTargetUrl(segments, req.nextUrl.search);

    let token = store.get("accessToken")?.value;
    const headers = new Headers(req.headers);
    headers.set("host", new URL(API_BASE_URL).host);
    headers.set("origin", new URL(API_BASE_URL).origin);
    if (token) headers.set("authorization", `Bearer ${token}`);

    // Proactive refresh if token about to expire (within 60s)
    const exp = token ? getJwtExp(token) : null;

    const now = Math.floor(Date.now() / 1000);
    console.log("refreshing token about to expire", (exp && exp - now <= 60) || exp === null);
    if ((exp && exp - now <= 60) || exp === null) {
      const [ok] = await refreshWithHelper(store);
      if (ok) {
        token = store.get("accessToken")?.value;
        if (token) headers.set("authorization", `Bearer ${token}`);
      }
    }

    // === Request al backend ===
    const init: RequestInit = {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
      cache: "no-store",
    };

    const res = await fetch(targetUrl, init);
    const body = await res.text();
    return new NextResponse(body, { status: res.status, headers: res.headers });
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}

function getJwtExp(token: string): number | undefined {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    const payloadStr = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadStr);
    const exp = typeof payload?.exp === "number" ? payload.exp : undefined;
    const expDate = new Date(exp * 1000);

    console.log("access token expires at: ", expDate.toLocaleTimeString());
    const now = Date.now();
    const diffMs = exp * 1000 - now;
    const diffMin = Math.floor(diffMs / 1000 / 60);

    console.log("minutes left", diffMin)

    return exp;
  } catch {
    return undefined;
  }
}

function base64UrlDecode(input: string): string {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 2 ? "==" : b64.length % 4 === 3 ? "=" : "";
  const data = b64 + pad;
  if (typeof atob !== "undefined") {
    return decodeURIComponent(Array.prototype.map.call(atob(data), (c: string) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''));
  }
  return Buffer.from(data, 'base64').toString('utf8');
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };