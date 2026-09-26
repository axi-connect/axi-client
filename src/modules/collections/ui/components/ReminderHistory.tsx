"use client";

import { useEffect, useState } from "react";
import { BellOff, CheckCheck, CircleAlert, Clock } from "lucide-react";

import { formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import {
  StatePill,
  type StatePillTone,
} from "@/shared/components/features/bento";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  REMINDER_CHANNEL_LABELS,
  REMINDER_STATUS_LABELS,
  reminderKeyLabel,
  skipReasonLabel,
  type PlanReminderDTO,
} from "@/modules/collections/domain/reminder";
import { getPlanReminders } from "@/modules/collections/infrastructure/services/collections-service.adapter";

/**
 * El historial de avisos de un plan (F5).
 *
 * Lo que NO se mandó pesa lo mismo que lo que sí, y dice por qué. Un aviso que
 * no sale sin dejar rastro hace que «el negocio lo apagó» y «esto está roto» se
 * vean exactamente igual, que es como una función de avisos puede estar muerta
 * semanas sin que nadie se entere — ya pasó con los avisos de pedido.
 *
 * Por eso los omitidos salen en tono NEUTRO y no en rojo: casi siempre son una
 * decisión del negocio, y pintarlos como errores haría que el operador dejara
 * de mirar los dos.
 *
 * Cobros premium P5: cada evento lleva su `StatePill` (salió, no salió, falló)
 * con el color en el punto, y la razón va en negrita — es lo que se busca.
 */
export function ReminderHistory({
  planId,
  settled = false,
}: {
  planId: string;
  /** Plan saldado: no hay deuda y no saldrá ningún aviso (QA real F9-04). */
  settled?: boolean;
}) {
  const [rows, setRows] = useState<PlanReminderDTO[] | null>(null);

  useEffect(() => {
    let alive = true;
    getPlanReminders(planId)
      .then((result) => {
        if (alive) setRows(result.data);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [planId]);

  if (rows === null) return <Skeleton className="h-24 w-full rounded-xl" />;
  if (rows.length === 0) {
    return (
      <p className="text-[12.5px] leading-relaxed text-muted-foreground">
        {settled
          ? "Está al día: no hay nada que recordarle."
          : "Todavía no se le ha escrito por esta deuda. El primer aviso sale solo, según la cadencia de Ajustes › Pagos › Recordatorios."}
      </p>
    );
  }

  return (
    <ol className="m-0 flex list-none flex-col p-0">
      {rows.map((row, index) => {
        const visual = VISUALS[row.status];
        const Icon = visual.Icon;
        const reason = reasonOf(row);
        return (
          <li
            key={row.id}
            className="relative grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 py-3"
          >
            {index === rows.length - 1 ? null : (
              <span
                aria-hidden="true"
                className="absolute top-10 bottom-[-12px] left-[13px] w-0.5 rounded-full bg-border"
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "z-[1] grid size-7 place-items-center rounded-full",
                visual.chip,
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold">
                {reminderKeyLabel(row.reminder_key)}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                {row.channel === "email"
                  ? "Por correo"
                  : `Por ${REMINDER_CHANNEL_LABELS[row.channel]}`}
                {reason !== null ? (
                  <>
                    {" · "}
                    <b className="font-semibold text-foreground">{reason}</b>
                  </>
                ) : null}
              </p>
            </div>
            <span className="flex flex-col items-end gap-1.5">
              <StatePill tone={visual.tone}>{visual.label}</StatePill>
              <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {formatShortDate(row.created_at)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Cómo acabó, en una palabra: el color va en el punto de la píldora (§9.5). */
const VISUALS: Record<
  PlanReminderDTO["status"],
  { Icon: typeof CheckCheck; chip: string; tone: StatePillTone; label: string }
> = {
  queued: {
    Icon: Clock,
    chip: "bg-muted text-muted-foreground",
    tone: "neutral",
    label: REMINDER_STATUS_LABELS.queued,
  },
  sent: {
    Icon: CheckCheck,
    chip: "bg-foreground text-background",
    tone: "success",
    label: "Salió",
  },
  delivered: {
    Icon: CheckCheck,
    chip: "bg-foreground text-background",
    tone: "success",
    label: REMINDER_STATUS_LABELS.delivered,
  },
  failed: {
    Icon: CircleAlert,
    chip: "bg-destructive/10 text-destructive",
    tone: "destructive",
    label: REMINDER_STATUS_LABELS.failed,
  },
  skipped: {
    Icon: BellOff,
    chip: "bg-muted text-muted-foreground",
    tone: "neutral",
    label: "No salió",
  },
};

/** Por qué no salió o por qué falló; lo que salió no necesita razón. */
function reasonOf(row: PlanReminderDTO): string | null {
  if (row.status === "skipped") return skipReasonLabel(row.skip_reason);
  if (row.status === "failed") {
    return row.error_code === null
      ? "lo aceptó y lo rechazó después"
      : `lo rechazó: ${row.error_code}`;
  }
  return null;
}
