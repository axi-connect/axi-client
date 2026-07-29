import type { DemoLeadPayload } from "@/modules/landing/domain/lead";

/**
 * Adapter de captura de leads de demo.
 *
 * TODO(integración): la captura de leads todavía no existe en axi-server
 * (brecha n.º 1 del checklist de `docs/business/landing-copy.md`). Cuando el
 * endpoint esté disponible, reemplazar la simulación por:
 *
 *   import { http } from "@/core/services/http";
 *   return http.post<void>("/leads", payload, { authenticate: false });
 *
 * Mientras tanto el formulario convierte por la vía real: abre WhatsApp con
 * el mensaje prellenado (ver `DemoLeadForm`), y este adapter solo simula la
 * persistencia para dejar el punto de integración listo.
 */
export async function createDemoLead(payload: DemoLeadPayload): Promise<{ ok: true }> {
  void payload;
  await new Promise((resolve) => setTimeout(resolve, 450));
  return { ok: true };
}
