/**
 * «Escribe primero a» (Cobros premium P4): la isla de la cartera es la PRIMERA
 * fila del orden que ya da el servidor, contada de otra forma — quién, cuánto
 * pedirle y por qué ahora. No se inventa nada que el servidor no entregue: por
 * eso no hay «respondió», que ninguna lectura de la cartera trae.
 */
import { formatShortDate } from "@/core/lib/format";
import {
  daysUntil,
  sectionOf,
  type ReceivableDTO,
  type ReceivableSection,
  type ReceivableSectionKey,
} from "@/modules/collections/domain/receivable";
import {
  REMINDER_STATUS_LABELS,
  relativeDay,
} from "@/modules/collections/domain/reminder";

export interface WriteFirstFact {
  label: string;
  value: string;
}

export interface WriteFirst {
  row: ReceivableDTO;
  section: ReceivableSectionKey;
  /** Lo que se le pide ahora: lo vencido si hay, si no el saldo. */
  askCents: number;
  /** `overdue`: el monto es lo vencido; `balance`: es todo lo que debe. */
  askKind: "overdue" | "balance";
  /** Lo vencido es solo una parte del saldo: la isla dice también el total. */
  partial: boolean;
  why: string;
  facts: WriteFirstFact[];
}

/**
 * La primera fila que pide escribir. Una cartera donde todos van al día no
 * tiene a quién escribir primero: la isla no aparece, en vez de promover a
 * alguien que no debe nada todavía.
 */
export function writeFirst(
  sections: readonly ReceivableSection[],
  now: Date = new Date(),
): WriteFirst | null {
  const row = sections[0]?.rows[0];
  if (row === undefined) return null;
  const section = sectionOf(row);
  if (section === "current") return null;
  const overdue = row.overdue_cents > 0;
  return {
    row,
    section,
    askCents: overdue ? row.overdue_cents : row.balance_cents,
    askKind: overdue ? "overdue" : "balance",
    partial: overdue && row.overdue_cents < row.balance_cents,
    why: whyNow(row, section),
    facts: facts(row, now),
  };
}

function whyNow(row: ReceivableDTO, section: ReceivableSectionKey): string {
  if (row.last_promise?.status === "broken" && row.active_promise_at === null) {
    return "Prometió pagar y el día pasó sin el pago.";
  }
  if (row.active_promise_at !== null) {
    return "Prometió pagar: los avisos automáticos esperan a esa fecha, pero la cuota sigue abierta.";
  }
  if (row.paused)
    return "Sus avisos están en pausa, pero la deuda sigue contando.";
  if (section === "travelled") {
    return "Ya viajó, así que no queda nada que retener: es la deuda que más rápido envejece.";
  }
  if (section === "overdue")
    return "Tiene una cuota vencida y encabeza la mora.";
  return "Su próxima cuota vence pronto: un aviso a tiempo evita la mora.";
}

function facts(row: ReceivableDTO, now: Date): WriteFirstFact[] {
  const out: WriteFirstFact[] = [];
  if (row.days_overdue > 0) {
    out.push({
      label: "Venció",
      value:
        row.days_overdue === 1
          ? "ayer"
          : `hace ${String(row.days_overdue)} días`,
    });
  } else if (row.next_due_at !== null) {
    const days = daysUntil(row.next_due_at, now);
    out.push({
      label: "Vence",
      value:
        days === 0
          ? "hoy"
          : days === 1
            ? "mañana"
            : `el ${formatShortDate(row.next_due_at)}`,
    });
  }
  if (row.active_promise_at !== null) {
    out.push({
      label: "Promesa",
      value: `para el ${formatShortDate(row.active_promise_at)}`,
    });
  }
  out.push({
    label: "Último aviso",
    value: reminderFact(row.last_reminder, now),
  });
  return out;
}

/**
 * El último aviso en la voz de la isla: «ayer · no salió». La fila ya dice la
 * razón («sin plantilla aprobada»); aquí basta con saber si llegó.
 */
export function reminderFact(
  last: ReceivableDTO["last_reminder"],
  now: Date = new Date(),
): string {
  if (last === null) return "ninguno todavía";
  const when = relativeDay(last.at, now);
  if (last.status === "skipped") return `${when} · no salió`;
  if (last.status === "failed") return `${when} · falló`;
  return `${when} · ${REMINDER_STATUS_LABELS[last.status].toLowerCase()}`;
}

/** «Andrés Molina» → «AM»; un solo nombre → sus dos primeras letras. */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word !== "");
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
