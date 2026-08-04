/**
 * Descarga del diagnóstico de conversación (`.md` o `.json`). openapi-fetch
 * no sirve aquí (respuesta binaria/markdown en streaming): `fetch` manual
 * con el MISMO contrato que `platform-client.ts` — base `API_BASE_URL`,
 * `Authorization: Bearer` desde `token-storage` (el token JAMÁS viaja en la
 * URL) y `!ok` → `HttpError` vía `parseHttpError`. El blob baja con
 * `URL.createObjectURL` + anchor efímero; el nombre sale del
 * `Content-Disposition` del backend (fallback local).
 */
import { parseHttpError } from "@/core/api/problem";
import { API_BASE_URL } from "@/core/config/env";
import { getPlatformToken } from "../auth/token-storage";

export type ReportFormat = "md" | "json";

/**
 * Extrae el filename de un header `Content-Disposition` (testeable).
 * Soporta `filename="x.md"`, `filename=x.md` y `filename*=UTF-8''x.md`.
 */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i);
  if (quoted) return quoted[1];
  const bare = header.match(/filename=([^;]+)/i);
  if (bare) return bare[1].trim();
  return null;
}

export async function downloadConversationReport(args: {
  companyId: string;
  conversationId: string;
  format: ReportFormat;
  includeRaw: boolean;
}): Promise<void> {
  const { companyId, conversationId, format, includeRaw } = args;
  const query = new URLSearchParams({
    format,
    // El backend espera el booleano como STRING "true"/"false".
    include_raw: includeRaw ? "true" : "false",
  });
  const url = `${API_BASE_URL}/api/v1/platform/quality/debug/${companyId}/conversations/${conversationId}/report?${query}`;

  const token = getPlatformToken();
  const response = await fetch(url, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw await parseHttpError(response);

  const blob = await response.blob();
  const filename =
    parseContentDispositionFilename(response.headers.get("Content-Disposition")) ??
    `conversation-debug-${conversationId}.${format}`;

  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
