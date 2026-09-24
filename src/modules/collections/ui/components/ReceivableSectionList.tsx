"use client";

import {
  Calendar,
  CalendarClock,
  Check,
  CircleAlert,
  Ellipsis,
  ExternalLink,
  Handshake,
  Plane,
  Send,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { promiseLine } from "@/modules/collections/domain/promise";
import { lastReminderLine } from "@/modules/collections/domain/reminder";
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
 * La fila deja de ser UN enlace porque ahora tiene una acción propia, y un
 * botón dentro de un enlace no es HTML válido: el nombre estira su área hasta
 * cubrir la fila —patrón de tarjeta enlazada— y «Escribir» queda por encima.
 * Sigue habiendo una sola acción por fila, que es lo que F4 dejó dicho.
 *
 * El «último aviso» baja al subtítulo y no vuelve como columna: F4 quitó la
 * tabla a propósito. Es contexto para decidir, no una cifra que comparar — y
 * «no salió» tiene que leerse tan claro como «entregado», porque es justo lo
 * que cambia lo que el operador hace a continuación.
 *
 * F4b: «Escribir» sigue siendo la única diana visible; lo que no cabe en una
 * diana —anotar la promesa, reprogramar, abrir el pedido— va en «…», como en
 * la fila de documentos de F8. La promesa se lee en la fila como texto: viva
 * con su fecha, rota si el día pasó sin pago.
 */
export type RowActions = {
  onWrite: (row: ReceivableDTO) => void;
  onPromise?: (row: ReceivableDTO) => void;
  onReschedule?: (row: ReceivableDTO) => void;
};

function Row({
  row,
  onWrite,
  onPromise,
  onReschedule,
}: { row: ReceivableDTO } & RowActions) {
  const late = row.days_overdue > 0;
  const due = dueLabel(row);
  const reminder = lastReminderLine(row.last_reminder);
  const promise = promiseLine(row);
  const menu = onPromise !== undefined || onReschedule !== undefined;
  return (
    <div className="relative grid min-h-[76px] w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-foreground/[0.03] focus-within:bg-foreground/[0.03] [&+&]:before:absolute [&+&]:before:inset-x-0 [&+&]:before:left-5 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-border/60">
      <span className="min-w-0">
        <Link
          href={`/orders/${row.order_id}`}
          className="block truncate text-[15.5px] font-medium tracking-[-0.005em] after:absolute after:inset-0 after:content-['']"
        >
          {row.contact_name}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted-foreground">
          <span className="font-mono text-[11.5px]">
            {row.order_number === null
              ? "Borrador"
              : `#${String(row.order_number).padStart(4, "0")}`}
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
          {row.paused ? (
            <>
              <span aria-hidden="true">·</span>
              {/* Pausado sigue siendo deuda y sigue contando: lo que se detuvo
                  es la persecución, y por eso se dice en vez de esconderse. */}
              <span className="text-foreground">en pausa</span>
            </>
          ) : null}
          {promise !== null ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-foreground">
                {promise.tone === "warning" ? (
                  <TriangleAlert
                    aria-hidden="true"
                    className="size-3 text-warning"
                  />
                ) : (
                  <Handshake aria-hidden="true" className="size-3 text-info" />
                )}
                {promise.text}
              </span>
            </>
          ) : null}
        </span>
        <span
          className={`mt-1 flex items-center gap-1.5 text-[12.5px] ${
            reminder.tone === "warning"
              ? "text-warning"
              : "text-muted-foreground"
          }`}
        >
          <Send aria-hidden="true" className="size-3 shrink-0" />
          {reminder.text}
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
              <Calendar
                aria-hidden="true"
                className="mr-1 inline size-3 align-[-2px]"
              />
              {row.next_due_at === null
                ? "Sin cuota"
                : formatShortDate(row.next_due_at)}
            </>
          ) : (
            <>
              {due}
              {late &&
              row.overdue_cents > 0 &&
              row.overdue_cents < row.balance_cents ? (
                // Lo vencido no siempre es todo lo que debe (QA F4-08): con la
                // cuota 2 vencida y la 3 en noviembre, aquí va la 2.
                <span className="text-muted-foreground">
                  {" · "}
                  {formatMoney(row.overdue_cents, row.currency)}
                </span>
              ) : null}
            </>
          )}
        </span>
      </span>
      <span className="relative z-[1] flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => onWrite(row)}>
          <Send aria-hidden="true" className="size-3.5" />
          Escribir
        </Button>
        {menu ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground"
                aria-label={`Más acciones · ${row.contact_name}`}
              >
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl p-1.5">
              {onPromise !== undefined && row.active_promise_at === null ? (
                <DropdownMenuItem
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                  onClick={() => onPromise(row)}
                >
                  <Handshake className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">
                      Anotar promesa de pago
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Pausa los recordatorios hasta la fecha
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : null}
              {onReschedule !== undefined ? (
                <DropdownMenuItem
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5"
                  onClick={() => onReschedule(row)}
                >
                  <CalendarClock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">
                      Reprogramar cuotas
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Solo lo pendiente; la suma tiene que cuadrar
                    </span>
                  </span>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <Link
                role="menuitem"
                href={`/orders/${row.order_id}`}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-accent focus:bg-accent focus:outline-none"
              >
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                Abrir el pedido
              </Link>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Las secciones de la cartera, ordenadas por urgencia.
 *
 * Los dos ejes —qué pasó con el servicio, cuánta prisa corre el dinero— los
 * lleva la SECCIÓN y no la fila: el operador lee el titular y baja, en vez de
 * descodificar un color y un icono en cada renglón.
 */
export function ReceivableSectionList({
  sections,
  onWrite,
  onPromise,
  onReschedule,
}: { sections: ReceivableSection[] } & RowActions) {
  return (
    <div>
      {sections.map((section) => {
        const Icon = SECTION_ICONS[section.icon];
        return (
          <section key={section.key} className="[&+&]:mt-7">
            <h2 className="flex items-center gap-2.5 px-1 pb-2.5 text-[13px] text-muted-foreground">
              <Icon
                aria-hidden="true"
                className={`size-[15px] ${SECTION_TONES[section.tone]}`}
              />
              <span className="font-medium text-foreground">
                {section.title}
              </span>
              <span className="ml-auto tabular-nums">
                {section.rows.length}
              </span>
            </h2>
            <div className="overflow-hidden rounded-[18px] border border-border bg-background">
              {section.rows.map((row) => (
                <Row
                  key={row.plan_id}
                  row={row}
                  onWrite={onWrite}
                  onPromise={onPromise}
                  onReschedule={onReschedule}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
