"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  CALL_OUTCOME_MAP,
  DIRECTION_LABELS,
  MODE_LABELS,
  type CallDirection,
  type CallMode,
  type CallOutcome,
} from "@/modules/calls/domain/call";
import { CALL_TYPE_LABELS, PROACTIVE_CALL_TYPES } from "@/modules/calls/domain/playbooks";
import { getTenantAgents, type AssignableAgent } from "@/modules/agents/public";

const ALL = "__all__";

export type CallDateRange = "7d" | "30d";

export type CallFiltersValue = {
  direction?: CallDirection;
  /** Plan de modos. */
  mode?: CallMode;
  call_type?: string;
  outcome?: CallOutcome;
  ai_agent_id?: string;
  range?: CallDateRange;
};

const RANGE_LABELS: Record<CallDateRange, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
};

/**
 * Fila de filtros del historial (molde: ContactFilters del CRM). Selects
 * simples porque el backend filtra por UN valor por dimensión — un panel
 * multi-selección prometería combinaciones que la API no soporta.
 */
export function CallFilters({
  value,
  onChange,
}: {
  value: CallFiltersValue;
  onChange: (value: CallFiltersValue) => void;
}) {
  const [agents, setAgents] = useState<AssignableAgent[]>([]);

  useEffect(() => {
    let cancelled = false;
    getTenantAgents()
      .then((list) => {
        if (!cancelled) setAgents(list);
      })
      // Sin agentes no hay filtro de agente; el resto sigue funcionando.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={value.direction ?? ALL}
        onValueChange={(v: string) =>
          onChange({ ...value, direction: v === ALL ? undefined : (v as CallDirection) })
        }
      >
        <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Filtrar por dirección">
          <SelectValue placeholder="Dirección" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas</SelectItem>
          {(Object.keys(DIRECTION_LABELS) as CallDirection[]).map((direction) => (
            <SelectItem key={direction} value={direction}>
              {DIRECTION_LABELS[direction]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.mode ?? ALL}
        onValueChange={(v: string) => onChange({ ...value, mode: v === ALL ? undefined : (v as CallMode) })}
      >
        <SelectTrigger className="h-9 w-full sm:w-36" aria-label="Filtrar por modo">
          <SelectValue placeholder="Modo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los modos</SelectItem>
          {(Object.keys(MODE_LABELS) as CallMode[]).map((mode) => (
            <SelectItem key={mode} value={mode}>
              {MODE_LABELS[mode]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.call_type ?? ALL}
        onValueChange={(v: string) => onChange({ ...value, call_type: v === ALL ? undefined : v })}
      >
        <SelectTrigger className="h-9 w-full sm:w-52" aria-label="Filtrar por tipo de llamada">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los tipos</SelectItem>
          {PROACTIVE_CALL_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {CALL_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={value.outcome ?? ALL}
        onValueChange={(v: string) =>
          onChange({ ...value, outcome: v === ALL ? undefined : (v as CallOutcome) })
        }
      >
        <SelectTrigger className="h-9 w-full sm:w-44" aria-label="Filtrar por resultado">
          <SelectValue placeholder="Resultado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos los resultados</SelectItem>
          {Object.entries(CALL_OUTCOME_MAP).map(([outcome, entry]) => (
            <SelectItem key={outcome} value={outcome}>
              {entry.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {agents.length > 0 && (
        <Select
          value={value.ai_agent_id ?? ALL}
          onValueChange={(v: string) =>
            onChange({ ...value, ai_agent_id: v === ALL ? undefined : v })
          }
        >
          <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filtrar por agente">
            <SelectValue placeholder="Agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los agentes</SelectItem>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={value.range ?? ALL}
        onValueChange={(v: string) =>
          onChange({ ...value, range: v === ALL ? undefined : (v as CallDateRange) })
        }
      >
        <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filtrar por fecha">
          <SelectValue placeholder="Fecha" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas las fechas</SelectItem>
          {(Object.keys(RANGE_LABELS) as CallDateRange[]).map((range) => (
            <SelectItem key={range} value={range}>
              {RANGE_LABELS[range]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** El rango relativo se traduce a `from` ISO en el momento de consultar. */
export function rangeToFromIso(range: CallDateRange | undefined): string | undefined {
  if (range === undefined) return undefined;
  const days = range === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
