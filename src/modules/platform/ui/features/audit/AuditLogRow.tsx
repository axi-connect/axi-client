"use client";

/**
 * Fila expandible del visor de auditoría. Cerrada: fecha relativa + acción
 * (mono) + actor (badge por tono) + tenant. Expandida: `JsonDiff` de
 * `changes` + ip + trace_id copiable + entidad. Los eventos de riesgo llevan
 * borde izquierdo rojo sutil (nunca fondo — el rojo señala, no grita).
 */
import { useState } from "react";
import { Check, ChevronRight, Copy } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { ACTOR_TONES, RISK_ACTIONS, type AuditLog } from "../../../domain/audit";
import { JsonDiff } from "../../components/JsonDiff";
import { RelativeDate } from "../../components/RelativeDate";
import { useCopy } from "../../hooks/use-copy";

const ACTOR_BADGE_CLASSES: Record<(typeof ACTOR_TONES)[keyof typeof ACTOR_TONES], string> = {
  violet: "border-accent-violet/40 bg-accent-violet/10 text-accent-violet",
  neutral: "border-border text-muted-foreground",
  info: "border-info/40 bg-info/10 text-info",
};

type AuditLogRowProps = {
  log: AuditLog;
  /** Nombre del tenant (mapa de la vista); null si no aplica u oculto. */
  tenantName?: string | null;
  /** Oculta la columna tenant (tab del tenant: company_id fijado). */
  showTenant?: boolean;
};

export function AuditLogRow({ log, tenantName, showTenant = true }: AuditLogRowProps) {
  const [expanded, setExpanded] = useState(false);
  const { copied, copy } = useCopy();
  const isRisk = RISK_ACTIONS.has(log.action);

  return (
    <li
      className={cn(
        "border-b border-border last:border-b-0",
        isRisk && "border-l-2 border-l-destructive/40",
      )}
    >
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
        <RelativeDate iso={log.occurred_at} className="w-24 shrink-0 text-xs text-muted-foreground" />
        <span className={cn("font-mono text-xs", isRisk && "font-medium text-destructive")}>{log.action}</span>
        <Badge variant="outline" className={cn("ml-auto", ACTOR_BADGE_CLASSES[ACTOR_TONES[log.actor_type]])}>
          {log.actor_type}
        </Badge>
        {showTenant && (
          <span className="w-32 shrink-0 truncate text-right text-xs text-muted-foreground">
            {log.company_id ? tenantName ?? `${log.company_id.slice(0, 8)}…` : "—"}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-3 px-10 pb-3">
          <JsonDiff changes={log.changes} />
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {log.ip && <span>ip <span className="font-mono">{log.ip}</span></span>}
            {log.trace_id && (
              <button
                type="button"
                onClick={() => void copy(log.trace_id!)}
                aria-label={`Copiar trace ${log.trace_id}`}
                className="inline-flex items-center gap-1 font-mono transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                trace: {log.trace_id}
                {copied ? <Check aria-hidden="true" className="size-3 text-success" /> : <Copy aria-hidden="true" className="size-3" />}
              </button>
            )}
            {log.entity_type && (
              <span>
                entidad <span className="font-mono">{log.entity_type}{log.entity_id ? `/${log.entity_id.slice(0, 8)}…` : ""}</span>
              </span>
            )}
          </p>
        </div>
      )}
    </li>
  );
}
