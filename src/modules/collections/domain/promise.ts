import { formatMoney, formatShortDate } from "@/core/lib/format";
import type { PlanDetailDTO } from "./payment-plan";
import type { ReceivableDTO } from "./receivable";

/**
 * Dominio de la PROMESA de pago y la nota del plan (F4b del programa Cobros):
 * alias del contrato generado y las lecturas puras que el bloque del plan, la
 * fila de la Cartera y los diálogos comparten.
 *
 * Una promesa es una frase con fecha, no un formulario. Tres estados, tres
 * frases con icono, nunca un badge de color: viva (info), cumplida (verde),
 * rota (ámbar). El servidor la resuelve —el pago que la cubre la cumple, el
 * barrido la rompe si el día pasa— y aquí solo se LEE.
 */
export type PromiseDTO = PlanDetailDTO["promises"][number];
export type PlanNoteDTO = PlanDetailDTO["notes"][number];
export type PromiseStatus = PromiseDTO["status"];

export const PROMISE_STATUS_LABELS: Record<PromiseStatus, string> = {
  pending: "Viva",
  kept: "Cumplida",
  broken: "Rota",
  cancelled: "Cancelada",
};

/** Largo máximo de la nota de una promesa y de la nota del plan (los del servidor). */
export const PROMISE_NOTE_MAX = 500;
export const PLAN_NOTE_MAX = 1000;

/** La más reciente: el servidor las manda ordenadas, la primera es la última anotada. */
export function latestPromise(
  plan: Pick<PlanDetailDTO, "promises">,
): PromiseDTO | null {
  return plan.promises[0] ?? null;
}

/** Solo un plan activo y sin promesa viva admite otra (el servidor lo garantiza; aquí se dice antes). */
export function canPromise(
  plan: Pick<PlanDetailDTO, "status" | "active_promise_at">,
): boolean {
  return plan.status === "active" && plan.active_promise_at === null;
}

/** Solo un plan activo con algo pendiente se reprograma. */
export function canReschedule(
  plan: Pick<PlanDetailDTO, "status" | "balance_cents">,
): boolean {
  return plan.status === "active" && plan.balance_cents > 0;
}

export type PromiseTone = "info" | "success" | "warning";

/**
 * La tarjeta de la promesa en el pedido: qué pasó, con qué consecuencia y qué
 * salidas quedan. `null` cuando no hay nada que contar (nunca prometió, o la
 * última quedó cancelada).
 */
export type PromiseCard = {
  tone: PromiseTone;
  title: string;
  detail: string;
  note: string | null;
  actions: ("write" | "promise_again")[];
};

export function promiseCard(
  plan: Pick<PlanDetailDTO, "promises" | "currency">,
): PromiseCard | null {
  const promise = latestPromise(plan);
  if (promise === null) return null;
  const when = formatShortDate(promise.promised_at);
  const amount =
    promise.amount_cents === null
      ? ""
      : ` ${formatMoney(promise.amount_cents, plan.currency)}`;
  switch (promise.status) {
    case "pending":
      return {
        tone: "info",
        title: `Prometió pagar${amount} el ${when}.`,
        detail: "Los recordatorios quedan en pausa hasta ese día.",
        note: promise.note,
        actions: ["write"],
      };
    case "kept": {
      const paidOn =
        promise.resolved_at === null
          ? ""
          : `: pagó el ${formatShortDate(promise.resolved_at)}${daysEarlyText(promise.promised_at, promise.resolved_at)}`;
      return {
        tone: "success",
        title: `Cumplió la promesa del ${when}${paidOn}.`,
        detail:
          "La cuota quedó saldada y los recordatorios siguen con la siguiente.",
        note: null,
        actions: [],
      };
    }
    case "broken":
      return {
        tone: "warning",
        title: `No cumplió la promesa del ${when}.`,
        detail:
          promise.resolved_at === null
            ? "Los recordatorios volvieron solos."
            : `Los recordatorios volvieron solos el ${formatShortDate(promise.resolved_at)}.`,
        note: promise.note,
        actions: ["promise_again", "write"],
      };
    case "cancelled":
      return null;
  }
}

/** «, un día antes» / «, 3 días antes» / «» si pagó el mismo día o después. */
function daysEarlyText(promisedAt: string, resolvedAt: string): string {
  const promised = new Date(`${promisedAt}T00:00:00`);
  const resolved = new Date(resolvedAt);
  resolved.setHours(0, 0, 0, 0);
  const days = Math.round(
    (promised.getTime() - resolved.getTime()) / 86_400_000,
  );
  if (days <= 0) return "";
  return days === 1 ? ", un día antes" : `, ${String(days)} días antes`;
}

/** Una línea del historial de promesas bajo las cuotas. */
export type PromiseHistoryLine = {
  id: string;
  tone: PromiseTone;
  text: string;
  at: string;
};

export function promiseHistory(
  plan: Pick<PlanDetailDTO, "promises">,
): PromiseHistoryLine[] {
  return plan.promises.flatMap((promise): PromiseHistoryLine[] => {
    const when = formatShortDate(promise.promised_at);
    switch (promise.status) {
      case "pending":
        return [
          {
            id: promise.id,
            tone: "info" as const,
            text: `Promesa anotada para el ${when}`,
            at: promise.created_at,
          },
        ];
      case "kept":
        return [
          {
            id: promise.id,
            tone: "success" as const,
            text: `Promesa del ${when} cumplida`,
            at: promise.resolved_at ?? promise.created_at,
          },
        ];
      case "broken":
        return [
          {
            id: promise.id,
            tone: "warning" as const,
            text: `Promesa del ${when} rota: el día pasó sin pago`,
            at: promise.resolved_at ?? promise.created_at,
          },
        ];
      case "cancelled":
        return [];
    }
  });
}

/**
 * La promesa en la fila de la Cartera, como texto: viva con la fecha y los
 * avisos en pausa; rota cuando la última promesa no se cumplió y no hay otra
 * viva. Cumplida no se dice aquí: si pagó, o ya no está en la Cartera, o lo
 * que debe es la cuota siguiente.
 */
export function promiseLine(
  row: Pick<ReceivableDTO, "active_promise_at" | "last_promise">,
): { tone: "info" | "warning"; text: string } | null {
  if (row.active_promise_at !== null) {
    return {
      tone: "info",
      text: `prometió el ${formatShortDate(row.active_promise_at)} · avisos en pausa`,
    };
  }
  if (row.last_promise?.status === "broken") {
    return {
      tone: "warning",
      text: `no cumplió la promesa del ${formatShortDate(row.last_promise.promised_at)}`,
    };
  }
  return null;
}

/** `YYYY-MM-DD` del calendario LOCAL, como lo escribe un `<input type="date">`. */
export function isoDay(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export type DateChip = {
  key: "tomorrow" | "in3" | "monday" | "other";
  label: string;
  /** La fecha real debajo del chip; null en «otra fecha». */
  date: string | null;
};

const WEEKDAY = new Intl.DateTimeFormat("es", { weekday: "long" });

/**
 * Las fechas que se entienden: mañana, en 3 días, el próximo lunes (si cae
 * después de los 3 días) y «otra fecha». Cada chip lleva su fecha real debajo,
 * porque «el lunes» sin día es una trampa a fin de mes.
 */
export function dateChips(today: Date = new Date()): DateChip[] {
  const at = (days: number) => {
    const next = new Date(today);
    next.setDate(today.getDate() + days);
    return next;
  };
  const daysToMonday = (8 - today.getDay()) % 7 || 7;
  const monday = at(daysToMonday);
  const chips: DateChip[] = [
    { key: "tomorrow", label: "Mañana", date: isoDay(at(1)) },
    { key: "in3", label: "En 3 días", date: isoDay(at(3)) },
  ];
  if (daysToMonday > 3) {
    chips.push({
      key: "monday",
      label: `El ${WEEKDAY.format(monday)}`,
      date: isoDay(monday),
    });
  }
  chips.push({ key: "other", label: "Otra fecha", date: null });
  return chips;
}

/**
 * Lo que se propone como monto de la promesa: lo que falta de la primera cuota
 * vencida; si no hay mora, lo que falta de la siguiente; si no, el saldo.
 */
export function suggestedPromiseCents(
  plan: Pick<PlanDetailDTO, "installments" | "balance_cents">,
  today: Date = new Date(),
): number {
  const day = isoDay(today);
  const owing = plan.installments.filter(
    (one) =>
      one.status !== "paid" &&
      one.status !== "waived" &&
      one.amount_cents - one.paid_cents > 0,
  );
  const overdue = owing.find(
    (one) => one.status === "overdue" || one.due_at < day,
  );
  const target = overdue ?? owing[0];
  return target === undefined
    ? plan.balance_cents
    : Math.max(0, target.amount_cents - target.paid_cents);
}

/** Las cuotas que se pueden reescribir: lo pendiente, con lo que les falta. */
export type ScheduleLine = { due_at: string; amount_cents: number };

export function pendingSchedule(
  plan: Pick<PlanDetailDTO, "installments">,
): ScheduleLine[] {
  return plan.installments
    .filter((one) => one.status !== "paid" && one.status !== "waived")
    .map((one) => ({
      due_at: one.due_at,
      amount_cents: Math.max(0, one.amount_cents - one.paid_cents),
    }));
}

/**
 * «En cuántas cuotas» (Cobros premium P4): reparte el saldo en `count` partes
 * iguales en pesos enteros; la última se lleva el resto, así la suma cuadra
 * siempre.
 *
 * Las fechas salen del calendario ORIGINAL del plan, no de lo que se esté
 * editando (auditoría P1–P5, B10): la última es la del saldo, la que se pactó
 * con la salida. Si el original tiene cuotas de sobra, se reutilizan sus
 * fechas; si no, las de en medio se reparten parejas entre la primera fecha
 * pendiente (u hoy, si solo queda el saldo) y la del saldo — nunca varias
 * cuotas el mismo día.
 */
export function splitSchedule(
  original: readonly ScheduleLine[],
  balanceCents: number,
  count: number,
  today: string = isoDay(new Date()),
): ScheduleLine[] {
  const parts = Math.max(1, Math.floor(count));
  const final = original[original.length - 1]?.due_at ?? "";
  const base = Math.floor(balanceCents / parts / 100) * 100;
  const start = original.length > 1 ? original[0]!.due_at : today;
  const from = new Date(`${start}T00:00:00`).getTime();
  const to = new Date(`${final}T00:00:00`).getTime();
  const dateAt = (index: number): string => {
    if (index === parts - 1) return final;
    if (original.length >= parts) return original[index]!.due_at;
    if (Number.isNaN(from) || Number.isNaN(to)) return final;
    const step =
      parts === 1 ? 0 : (to - from) / (parts - (original.length > 1 ? 1 : 0));
    const offset = original.length > 1 ? index : index + 1;
    return isoDay(new Date(from + step * offset));
  };
  return Array.from({ length: parts }, (_, index) => ({
    due_at: dateAt(index),
    amount_cents:
      index === parts - 1 ? balanceCents - base * (parts - 1) : base,
  }));
}

/**
 * La regla del servidor, dicha antes de perder el trabajo: las cuotas
 * pendientes tienen que sumar exactamente el saldo. Devuelve la diferencia
 * (positiva = faltan, negativa = sobran) y si cada línea es válida.
 */
export function scheduleCheck(
  lines: readonly ScheduleLine[],
  balanceCents: number,
): { sum: number; diff: number; valid: boolean } {
  const sum = lines.reduce((total, line) => total + line.amount_cents, 0);
  const complete =
    lines.length > 0 &&
    lines.every(
      (line) =>
        /^\d{4}-\d{2}-\d{2}$/.test(line.due_at) && line.amount_cents > 0,
    );
  const diff = balanceCents - sum;
  return { sum, diff, valid: complete && diff === 0 };
}
