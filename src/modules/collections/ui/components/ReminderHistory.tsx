"use client";

import { useEffect, useState } from "react";
import { BellOff, CheckCheck, CircleAlert, Clock } from "lucide-react";

import { formatShortDate } from "@/core/lib/format";
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
    <ol className="flex flex-col">
      {rows.map((row, index) => {
        const { Icon, tone } = VISUALS[row.status];
        return (
          <li
            key={row.id}
            className="relative grid grid-cols-[26px_minmax(0,1fr)_auto] items-start gap-3.5 py-3"
          >
            {index === rows.length - 1 ? null : (
              <span
                aria-hidden="true"
                className="absolute bottom-[-12px] left-3 top-8 w-px bg-border"
              />
            )}
            <span
              className={`z-[1] grid size-[26px] place-items-center rounded-full ${tone}`}
            >
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
            <div className="min-w-0">
              <p
                className={`text-[13.5px] ${
                  row.status === "skipped"
                    ? "text-muted-foreground"
                    : "font-medium"
                }`}
              >
                {title(row)}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
                {detail(row)}
              </p>
            </div>
            <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
              {formatShortDate(row.created_at)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const VISUALS: Record<
  PlanReminderDTO["status"],
  { Icon: typeof CheckCheck; tone: string }
> = {
  queued: { Icon: Clock, tone: "bg-secondary text-muted-foreground" },
  // §10: el verde como texto da ~3,3:1; el color va al icono y el texto en foreground.
  sent: {
    Icon: CheckCheck,
    tone: "bg-success/12 text-foreground [&>svg]:text-success",
  },
  delivered: {
    Icon: CheckCheck,
    tone: "bg-success/12 text-foreground [&>svg]:text-success",
  },
  failed: { Icon: CircleAlert, tone: "bg-destructive/15 text-destructive" },
  skipped: { Icon: BellOff, tone: "bg-secondary text-muted-foreground" },
};

/** El titular dice QUÉ pasó; el detalle, a quién y por qué. */
function title(row: PlanReminderDTO): string {
  if (row.status === "skipped")
    return `No se escribió · ${skipReasonLabel(row.skip_reason)}`;
  if (row.status === "failed") return "El aviso falló";
  return `${REMINDER_STATUS_LABELS[row.status]} · ${reminderKeyLabel(row.reminder_key)}`;
}

function detail(row: PlanReminderDTO): string {
  const via = REMINDER_CHANNEL_LABELS[row.channel];
  if (row.status === "failed") {
    return row.error_code === null
      ? `${via} lo aceptó y lo rechazó después.`
      : `${via} lo rechazó: ${row.error_code}.`;
  }
  if (row.status === "skipped")
    return `${reminderKeyLabel(row.reminder_key)} · por ${via}`;
  return `Por ${via}`;
}
