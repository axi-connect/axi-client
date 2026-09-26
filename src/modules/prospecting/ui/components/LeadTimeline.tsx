"use client";

import { formatShortDate } from "@/core/lib/format";
import { BentoTile } from "@/shared/components/features/bento";

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
    <BentoTile label="Historia del dato">
      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sin movimientos todavía.</p>
      ) : (
        <ol className="divide-border divide-y">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5 text-sm">
              <span className="font-medium">
                {EVENT_LABELS[event.type]}
                <span className="text-muted-foreground font-normal"> · {event.provider ?? ACTOR_LABELS[event.actor_type]}</span>
              </span>
              <span className="text-muted-foreground text-xs">{formatShortDate(event.created_at)}</span>
            </li>
          ))}
        </ol>
      )}
    </BentoTile>
  );
}
