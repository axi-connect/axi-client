import type { ProposalArtifact } from "./cmo";

/**
 * A dónde lleva cada artefacto de una propuesta.
 *
 * Tres reglas que explican por qué esto es un módulo y no un `href` en línea:
 *
 * 1. **El enlace lo construye el cliente desde el `id`, nunca el modelo.** Axel
 *    tiene prohibido escribir URLs: un modelo escribiendo rutas es un modelo
 *    inventando ids de promoción. El servidor entrega el `id` del borrador que
 *    creó de verdad y el destino se deriva de él.
 * 2. **Sin `id` no hay enlace.** `readArtifacts` deja `id: null` cuando el
 *    artefacto no lo trae (hoy pasa con `segment`, que ningún borrador emite con
 *    identificador). Devolver el listado a secas sería peor que no enlazar: el
 *    dueño hace clic esperando su borrador y aterriza en una tabla.
 * 3. **Solo la campaña tiene ruta propia.** Promoción, automatización y
 *    plantilla se editan en un panel que vive en el estado de su vista, así que
 *    el destino es la vista con el borrador indicado por query param. Es una
 *    desviación consciente de `docs/architecture.md` §16 (que pediría slot
 *    paralelo + ruta interceptada): reestructurar tres vistas que funcionan es
 *    otro trabajo, y el parámetro ya es el patrón de catálogo y analítica.
 */
export function artifactHref(artifact: ProposalArtifact): string | null {
  if (artifact.type === "campaign") {
    return artifact.id === null ? null : `/marketing/campaigns/${artifact.id}`;
  }
  if (artifact.type === "promotion") {
    return artifact.id === null ? null : `/marketing/promotions?promotion=${artifact.id}`;
  }
  if (artifact.type === "automation") {
    return artifact.id === null ? null : `/marketing/automations?automation=${artifact.id}`;
  }
  if (artifact.type === "template") {
    return artifact.id === null ? null : `/marketing/settings/templates?template=${artifact.id}`;
  }
  // El guion de ventas no tiene pantalla propia: el `id` del artefacto es el del
  // playbook, no el del agente, así que el destino honesto es la lista.
  if (artifact.type === "agent_playbook") {
    return "/admin/agents";
  }
  return null;
}

/** El texto del enlace, dicho como lo que el dueño va a ver al llegar. */
export function artifactLinkLabel(type: ProposalArtifact["type"]): string {
  switch (type) {
    case "campaign":
      return "Ver la campaña";
    case "promotion":
      return "Ver la promoción";
    case "automation":
      return "Ver la regla";
    case "template":
      return "Ver el mensaje";
    case "agent_playbook":
      return "Ver el agente";
    default:
      return "Ver";
  }
}
