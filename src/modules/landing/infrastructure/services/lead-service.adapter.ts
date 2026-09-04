import type { DemoLeadPayload } from "@/modules/landing/domain/lead";

/**
 * Captura de leads de demo. Persiste de verdad desde 2026-09-04: hasta esa
 * fecha esto era un temporizador de 450 ms que descartaba el payload, así que
 * todo el que no pulsara «enviar» dentro de WhatsApp se perdía entero.
 *
 * Va por la ruta intermedia del propio Next y no directo al API, igual que el
 * alta: así el origen del backend no viaja al navegador y la dirección de
 * quien envía llega al servidor sin depender de cabeceras reenviadas.
 *
 * El campo trampa se manda SIEMPRE, vacío. Un robot que rellena todos los
 * campos del formulario lo rellena también, y el backend lo descarta en
 * silencio.
 */
export async function createDemoLead(payload: DemoLeadPayload): Promise<{ ok: boolean }> {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      payload,
      consent: true,
      website: "",
      source_url: window.location.href,
    }),
  });
  return { ok: response.ok };
}
