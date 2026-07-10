import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { API_BASE_URL, API_PREFIX } from "@/core/config/env";
import {
  getAccessTokenExpiry,
  refreshSession,
} from "@/shared/auth/auth.handlers";
import { COOKIE_NAMES } from "@/shared/auth/auth.types";

export const runtime = "nodejs";

/**
 * Proxy autenticado genérico del BFF: `/api/proxy/<path>` → `<backend>/api/v1/<path>`.
 *
 * - Inyecta `Authorization: Bearer` desde la cookie HttpOnly (el browser nunca ve el token).
 * - Refresh proactivo si el access expira en ≤60s, y retry-once reactivo ante un 401
 *   del backend (token revocado por `token_version`, denylist, etc.).
 * - Devuelve status y body del backend verbatim, preservando `content-type`
 *   (incluido `application/problem+json`) y `Retry-After`.
 */

/** Margen de expiración que dispara el refresh proactivo. */
const PROACTIVE_REFRESH_MS = 60_000;

/** Headers del request que SÍ se reenvían al backend. */
const FORWARDED_REQUEST_HEADERS = ["content-type", "accept", "accept-language"] as const;

/** Headers del backend que NO deben propagarse (hop-by-hop / seguridad). */
const BLOCKED_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "set-cookie",
]);

function buildTargetUrl(req: NextRequest): string {
  const path = req.nextUrl.pathname.replace(/^\/api\/proxy/, "");
  return `${API_BASE_URL.replace(/\/$/, "")}${API_PREFIX}${path}${req.nextUrl.search}`;
}

function buildForwardHeaders(req: NextRequest, token: string | null): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (token) headers.set("authorization", `Bearer ${token}`);
  return headers;
}

function buildResponse(backendRes: Response, body: ArrayBuffer): NextResponse {
  const headers = new Headers();
  backendRes.headers.forEach((value, name) => {
    if (!BLOCKED_RESPONSE_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  });
  return new NextResponse(backendRes.status === 204 ? null : body, {
    status: backendRes.status,
    headers,
  });
}

async function proxy(req: NextRequest): Promise<NextResponse> {
  const store = await cookies();
  const targetUrl = buildTargetUrl(req);
  // El body solo puede leerse una vez: se retiene para el posible reintento.
  const requestBody = ["GET", "HEAD"].includes(req.method) ? undefined : await req.arrayBuffer();

  let token = store.get(COOKIE_NAMES.accessToken)?.value ?? null;

  // Refresh proactivo: token ausente o por expirar.
  const expiresAt = token ? getAccessTokenExpiry(token) : null;
  if (!token || expiresAt === null || expiresAt - Date.now() <= PROACTIVE_REFRESH_MS) {
    const refreshed = await refreshSession(store);
    if (refreshed.ok) {
      token = refreshed.tokens.access_token;
    } else if (!token) {
      return NextResponse.json(
        { code: refreshed.code, message: "Sesión no válida" },
        { status: 401 },
      );
    }
  }

  const doFetch = (bearer: string | null) =>
    fetch(targetUrl, {
      method: req.method,
      headers: buildForwardHeaders(req, bearer),
      body: requestBody,
      cache: "no-store",
    });

  try {
    let backendRes = await doFetch(token);

    // Retry-once reactivo: el access pudo ser revocado (token_version, denylist).
    if (backendRes.status === 401) {
      const refreshed = await refreshSession(store);
      if (refreshed.ok) {
        backendRes = await doFetch(refreshed.tokens.access_token);
      }
    }

    return buildResponse(backendRes, await backendRes.arrayBuffer());
  } catch {
    return NextResponse.json(
      { code: "client/network", message: "No fue posible contactar al backend" },
      { status: 502 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
