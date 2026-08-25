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
