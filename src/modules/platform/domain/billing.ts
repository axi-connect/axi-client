import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge/types";

/**
 * Facturación desde la consola de plataforma, en TypeScript puro.
 *
 * Solo `super_admin` y `billing_ops`. `support` NO entra a nada de facturación:
 * la consola de soporte es todo-o-nada y publicar una tarifa o anular una
 * factura mueve dinero.
 */
export type PlatformInvoice = Schemas["PlatformInvoiceListDto"]["data"][number];
export type BillingPrice = Schemas["BillingPriceListDto"]["data"][number];
export type OverageRate = BillingPrice["overage_rates"][number];
export type PublishPriceDTO = Schemas["PublishBillingPriceDto"];
export type TenantBilling = Schemas["TenantBillingViewDto"];
export type TenantBillingAccount = NonNullable<TenantBilling["account"]>;
export type UpdateTenantBillingDTO = Schemas["UpdateTenantBillingDto"];
export type InvoiceAdministration = Schemas["InvoiceAdministrationDto"];
export type OverageMetric = OverageRate["metric"];
export type BillingInterval = BillingPrice["interval"];
export type TaxTreatment = BillingPrice["tax_treatment"];

/**
 * Etiquetas de las métricas facturables. El operador que publica una tarifa no
 * debería tener que traducir `ai_tokens_input` mentalmente.
 *
 * El Record es exhaustivo a propósito: cuando el backend añade una métrica, el
 * typecheck rompe aquí en vez de dejar que el panel muestre el nombre técnico.
 */
export const OVERAGE_METRIC_LABELS: Record<OverageMetric, string> = {
  ai_tokens_input: "Tokens de entrada IA",
  ai_tokens_output: "Tokens de salida IA",
  ai_requests: "Peticiones a la IA",
  messages_sent: "Mensajes enviados",
  messages_received: "Mensajes recibidos",
  template_sent: "Plantillas enviadas",
  external_api_calls: "Llamadas a APIs externas",
  conversations_active: "Conversaciones activas",
  storage_bytes: "Almacenamiento (bytes)",
  tts_characters: "Caracteres de voz",
  cmo_analyses: "Análisis de Axel",
  lead_discoveries: "Leads descubiertos",
  lead_enrichments: "Datos de leads verificados",
  call_seconds: "Segundos de llamada",
};

export const OVERAGE_METRICS = Object.keys(
  OVERAGE_METRIC_LABELS,
) as OverageMetric[];

export const INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: "Mensual",
  annual: "Anual",
};

/**
 * Vigencia de una tarifa.
 *
 * Es lo que explica por qué una factura de junio dice otro importe: sin la
 * ventana, un histórico de tarifas es una lista de números sin sentido.
 *
 * El mapa vive aquí y no en el componente porque el semáforo compartido
 * (`StatusBadge`) es presentacional y **cada slice aporta su mapa**.
 */
export const PRICE_VIGENCY_MAP: StatusMap = {
  current: { label: "Vigente", tone: "success" },
  scheduled: { label: "Programada o cerrada", tone: "neutral" },
  disabled: { label: "Desactivada", tone: "neutral" },
};

/** Estado de la cuenta de cobro del tenant, para la ficha de plataforma. */
export const ACCOUNT_STATUS_MAP: StatusMap = {
  current: { label: "Al día", tone: "success" },
  past_due: { label: "Pago vencido", tone: "warning" },
  suspended: { label: "Suspendido", tone: "destructive" },
  cancelled: { label: "Dado de baja", tone: "neutral" },
};

export function vigencyKey(
  price: Pick<BillingPrice, "is_current" | "is_active">,
): string {
  if (price.is_current) return "current";
  return price.is_active ? "scheduled" : "disabled";
}

/**
 * ¿Se puede anular? **No, si tiene pagos aplicados** (el backend responde 409).
 *
 * Para una factura con pagos la vía es la nota de crédito. El botón se
 * deshabilita en vez de dejar que el usuario descubra el 409 al pulsarlo: un
 * botón que solo falla al pulsarlo es un botón que miente.
 */
export function canVoidInvoice(
  invoice: Pick<PlatformInvoice, "status" | "paid_cents">,
): boolean {
  if (invoice.paid_cents > 0) return false;
  return (
    invoice.status === "open" ||
    invoice.status === "partially_paid" ||
    invoice.status === "draft"
  );
}

/** Una factura ya anulada o incobrable no admite más administración. */
export function isInvoiceClosed(
  invoice: Pick<PlatformInvoice, "status">,
): boolean {
  return invoice.status === "void" || invoice.status === "uncollectible";
}

/**
 * ¿La acción dejó la factura saldada?
 *
 * Cuando lo pagado más lo retenido cubren el total, **el backend reactiva el
 * servicio solo**. Hay que decírselo al operador después de la acción: si no, no
 * sabe que su clic acaba de devolverle el acceso a una empresa.
 */
export function isSettledAfter(result: InvoiceAdministration): boolean {
  return result.outstanding_cents <= 0;
}

/**
 * Tamaño de bloque legible: `1.000.000 tokens` en vez de un entero desnudo.
 * `unit_size` es el bloque facturable, no el total incluido — confundirlos hace
 * que alguien publique una tarifa mil veces más cara.
 */
export function unitSizeLabel(
  rate: Pick<OverageRate, "unit_size" | "metric">,
): string {
  const size = new Intl.NumberFormat("es-CO").format(rate.unit_size);
  return `por cada ${size}`;
}

/** `included_quantity: null` = tomar el tope del plan del tenant. */
export function includedLabel(
  rate: Pick<OverageRate, "included_quantity">,
): string {
  return rate.included_quantity === null
    ? "incluido: el tope del plan"
    : `incluido: ${new Intl.NumberFormat("es-CO").format(rate.included_quantity)}`;
}
