/**
 * Unidades comerciales: cómo se le cuenta al cliente lo que incluye una oferta.
 *
 * El producto mide tokens, caracteres, segundos y peticiones; el cliente compra
 * conversaciones, minutos, leads y citas. La conversión entre ambos mundos la
 * hace el backend (`commercial_units` del plan) y este módulo solo FORMATEA:
 * aquí no se divide ningún token. Vive en `core/lib` porque lo consumen la
 * landing (Módulos), el onboarding («tu prueba incluye…») y facturación, y el
 * único formateador que existía (`platform/ui/features/limits/limit-format.ts`)
 * está dentro del slice de plataforma, que ningún slice de tenant puede importar.
 */

export type CommercialUnit =
  | "conversations"
  | "minutes"
  | "calls"
  | "leads"
  | "verified_leads"
  | "contacts"
  | "appointments"
  | "copilot_actions"
  | "voice_notes";

export type Allowance = {
  quantity: number;
  unit: CommercialUnit;
  /** Lectura alternativa de la misma cuota («200 minutos ≈ 60 llamadas»). */
  equivalent?: { quantity: number; unit: CommercialUnit };
};

const LABELS: Record<CommercialUnit, { one: string; many: string }> = {
  conversations: { one: "conversación", many: "conversaciones" },
  minutes: { one: "minuto", many: "minutos" },
  calls: { one: "llamada", many: "llamadas" },
  leads: { one: "lead", many: "leads" },
  verified_leads: { one: "lead verificado", many: "leads verificados" },
  contacts: { one: "contacto", many: "contactos" },
  appointments: { one: "cita", many: "citas" },
  copilot_actions: { one: "acción del copiloto", many: "acciones del copiloto" },
  voice_notes: { one: "nota de voz", many: "notas de voz" },
};

/** Separador de miles es-CO («2.000»), sin decimales: las cuotas son enteras. */
const INT_FORMAT = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

export function formatInteger(value: number): string {
  return INT_FORMAT.format(value);
}

/** Etiqueta de la unidad concordada en número («1 llamada», «60 llamadas»). */
export function unitLabel(unit: CommercialUnit, quantity: number): string {
  return quantity === 1 ? LABELS[unit].one : LABELS[unit].many;
}

/** «200 minutos», «2.000 contactos», «1 cita». */
export function formatQuantity(quantity: number, unit: CommercialUnit): string {
  return `${formatInteger(quantity)} ${unitLabel(unit, quantity)}`;
}

/**
 * Cuota con su equivalencia: «200 minutos ≈ 60 llamadas». El signo es U+2248
 * (ALMOST EQUAL TO) con espacios: la equivalencia es una estimación, y así se
 * lee. Sin `equivalent` devuelve solo la cuota.
 */
export function formatAllowance(allowance: Allowance): string {
  const base = formatQuantity(allowance.quantity, allowance.unit);
  if (!allowance.equivalent) return base;
  return `${base} ≈ ${formatQuantity(allowance.equivalent.quantity, allowance.equivalent.unit)}`;
}
