"use client";

import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { ProductVariantDTO } from "@/modules/catalog/domain/product";

const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

/** «sáb 14 nov»: la fecha de una salida como se dice en voz alta. */
export function departureLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year!, (month ?? 1) - 1, day);
  return `${DAYS[date.getDay()]!} ${String(date.getDate())} ${MONTHS[date.getMonth()]!}`;
}

/** Hoy en el día LOCAL de quien mira (YYYY-MM-DD): en UTC, de noche, la cuenta salía corta. */
function localToday(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${String(y)}-${m}-${d}`;
}

export interface Departure {
  id: string;
  date: string;
  label: string;
  past: boolean;
  /**
   * Cupos libres, con la MISMA regla que la tabla de variantes: agotada según
   * su umbral ⇒ 0. `null` si la salida no lleva inventario o es un servicio.
   */
  seatsLeft: number | null;
}

/** Las salidas de un producto: sus variantes con fecha, en orden de calendario. */
export function departuresOf(
  variants: readonly ProductVariantDTO[],
  now: Date = new Date(),
  isService = false,
): Departure[] {
  const today = localToday(now);
  return variants
    .filter(
      (variant): variant is ProductVariantDTO & { service_date: string } =>
        typeof variant.service_date === "string",
    )
    .map((variant) => ({
      id: variant.id,
      date: variant.service_date,
      label: departureLabel(variant.service_date),
      past: variant.service_date < today,
      seatsLeft:
        isService || !variant.stock
          ? null
          : variant.stock.available
            ? Math.max(0, variant.stock.on_hand)
            : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * El calendario de salidas (Cobros premium P2, DESIGN-SYSTEM §9.6): un nodo por
 * variante con fecha sobre un riel, el tramo ya recorrido en tinta y «hoy»
 * marcado. Cada nodo dice su fecha y cuántos cupos quedan. En el celular la
 * fila se desplaza dentro de sí misma.
 */
export function DepartureCalendar({
  variants,
  now,
  isService = false,
}: {
  variants: readonly ProductVariantDTO[];
  now?: Date;
  /** Un servicio no lleva cupos: el nodo solo dice la fecha. */
  isService?: boolean;
}) {
  const departures = departuresOf(variants, now, isService);
  if (departures.length === 0) return null;
  const pastCount = departures.filter((departure) => departure.past).length;

  return (
    <section
      aria-label="Calendario de salidas"
      className="rounded-3xl border border-border bg-card px-5 py-4"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 pb-3">
        <p className="text-xs whitespace-nowrap text-muted-foreground">
          Calendario de salidas
        </p>
        <p className="text-xs text-muted-foreground">
          {departures.length - pastCount} por salir · {pastCount}{" "}
          {pastCount === 1 ? "ya salió" : "ya salieron"}
        </p>
      </div>
      <div className="sidebar-scroll overflow-x-auto">
        <ol className="relative flex min-w-max gap-2 pb-1">
          {departures.map((departure, index) => (
            <li
              key={departure.id}
              className="relative flex w-28 shrink-0 flex-col items-center gap-1.5 text-center"
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-[19px] right-1/2 h-0.5 w-[calc(100%+0.5rem)]",
                    departure.past ? "bg-foreground" : "bg-border",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] grid size-10 place-items-center rounded-full text-xs font-semibold tabular-nums",
                  departure.past
                    ? "bg-foreground text-background"
                    : departure.seatsLeft === 0
                      ? "border border-border bg-muted text-muted-foreground"
                      : "border border-border bg-card",
                )}
              >
                {departure.past ? (
                  <Check
                    aria-hidden="true"
                    className="size-4"
                    strokeWidth={2.5}
                  />
                ) : (
                  (departure.seatsLeft ?? "·")
                )}
              </span>
              <span className="text-xs font-semibold whitespace-nowrap">
                {departure.label}
              </span>
              <span className="text-xs whitespace-nowrap text-muted-foreground">
                {departure.past
                  ? "ya salió"
                  : isService
                    ? "por salir"
                    : departure.seatsLeft === null
                      ? "sin inventario"
                      : departure.seatsLeft === 0
                        ? "llena"
                        : departure.seatsLeft === 1
                          ? "1 cupo"
                          : `${String(departure.seatsLeft)} cupos`}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
