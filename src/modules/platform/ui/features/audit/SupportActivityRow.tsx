"use client";

/**
 * O11: la actividad de UNA sesión de soporte (una fila `support.*` por
 * request) en una sola fila expandible: «Sesión de soporte · N pantallas · M
 * cambios». Abierta, cada request con su método, ruta y status; nunca el body.
 */
import { useState } from "react";
import { ChevronRight, LifeBuoy } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { RelativeDate } from "@/shared/components/ui/relative-date";
import type { AuditLog } from "../../../domain/audit";
import { plural } from "../../../domain/support-sessions";

type Activity = { method?: unknown; route?: unknown; status?: unknown };

function activityOf(log: AuditLog): { method: string; route: string; status: string } {
  const changes = (log.changes ?? {}) as Activity;
  return {
    method: typeof changes.method === "string" ? changes.method : "—",
    route: typeof changes.route === "string" ? changes.route : "—",
    status: typeof changes.status === "number" ? String(changes.status) : "—",
  };
}

export function SupportActivityRow({
  logs,
  screens,
  changes,
  failed,
  occurredAt,
  actorLabel,
}: {
  logs: AuditLog[];
  screens: number;
  changes: number;
  failed: number;
  occurredAt: string;
  actorLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <ChevronRight
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
        />
        <RelativeDate iso={occurredAt} className="w-24 shrink-0 text-xs text-muted-foreground" />
        <span className="inline-flex items-center gap-1.5">
          <LifeBuoy aria-hidden="true" className="size-3.5 text-accent-violet" />
          Sesión de soporte · {plural(screens, "pantalla", "pantallas")} · {plural(changes, "cambio", "cambios")}
          {failed > 0 ? ` · ${plural(failed, "rechazado", "rechazados")}` : ""}
        </span>
        <Badge variant="outline" className="ml-auto border-accent-violet/40 bg-accent-violet/10 text-accent-violet">
          {actorLabel}
        </Badge>
      </button>
      {expanded ? (
        <ol className="space-y-1 px-10 pb-3 font-mono text-xs text-muted-foreground">
          {logs.map((log) => {
            const activity = activityOf(log);
            return (
              <li key={log.id} className="flex flex-wrap gap-x-3">
                <span className="w-12 shrink-0">{activity.method}</span>
                <span className="min-w-0 flex-1 truncate text-foreground">{activity.route}</span>
                <span className={cn(log.action === "support.write_failed" && "text-destructive")}>{activity.status}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </li>
  );
}
