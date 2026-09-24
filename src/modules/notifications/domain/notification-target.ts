/**
 * Traduce una notificación (`type` + `data`) a su ruta destino en la app.
 * `type` es string libre del backend: los tipos desconocidos (o sin data
 * suficiente) devuelven `null` y el clic solo marca como leída.
 */
type TargetResolver = (data: Record<string, unknown>) => string | null

/** Resolvers por tipo exacto — tienen prioridad sobre la familia. */
const EXACT: Record<string, TargetResolver> = {
  // F13: alerta de anomalía de analíticas → tab Alertas de la sección.
  "analytics.alert": () => "/analytics?tab=alertas",
  // Método comercial: «Vas por debajo del ritmo» / «Volviste al ritmo» → la
  // ruta del mes (la propuesta, si la hay, está en «Axi propone»).
  "commercial.pace_behind": () => "/comercial",
  "commercial.pace_recovered": () => "/comercial",
  // F4: «El agente movió a Ana a Cotización» → la ficha del contacto, donde
  // están la card «Recorrido» y el «Deshacer». Sin contacto, el pipeline (la
  // familia `crm.deal_` abriría el deal, pero el aviso habla de la persona).
  "crm.deal_stage_changed_by_agent": (d) =>
    typeof d.contact_id === "string"
      ? `/crm/contacts/${d.contact_id}`
      : typeof d.deal_id === "string"
        ? `/crm/pipeline/deal/${d.deal_id}`
        : "/crm/pipeline",
  // Recorrido (F4): «La cadencia de Ana se agotó» → su ficha, donde la card
  // «Recorrido» dice qué pasó y deja reactivar. `crm.journey_` no es familia
  // `crm.deal_`: sin esta entrada el clic solo la marcaba leída (Y1).
  "crm.journey_cadence_exhausted": (d) =>
    typeof d.contact_id === "string"
      ? `/crm/contacts/${d.contact_id}`
      : typeof d.deal_id === "string"
        ? `/crm/pipeline/deal/${d.deal_id}`
        : "/crm/pipeline",
}

/** Resolvers por familia (prefijo `familia.`). */
const FAMILY: Record<string, TargetResolver> = {
  "conversation.": (d) =>
    typeof d.conversation_id === "string" ? `/workspace/inbox/${d.conversation_id}` : null,
  // F11: el detalle abre como rail (ruta interceptada) sobre el panel
  "order.": (d) => (typeof d.order_id === "string" ? `/orders/${d.order_id}` : "/orders"),
  // F8 Cobros: «no se pudo generar el contrato» se arregla desde el pedido
  // (Reintentar / Regenerar); un documento sin pedido vive en la ficha del
  // contacto. Sin ninguno de los dos no hay adónde ir.
  "document.": (d) =>
    typeof d.order_id === "string"
      ? `/orders/${d.order_id}`
      : typeof d.contact_id === "string"
        ? `/crm/contacts/${d.contact_id}`
        : null,
  // CRM F0: deals → rail del board; tareas → bandeja; imports → historial.
  "crm.deal_": (d) =>
    typeof d.deal_id === "string" ? `/crm/pipeline/deal/${d.deal_id}` : "/crm/pipeline",
  "crm.task_": () => "/crm/tasks",
  "crm.import_": () => "/crm/settings/imports",
  "contact.": (d) =>
    typeof d.contact_id === "string" ? `/crm/contacts/${d.contact_id}` : null,
  // Marketing: la campaña abre su detalle; el resto de eventos del módulo
  // (regla disparada, baja, canje) no tienen página propia y caen al resumen.
  "marketing.campaign_": (d) =>
    typeof d.campaign_id === "string" ? `/marketing/campaigns/${d.campaign_id}` : "/marketing",
  "marketing.": () => "/marketing",
  /* Axel. El backend YA escribe la notificación del briefing
     (`notification_writer.subscriber`), pero sin resolver el clic solo la
     marcaba leída: el dueño recibía «Axel te dejó 2 propuestas» y se quedaba
     donde estaba. Si trae la propuesta, se abre su detalle; si no, el despacho. */
  "cmo.": (d) =>
    typeof d.proposal_id === "string" ? `/cmo/proposals/${d.proposal_id}` : "/cmo",
  /* Facturación: el aviso trae `invoice_id` en su payload, así que el clic abre
     LA factura y no un resumen genérico —quien recibe «tu factura vence en 3
     días» quiere verla, no navegar—. Sin id cae a la sección. */
  "billing.": (d) =>
    typeof d.invoice_id === "string" ? `/billing/invoices/${d.invoice_id}` : "/billing",
}

export function notificationTarget(type: string, data: unknown): string | null {
  const d = (data && typeof data === "object" ? data : {}) as Record<string, unknown>
  const exact = EXACT[type]
  if (exact) return exact(d)
  const family = Object.keys(FAMILY).find((prefix) => type.startsWith(prefix))
  return family ? FAMILY[family](d) : null
}
