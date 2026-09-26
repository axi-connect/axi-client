"use client";

import {
  Calendar,
  CalendarClock,
  Ellipsis,
  ExternalLink,
  Handshake,
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
  sectionOf,
  type ReceivableDTO,
  type ReceivableSection,
  type ReceivableSectionKey,
} from "@/modules/collections/domain/receivable";
import { initialsOf } from "@/modules/collections/domain/write-first";

/** El punto de la prisa del dinero: la sección ya lo dice, la fila lo recuerda al bajar. */
const MONEY_DOT: Record<ReceivableSectionKey, string> = {
  travelled: "bg-destructive",
  overdue: "bg-destructive",
  soon: "bg-warning",
  current: "bg-foreground",
};

/**
 * Una fila de la cartera (Cobros premium P4).
 *
 * La fila no es UN enlace porque tiene una acción propia, y un botón dentro de
 * un enlace no es HTML válido: el nombre estira su área hasta cubrir la fila
 * —patrón de tarjeta enlazada— y «Escribir» queda por encima. Una sola diana
 * visible; lo demás (anotar promesa, reprogramar, abrir el pedido) va en «…».
 *
 * A la izquierda, el punto de la prisa del dinero; el «último aviso» va en el
 * subtítulo y «no salió» se lee tan claro como «entregado», porque cambia lo
 * que el operador hace después. Las piezas del subtítulo no se parten por
 * dentro (QA: «#0004 · sale el…» cortado a 390 px): se envuelven enteras.
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
    <div className="relative grid grid-cols-[0.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 py-4 transition-colors hover:bg-foreground/[0.02] focus-within:bg-foreground/[0.02] md:grid-cols-[0.5rem_2.25rem_minmax(0,1fr)_auto_auto] md:gap-x-4 [&+&]:border-t [&+&]:border-border/60">
      <span
        aria-hidden="true"
        className={`size-2 self-start rounded-full md:self-center ${MONEY_DOT[sectionOf(row)]} mt-[7px] md:mt-0`}
      />
      <span
        aria-hidden="true"
        className="hidden size-9 place-items-center rounded-full bg-muted text-xs font-semibold md:grid"
      >
        {initialsOf(row.contact_name)}
      </span>
      <span className="min-w-0">
        <Link
          href={`/orders/${row.order_id}`}
          className="block truncate text-[15px] leading-6 font-semibold tracking-[-0.005em] after:absolute after:inset-0 after:content-['']"
        >
          {row.contact_name}
        </Link>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12.5px] text-muted-foreground">
          <span className="font-mono text-[11.5px] whitespace-nowrap">
            {row.order_number === null
              ? "Borrador"
              : `#${String(row.order_number).padStart(4, "0")}`}
          </span>
          {row.service_date !== null ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap">
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
              <span className="whitespace-nowrap text-foreground">
                en pausa
              </span>
            </>
          ) : null}
          {promise !== null ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-foreground">
                {promise.tone === "warning" ? (
                  <TriangleAlert
                    aria-hidden="true"
                    className="size-3 shrink-0 text-warning"
                  />
                ) : (
                  <Handshake
                    aria-hidden="true"
                    className="size-3 shrink-0 text-info"
                  />
                )}
                {promise.text}
              </span>
            </>
          ) : null}
        </span>
        <span
          className={`mt-1 flex items-center gap-1.5 text-[12.5px] ${
            reminder.tone === "warning"
              ? "text-foreground"
              : "text-muted-foreground"
          }`}
        >
          <Send
            aria-hidden="true"
            className={`size-3 shrink-0 ${reminder.tone === "warning" ? "text-warning" : ""}`}
          />
          {reminder.text}
        </span>
      </span>
      <span className="col-start-2 flex items-center justify-between gap-3 md:contents">
        <span className="text-left md:self-center md:text-right">
          <span className="block text-[15px] font-semibold tracking-[-0.015em] whitespace-nowrap tabular-nums">
            {formatMoney(row.balance_cents, row.currency)}
          </span>
          <span
            className={`mt-0.5 block text-[12.5px] whitespace-nowrap tabular-nums ${late ? "text-destructive" : "text-muted-foreground"}`}
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
        <span className="relative z-[1] flex items-center justify-end gap-1">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => onWrite(row)}
          >
            <Send aria-hidden="true" className="size-3.5" />
            Escribir
          </Button>
          {menu ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-full text-muted-foreground"
                  aria-label={`Más acciones · ${row.contact_name}`}
                >
                  <Ellipsis className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 rounded-2xl p-1.5"
              >
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
      </span>
    </div>
  );
}

/** Suma de una sección, solo si todas sus filas cobran en la misma moneda. */
function sectionTotal(rows: readonly ReceivableDTO[]): string | null {
  const currency = rows[0]?.currency;
  if (currency === undefined || rows.some((row) => row.currency !== currency))
    return null;
  return formatMoney(
    rows.reduce((sum, row) => sum + row.balance_cents, 0),
    currency,
  );
}

/**
 * Las secciones de la cartera, ordenadas por urgencia, en una sola ficha.
 *
 * Los dos ejes —qué pasó con el servicio, cuánta prisa corre el dinero— los
 * lleva la SECCIÓN y no la fila: el operador lee el titular, su cuenta y su
 * total, y baja. Con una sola fila el total no se repite: sería la misma cifra
 * dos veces seguidas.
 */
export function ReceivableSectionList({
  sections,
  onWrite,
  onPromise,
  onReschedule,
}: { sections: ReceivableSection[] } & RowActions) {
  return (
    <div className="rounded-3xl border border-border bg-card px-4 pt-1 pb-1 md:px-5">
      {sections.map((section) => {
        const total =
          section.rows.length > 1 ? sectionTotal(section.rows) : null;
        return (
          <section
            key={section.key}
            className="[&+&]:border-t [&+&]:border-border"
          >
            <h2 className="flex items-center gap-2 pt-4 pb-1 text-[12.5px] text-muted-foreground">
              <span className="font-semibold text-foreground">
                {section.title}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{section.rows.length}</span>
              {total !== null ? (
                <span className="ml-auto whitespace-nowrap tabular-nums">
                  <span className="sr-only">Suma: </span>
                  {total}
                </span>
              ) : null}
            </h2>
            {section.rows.map((row) => (
              <Row
                key={row.plan_id}
                row={row}
                onWrite={onWrite}
                onPromise={onPromise}
                onReschedule={onReschedule}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
