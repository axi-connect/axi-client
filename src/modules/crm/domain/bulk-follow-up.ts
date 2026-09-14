import type { Schemas } from "@/core/api/types";
import { TEMPLATE_COST_CO_USD, type HsmTemplateDTO } from "@/modules/marketing/public";

/** Un lote de seguimientos del agente (F4a). */
export type BulkDTO = Schemas["BulkDto"];
export type BulkPreviewDTO = Schemas["BulkPreviewDto"];
export type CreateBulkDTO = Schemas["CreateBulkDto"];
export type BulkSkipGroup = BulkPreviewDTO["skipped"][number];
export type BulkSkipReason = BulkSkipGroup["reason"];

/** Espejo de `BULK_PER_HOUR` y `BULK_MAX` del backend: el formulario impone lo
 *  mismo ANTES de enviar, porque un 422 por escribir 500 en «por hora» es un
 *  viaje al servidor que la UI podía evitar. */
export const BULK_LIMITS = {
  per_hour: { min: 1, max: 120 },
  audience: { max: 5000 },
} as const;

/** Ritmos que se ofrecen. No es una lista arbitraria: por debajo de 5/hora un
 *  lote mediano tarda días, y por encima de 60 se parece a una ráfaga. */
export const BULK_RATES: readonly { value: number; label: string }[] = [
  { value: 5, label: "5 por hora · muy suave" },
  { value: 10, label: "10 por hora · suave" },
  { value: 20, label: "20 por hora · recomendado" },
  { value: 40, label: "40 por hora · rápido" },
  { value: 60, label: "60 por hora · uno por minuto" },
];

export const BULK_SKIP_LABELS: Record<BulkSkipReason, string> = {
  opted_out: "Se dieron de baja",
  task_open: "Ya tienen un seguimiento abierto",
  no_channel: "Sin WhatsApp ni teléfono",
  contact_not_found: "El contacto ya no existe",
  error: "No se pudo programar",
};

/** Qué puede hacer el operador con cada motivo. `null` = nada, es definitivo. */
export const BULK_SKIP_HINTS: Record<BulkSkipReason, string | null> = {
  opted_out: "No se les puede escribir nada comercial. Es una obligación legal, no una preferencia.",
  task_open: "El que ya estaba sigue su curso; no se les encola un segundo.",
  no_channel: "Entraron al CRM sin canal de contacto: complétales el teléfono o el WhatsApp.",
  contact_not_found: "Se borró entre que lo programaste y que el agente llegó a él.",
  error: "Fallo al crear esa tarea concreta. El resto del lote siguió.",
};

const HOUR_MS = 3_600_000;

/**
 * Cuándo saldría la última tarea. MISMA aritmética que `bulkDueAt` del backend
 * (reparto uniforme dentro de la hora), y por eso está probada aparte: si las
 * dos derivan, el formulario promete una hora y el motor cumple otra.
 */
export function bulkFinishesAt(startsAt: Date, perHour: number, total: number): Date {
  const rate = Math.min(BULK_LIMITS.per_hour.max, Math.max(BULK_LIMITS.per_hour.min, perHour));
  const step = HOUR_MS / rate;
  return new Date(startsAt.getTime() + Math.round(Math.max(0, total - 1) * step));
}

/** Cuántas horas de reloj ocupa el lote entero. */
export function bulkSpanHours(perHour: number, total: number): number {
  return Math.max(0, total - 1) / Math.max(1, perHour);
}

export type BulkDayLoad = { day: number; count: number };

/**
 * Cuántas tareas caen en cada día natural del reparto, para la barra del
 * formulario. El día se cuenta desde el arranque, no desde medianoche: lo que
 * el operador necesita ver es «esto cruza al día siguiente», no un calendario.
 */
export function bulkDayLoads(perHour: number, total: number): BulkDayLoad[] {
  if (total <= 0) return [];
  const perDay = Math.max(1, Math.round(perHour * 24));
  const days: BulkDayLoad[] = [];
  for (let remaining = total, day = 0; remaining > 0; day += 1) {
    const count = Math.min(remaining, perDay);
    days.push({ day, count });
    remaining -= count;
  }
  return days;
}

/**
 * ¿El lote se pasa del cupo diario del tenant? El motor no se lo salta: lo que
 * sobra se difiere al día siguiente. Decirlo ANTES evita que el operador lea
 * «termina el viernes» y luego vea tareas del sábado.
 */
export function exceedsDailyCap(
  total: number,
  dailyCap: number,
): { exceeds: boolean; days: number } {
  if (dailyCap <= 0) return { exceeds: false, days: 1 };
  const days = Math.ceil(total / dailyCap);
  return { exceeds: days > 1, days };
}

/** La frase del pie: qué va a pasar exactamente, con sujeto, número y hora. */
export function bulkPromise(input: {
  agentName: string;
  eligible: number;
  medium: "message" | "call" | "call_then_message";
  startLabel: string;
  perHour: number;
}): string {
  const verb =
    input.medium === "message"
      ? "escribirá a"
      : input.medium === "call"
        ? "llamará a"
        : "llamará a";
  const tail =
    input.medium === "call_then_message" ? " y, a quien no conteste, le escribirá" : "";
  const contacts = input.eligible === 1 ? "1 contacto" : `${String(input.eligible)} contactos`;
  return (
    `${input.agentName} ${verb} ${contacts} desde el ${input.startLabel}, ` +
    `a ${String(input.perHour)} por hora${tail}.`
  );
}

export type BulkOpeningCost = {
  /** Lo que Meta cobra por cada apertura entregada, según su categoría. */
  unit_usd: number;
  /** Tope: lo que costaría si TODOS estuvieran fuera de la ventana de 24 h. */
  total_usd: number;
  /** Marketing cuesta ~25× una utility: la cifra cambia de orden de magnitud. */
  category: HsmTemplateDTO["category"];
};

/**
 * Cuánto puede costar abrir un lote con una plantilla de Meta.
 *
 * Vive aquí y no dentro del modal por lo que salió en la auditoría de F4a: el
 * componente multiplicaba por `0.0008` a pelo, que es la tarifa de una
 * **utility**, mientras el selector admite también **marketing** — 25× más. Dar
 * una cifra concreta y equivocada es peor que no darla: el operador la usa para
 * decidir. Con el cálculo en el dominio, la tarifa sale del catálogo y hay un
 * test que lo fija.
 *
 * Es un TOPE, no una previsión: solo se cobra a quien esté fuera de la ventana
 * de 24 h cuando le toque su turno, y eso no se sabe al programar.
 */
export function bulkOpeningCost(
  eligible: number,
  category: HsmTemplateDTO["category"],
): BulkOpeningCost {
  const unit = TEMPLATE_COST_CO_USD[category];
  return {
    unit_usd: unit,
    total_usd: Math.max(0, eligible) * unit,
    category,
  };
}

/** «US$0,0008» / «US$5,36» — con los decimales que cada cifra necesita. */
export function formatUsd(usd: number, decimals = 2): string {
  return `US$${usd.toLocaleString("es-CO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
