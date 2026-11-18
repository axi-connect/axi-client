import { http } from "@/core/services/http"
import type { ConnectedApp, ConsentRequest } from "@/modules/connected-apps/domain/connected-apps"

/**
 * Adapter HTTP de la puerta MCP del lado del panel (con la sesión de siempre):
 * la solicitud OAuth que la persona revisa, su decisión y sus apps conectadas.
 * El código y los tokens del cliente MCP nunca pasan por aquí.
 */
export function getConsentRequest(requestId: string): Promise<ConsentRequest> {
  return http.get<ConsentRequest>(`/oauth/requests/${encodeURIComponent(requestId)}`)
}

/** Devuelve a dónde mandar el navegador: el cliente con su código (o con `access_denied`). */
export function decideConsent(
  requestId: string,
  decision: { approve: boolean; scopes?: string[] },
): Promise<{ redirect_to: string }> {
  return http.post<{ redirect_to: string }>(`/oauth/requests/${encodeURIComponent(requestId)}/decision`, decision)
}

export async function listConnectedApps(): Promise<ConnectedApp[]> {
  const res = await http.get<{ items: ConnectedApp[] }>("/oauth/connected-apps")
  return res.items
}

/** 204: el acceso del cliente se corta al instante. */
export function disconnectApp(grantId: string): Promise<void> {
  return http.delete(`/oauth/connected-apps/${encodeURIComponent(grantId)}`)
}
