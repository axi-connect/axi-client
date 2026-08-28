import type { Schemas } from "@/core/api/types";

/**
 * Estado de cuenta y calendario de mora, en TypeScript puro.
 *
 * El estado NO se calcula aquí: lo dicta el backend en `account_status`. Lo que
 * este módulo hace es traducirlo a lo que la UI debe pintar, y derivar la cuenta
 * atrás a partir de los dos campos que el backend expone para eso.
 */
export type BillingSummaryDTO = Schemas["BillingSummaryDto"];
export type AccountStatus = NonNullable<BillingSummaryDTO["account_status"]>;

/**
 * Qué aviso corresponde al estado de cuenta.
 *
 * - `trial` — `account_status: null`: el tenant nunca tuvo cuenta de cobro. **No
 *   es un error**: la pantalla funciona y muestra el estado de prueba.
 * - `none` — al día, sin banner.
 * - `past_due` — venció y no se pagó. **El panel sigue operativo**: la mora
 *   avisa, no bloquea.
 * - `cancelled` — baja, aviso informativo.
 *
 * `suspended` no aparece: quien está suspendido no entra al panel (el login le
 * responde 403 `auth/payment_overdue`), así que ese estado solo se ve en
 * plataforma. Se mapea a `none` porque si alguna vez llegara, el banner sería lo
 * menos relevante de la pantalla.
 */
export type DunningVariant = "none" | "trial" | "past_due" | "cancelled";

export function dunningVariant(
  summary: Pick<BillingSummaryDTO, "account_status">,
): DunningVariant {
  switch (summary.account_status) {
    case null:
      return "trial";
    case "past_due":
      return "past_due";
    case "cancelled":
      return "cancelled";
    default:
      return "none";
  }
}

const DAY_MS = 86_400_000;

/**
 * Días que faltan para la suspensión, o `null` si no hay cuenta atrás que
 * pintar.
 *
 * Se mide desde la factura abierta **más antigua** (`oldest_due_at`), que es la
 * que dispara la suspensión, más los días de gracia del tenant. Ambos vienen del
 * resumen: calcular la gracia en el cliente sería inventarla, porque es política
 * de axi y configurable por tenant.
 *
 * Devuelve `0` el mismo día del corte —«hoy» sigue siendo una cuenta atrás
 * válida— y `null` cuando no hay vencimiento o cuando el corte ya pasó: si el
 * backend aún no ha suspendido, el panel no adelanta la noticia.
 */
export function daysToSuspension(
  summary: Pick<BillingSummaryDTO, "oldest_due_at" | "grace_days">,
  now: Date = new Date(),
): number | null {
  if (summary.oldest_due_at === null) return null;

  const due = new Date(summary.oldest_due_at).getTime();
  if (Number.isNaN(due)) return null;

  const deadline = due + summary.grace_days * DAY_MS;
  const remaining = Math.ceil((deadline - now.getTime()) / DAY_MS);
  return remaining < 0 ? null : remaining;
}

/** Días transcurridos desde el vencimiento más antiguo (0 si aún no venció). */
export function daysOverdue(
  summary: Pick<BillingSummaryDTO, "oldest_due_at">,
  now: Date = new Date(),
): number | null {
  if (summary.oldest_due_at === null) return null;

  const due = new Date(summary.oldest_due_at).getTime();
  if (Number.isNaN(due)) return null;

  return Math.max(0, Math.floor((now.getTime() - due) / DAY_MS));
}

/**
 * Fecha prevista de suspensión, para pintarla en vez de solo contar días.
 * Un «12 de septiembre» es más accionable que un «faltan 3 días».
 */
export function suspensionDate(
  summary: Pick<BillingSummaryDTO, "oldest_due_at" | "grace_days">,
): Date | null {
  if (summary.oldest_due_at === null) return null;

  const due = new Date(summary.oldest_due_at).getTime();
  if (Number.isNaN(due)) return null;

  return new Date(due + summary.grace_days * DAY_MS);
}

/**
 * Días que faltan para el corte del ciclo, o `null` si no hay cuenta atrás que
 * pintar.
 *
 * Es la cuenta atrás del talón del tiquete: responde «¿cuándo me cobran?», que
 * es la otra mitad de la pregunta que hace la estimación del importe.
 *
 * Mismo criterio que `daysToSuspension`: `0` el mismo día del corte —«hoy»
 * sigue siendo una cuenta atrás válida— y `null` cuando no hay ciclo, cuando
 * `period_end` no es una fecha, o cuando el corte YA pasó. Ese último caso es
 * real: si el barrido de emisión no ha rotado el ciclo todavía, el panel no
 * narra el retraso del backend con un número negativo.
 */
export function daysToCycleClose(
  summary: Pick<BillingSummaryDTO, "cycle">,
  now: Date = new Date(),
): number | null {
  if (summary.cycle === null) return null;

  const end = new Date(summary.cycle.period_end).getTime();
  if (Number.isNaN(end)) return null;

  const remaining = Math.ceil((end - now.getTime()) / DAY_MS);
  if (remaining < 0) return null;
  // `Math.ceil` de un delta negativo mínimo devuelve `-0`, que pasa el `< 0` de
  // arriba y se colaría en la etiqueta como «-0 días». El `+ 0` lo normaliza.
  return remaining + 0;
}

/**
 * La cuenta atrás del corte en palabras. `null` es «no lo sabemos», nunca cero.
 *
 * No dice «Mañana» para `days === 1` a propósito: `Math.ceil` devuelve 1 para
 * cualquier resto entre 0 y 24 h, así que «Mañana» sería falso a las 22:00 de la
 * víspera. «En 1 día» es cierto en todo el rango.
 */
export function cycleCloseLabel(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "Hoy";
  return `En ${String(days)} ${days === 1 ? "día" : "días"}`;
}
