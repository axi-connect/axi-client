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
  type CallDirection,
  type CallOutcome,
} from "@/modules/calls/domain/call";
import { getTenantAgents, type AssignableAgent } from "@/modules/agents/public";

const ALL = "__all__";

export type CallDateRange = "7d" | "30d";

export type CallFiltersValue = {
  direction?: CallDirection;
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
