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
export type BillingVolumeTier = Schemas["BillingVolumeTierListDto"]["data"][number];
export type CreateVolumeTierDTO = Schemas["CreateBillingVolumeTierDto"];
export type UpdateVolumeTierDTO = Schemas["UpdateBillingVolumeTierDto"];
export type BillingPromotion = Schemas["BillingPromotionListDto"]["data"][number];
export type PromotionRedemption = BillingPromotion["redemptions"][number];
export type CreatePromotionDTO = Schemas["CreateBillingPromotionDto"];
export type UpdatePromotionDTO = Schemas["UpdateBillingPromotionDto"];
export type ManualRedemptionDTO = Schemas["BillingManualRedemptionDto"];
export type BillingParameter = Schemas["BillingParameterListDto"]["data"][number];
export type PublishParameterDTO = Schemas["PublishBillingParameterDto"];
export type PublishPriceBatchDTO = Schemas["PublishPriceBatchDto"];
export type PublicPricing = Schemas["PublicPricingDto"];
export type IndexationPolicy = BillingPromotion["indexation_policy"];
export type RedemptionStatus = PromotionRedemption["status"];
export type PromotionScope = BillingPromotion["scope"];

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
  ai_conversations: "Conversaciones con IA",
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

/** Cupo de una promoción: se reserva al confirmar, se toma al pagar. */
export const REDEMPTION_STATUS_MAP: StatusMap = {
  reserved: { label: "Reservada", tone: "warning" },
  active: { label: "Activa", tone: "success" },
  released: { label: "Liberada", tone: "neutral" },
  expired: { label: "Vencida", tone: "neutral" },
};

export const INDEXATION_LABELS: Record<IndexationPolicy, string> = {
  none: "Sin ajuste",
  ipc_annual: "IPC anual",
};

export const PROMOTION_SCOPE_LABELS: Record<PromotionScope, string> = {
  packages: "Solo paquetes",
  modules: "Solo módulos",
  all: "Paquetes y módulos",
};

export type ParameterCode = PublishParameterDTO["code"];

/** Los códigos cerrados del servidor, agrupados como los pinta la pestaña. */
export const PARAMETER_GROUPS: readonly { title: string; help: string; codes: readonly ParameterCode[] }[] = [
  {
    title: "Cálculo",
    help: "TRM con que se convierte el costo y el IPC con que se indexan los términos con promoción.",
    codes: ["trm_cop_usd", "ipc_annual_pct"],
  },
  {
    title: "Mínimos de margen",
    help: "Lo que la verja exige a una celda al publicar (Tanda C). En puntos básicos: 7.000 = 70 %.",
    codes: ["margin_min_list_bps", "margin_min_promo_bps", "margin_bonus_threshold_bps"],
  },
  {
    title: "Modelo declarado de una conversación",
    help: "Lo que la verja usa cuando la muestra real es pequeña. La consola muestra al lado el medido.",
    codes: [
      "mix_tokens_in_per_conversation",
      "mix_tokens_out_per_conversation",
      "mix_cache_share_bps",
      "mix_voice_notes_per_conversation",
      "mix_minutes_per_call",
      "mix_calls_per_100_conversations",
    ],
  },
];

export const PARAMETER_CODES: readonly ParameterCode[] = PARAMETER_GROUPS.flatMap((group) => group.codes);

export const PARAMETER_LABELS: Record<ParameterCode, { name: string; unit: string; help: string }> = {
  trm_cop_usd: {
    name: "TRM de cálculo",
    unit: "COP por USD",
    help: "Convierte el costo en dólares del catálogo a pesos. La verja de publicación mide el margen con esta cifra; el colchón frente a la TRM real es explícito, no vive dentro del costo.",
  },
  ipc_annual_pct: {
    name: "IPC anual",
    unit: "%",
    help: "Indexa cada 1 de enero los precios con política «IPC anual». Se declara en cuanto el DANE publica la cifra.",
  },
  margin_min_list_bps: {
    name: "Mínimo de margen de lista",
    unit: "bps",
    help: "Margen bruto real mínimo a p50 para publicar una celda de lista. Por debajo, la publicación se rechaza con el motivo.",
  },
  margin_min_promo_bps: {
    name: "Mínimo de margen con promoción",
    unit: "bps",
    help: "Lo mismo, para el precio con la promoción abierta (Fundadores). Se evalúa mientras la promo esté abierta.",
  },
  margin_bonus_threshold_bps: {
    name: "Umbral del bono al canal",
    unit: "bps",
    help: "Por debajo de este margen el canal se paga con bono y no con recurrente (estrategia Q4-2026). Sale en el semáforo.",
  },
  mix_tokens_in_per_conversation: {
    name: "Tokens de entrada por conversación",
    unit: "tokens",
    help: "Modelo declarado (propuesta 4-sep). Se usa solo si la muestra real no alcanza 30 conversaciones.",
  },
  mix_tokens_out_per_conversation: {
    name: "Tokens de salida por conversación",
    unit: "tokens",
    help: "Modelo declarado (propuesta 4-sep).",
  },
  mix_cache_share_bps: {
    name: "Parte leída de caché",
    unit: "bps",
    help: "Fracción de los tokens de entrada que llega desde caché (8.000 = 80 %).",
  },
  mix_voice_notes_per_conversation: {
    name: "Notas de voz por conversación",
    unit: "notas",
    help: "715 notas por 4.000 conversaciones en la propuesta: 0,17875.",
  },
  mix_minutes_per_call: {
    name: "Minutos por llamada",
    unit: "min",
    help: "Solo cuenta en planes con la capacidad de llamadas.",
  },
  mix_calls_per_100_conversations: {
    name: "Llamadas por 100 conversaciones",
    unit: "llamadas",
    help: "Razón declarada; la medida sale de las sesiones de llamada de la muestra.",
  },
};

/** Formato del valor de un parámetro según su unidad. */
export function formatParameterValue(code: string, value: number): string {
  if (code.endsWith("_bps")) return `${(value / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %`;
  if (code === "ipc_annual_pct") return `${value.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
  if (code === "trm_cop_usd") return value.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return value.toLocaleString("es-CO", { maximumFractionDigits: 5 });
}

/* ───────────── consola de margen (Tanda C): parámetros declarados nuevos ───────────── */

export type BillingGatewayFee = Schemas["BillingGatewayFeeListDto"]["data"][number];
export type PublishGatewayFeeDTO = Schemas["PublishBillingGatewayFeeDto"];
export type BillingCapabilityCosts = Schemas["BillingCapabilityCostListDto"];
export type BillingCapabilityCost = BillingCapabilityCosts["capabilities"][number];
export type BillingPlanCostOverride = BillingCapabilityCosts["overrides"][number];
export type PublishCapabilityCostDTO = Schemas["PublishBillingCapabilityCostDto"];
export type PublishPlanCostOverrideDTO = Schemas["PublishBillingPlanCostOverrideDto"];
export type BillingAcquisitionCost = Schemas["BillingAcquisitionCostListDto"]["data"][number];
export type DeclareAcquisitionCostDTO = Schemas["DeclareBillingAcquisitionCostDto"];
export type UpdateAcquisitionCostDTO = Schemas["UpdateBillingAcquisitionCostDto"];

/** Comisión legible: «2,99 % + $600 + IVA 19 %». */
export function gatewayFeeLabel(fee: { percent_bps: number; fixed_cents: number; vat_bps: number }): string {
  const pct = (fee.percent_bps / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 });
  const fixed = (fee.fixed_cents / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  const vat = (fee.vat_bps / 100).toLocaleString("es-CO", { maximumFractionDigits: 0 });
  return `${pct} % + $${fixed} + IVA ${vat} %`;
}

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
