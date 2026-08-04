"use client";

/**
 * Directorio de contactos del tenant (cap 25, sin paginación): lista
 * seleccionable con identidad + etapa de ciclo de vida. Los `simulated`
 * llevan badge violeta — el depurador los muestra a propósito.
 */
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { DebugContact } from "../../../../domain/quality-debug";

type ContactsListProps = {
  contacts: DebugContact[];
  selectedId: string | null;
  onSelect: (contact: DebugContact) => void;
};

export function SimulatedBadge() {
  return (
    <Badge variant="outline" className="border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
      Simulada
    </Badge>
  );
}

export function ContactsList({ contacts, selectedId, onSelect }: ContactsListProps) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-background">
      {contacts.map((contact) => {
        const isSelected = contact.id === selectedId;
        return (
          <li key={contact.id}>
            <button
              type="button"
              onClick={() => onSelect(contact)}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                isSelected ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {contact.full_name ?? "Sin nombre"}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[contact.phone, contact.email].filter(Boolean).join(" · ") || "Sin identidad"}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {contact.lifecycle_stage} · <RelativeDate iso={contact.created_at} />
                </span>
              </span>
              {contact.simulated && <SimulatedBadge />}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
