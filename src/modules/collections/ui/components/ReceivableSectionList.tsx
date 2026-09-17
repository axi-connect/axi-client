"use client";

import { Calendar, CalendarClock, Check, CircleAlert, ChevronRight, Plane } from "lucide-react";
import Link from "next/link";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import {
  dueLabel,
  type ReceivableDTO,
  type ReceivableSection,
} from "@/modules/collections/domain/receivable";

const SECTION_ICONS = {
  plane: Plane,
  "circle-alert": CircleAlert,
  "calendar-clock": CalendarClock,
  check: Check,
} as const;

const SECTION_TONES: Record<ReceivableSection["tone"], string> = {
  destructive: "text-destructive",
  warning: "text-warning",
  info: "text-info",
  success: "text-success",
};

/**
 * Una fila de la cartera.
 *
 * Un solo destino por fila y una sola diana: el nombre, el pedido, el importe y
 * la fecha. Las acciones viven en el pedido, que es donde se decide — tres
 * botones de icono por fila eran dieciocho dianas compitiendo en la columna que
 * se escanea.
 */
function Row({ row }: { row: ReceivableDTO }) {
  const late = row.days_overdue > 0;
  const due = dueLabel(row);
  return (
    <Link
      href={`/orders/${row.order_id}`}
      className="relative grid min-h-[72px] w-full grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] [&+&]:before:absolute [&+&]:before:inset-x-0 [&+&]:before:left-5 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-border/60"
    >
      <span className="min-w-0">
        <span className="block truncate text-[15.5px] font-medium tracking-[-0.005em]">
          {row.contact_name}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
          <span className="font-mono text-[11.5px]">
            {row.order_number === null ? "Borrador" : `#${String(row.order_number).padStart(4, "0")}`}
          </span>
          {row.service_date !== null ? (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {row.travelled ? "viajó el " : "sale el "}
                {formatShortDate(row.service_date)}
              </span>
            </>
          ) : null}
          {row.active_promise_at !== null ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-foreground">
                prometió el {formatShortDate(row.active_promise_at)}
              </span>
            </>
          ) : null}
        </span>
      </span>
      <span className="text-right">
        <span className="block text-[16.5px] font-semibold tracking-[-0.015em] tabular-nums">
          {formatMoney(row.balance_cents, row.currency)}
        </span>
        <span
          className={`mt-0.5 block text-[12.5px] tabular-nums ${late ? "text-destructive" : "text-muted-foreground"}`}
        >
          {due === "" ? (
            <>
              <Calendar aria-hidden="true" className="mr-1 inline size-3 align-[-2px]" />
              {row.next_due_at === null ? "Sin cuota" : formatShortDate(row.next_due_at)}
            </>
          ) : (
            due
          )}
        </span>
      </span>
      <ChevronRight aria-hidden="true" className="size-[18px] text-muted-foreground/50" />
    </Link>
  );
}

/**
 * Las secciones de la cartera, ordenadas por urgencia.
 *
 * Los dos ejes —qué pasó con el servicio, cuánta prisa corre el dinero— los
 * lleva la SECCIÓN y no la fila: el operador lee el titular y baja, en vez de
 * descodificar un color y un icono en cada renglón.
 */
export function ReceivableSectionList({ sections }: { sections: ReceivableSection[] }) {
  return (
    <div>
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section.icon];
        return (
          <section key={section.key} className="[&+&]:mt-7">
            <h2 className="flex items-center gap-2.5 px-1 pb-2.5 text-[13px] text-muted-foreground">
              <Icon aria-hidden="true" className={`size-[15px] ${SECTION_TONES[section.tone]}`} />
              <span className="font-medium text-foreground">{section.title}</span>
              <span className="ml-auto tabular-nums">{section.rows.length}</span>
            </h2>
            <div className="overflow-hidden rounded-[18px] border border-border bg-background">
              {section.rows.map((row) => (
                <Row key={row.plan_id} row={row} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
