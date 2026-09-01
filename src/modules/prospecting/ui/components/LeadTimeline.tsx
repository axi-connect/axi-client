"use client";

import { formatShortDate } from "@/core/lib/format";

import type { LeadEventDTO } from "../../domain/lead";

const EVENT_LABELS: Record<LeadEventDTO["type"], string> = {
  discovered: "Descubierto",
  enriched: "Datos completados",
  verified: "Verificado",
  scored: "Calificado",
  promoted: "Promovido al CRM",
  rejected: "Descartado",
  suppressed: "Marcado como «no contactar»",
  provider_error: "Falló una consulta al proveedor",
};

const ACTOR_LABELS: Record<LeadEventDTO["actor_type"], string> = {
  system: "automático",
  user: "una persona",
  provider: "un proveedor",
};

/**
 * La historia del dato.
 *
 * Es lo primero que se pide en una reclamación de habeas data: de dónde salió,
 * quién lo tocó y cuándo. Por eso se muestra completa y en orden ascendente —
 * se lee como una historia, no como un log al revés.
 */
export function LeadTimeline({ events }: { events: LeadEventDTO[] }) {
  return (
    <div>
      <p className="text-muted-foreground mb-3 text-[10.5px] font-semibold tracking-wider uppercase">
        Historia del dato
      </p>
      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Sin movimientos todavía.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id} className="border-border border-l-2 pl-3">
              <p className="text-sm font-semibold">
                {EVENT_LABELS[event.type]}
              </p>
              <p className="text-muted-foreground text-xs">
                {event.provider ?? ACTOR_LABELS[event.actor_type]} ·{" "}
                {formatShortDate(event.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
