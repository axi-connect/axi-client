"use client";

import { formatMoney, formatShortDate } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import {
  initialsOf,
  type WriteFirst,
} from "@/modules/collections/domain/write-first";
import type { ReceivableDTO } from "@/modules/collections/domain/receivable";

/**
 * «Escribe primero a» (Cobros premium P4): la isla de la cartera. Es la
 * primera fila del orden contada como decisión — a quién, cuánto pedirle y
 * por qué ahora — con las mismas dos acciones de la fila. Cristal blanco con
 * brillo de marca (criterio de islas): es contenido, no una barra de acción.
 *
 * En el celular se queda en lo esencial (quién, cuánto, escribirle); el porqué
 * y los hechos aparecen desde `md`, donde la isla tiene su columna.
 */
export function WriteFirstIsland({
  first,
  onWrite,
  onPromise,
  className,
}: {
  first: WriteFirst;
  onWrite: (row: ReceivableDTO) => void;
  /** Sin permiso (o con promesa viva) no se ofrece anotar otra. */
  onPromise?: (row: ReceivableDTO) => void;
  className?: string;
}) {
  const { row } = first;
  return (
    <InkIsland
      label="Escribe primero a"
      className={`gap-4 p-5 md:p-6 ${className ?? ""}`}
    >
      <Kicker>Escribe primero a</Kicker>
      <div className="flex min-w-0 items-center gap-3.5">
        <span
          aria-hidden="true"
          className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-muted font-heading text-base font-bold md:grid"
        >
          {initialsOf(row.contact_name)}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p
            className="truncate font-heading text-xl leading-tight font-bold md:text-2xl"
            title={row.contact_name}
          >
            {row.contact_name}
          </p>
          <p className="flex flex-wrap gap-x-1.5 text-[12.5px] text-muted-foreground">
            <span className="whitespace-nowrap">
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
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-heading text-3xl leading-none font-bold tracking-tight whitespace-nowrap tabular-nums md:text-4xl">
          {formatMoney(first.askCents, row.currency)}
        </p>
        <p className="text-[12.5px] text-muted-foreground tabular-nums">
          {first.askKind === "balance" ? "todo lo que debe" : "vencido"}
          {first.partial ? (
            // Una sola frase: la cifra del saldo no es una pieza aparte, es
            // contexto de la de arriba.
            <>{` · debe ${formatMoney(row.balance_cents, row.currency)} en total`}</>
          ) : null}
        </p>
      </div>

      <p className="hidden text-sm leading-relaxed text-pretty text-foreground/80 md:block">
        {first.why}
      </p>

      <dl className="hidden md:block">
        {first.facts.map((fact) => (
          <div
            key={fact.label}
            className="flex justify-between gap-3 border-t border-border py-2.5 text-[13px]"
          >
            <dt className="text-muted-foreground">{fact.label}</dt>
            <dd
              className="min-w-0 truncate text-right font-medium"
              title={fact.value}
            >
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto flex flex-wrap gap-2 md:flex-col">
        <Button
          variant="contrast"
          className="h-11 flex-1 rounded-full"
          onClick={() => onWrite(row)}
        >
          Escribirle
        </Button>
        {onPromise !== undefined && row.active_promise_at === null ? (
          <Button
            variant="glass"
            className="h-11 flex-1"
            onClick={() => onPromise(row)}
          >
            Anotar promesa
          </Button>
        ) : null}
      </div>
    </InkIsland>
  );
}
