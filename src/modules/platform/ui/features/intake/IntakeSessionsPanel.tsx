"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus } from "lucide-react";

import { TableSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl, type SegmentedItem } from "@/shared/components/ui/segmented";
import { needsAttention, type SessionStatus } from "../../../domain/intake";
import { useIntakeSessionsQuery } from "../../../infrastructure/api/hooks/use-intake";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { IntakeSessionRow } from "./IntakeSessionRow";
import { IntakeSessionSheet } from "./IntakeSessionSheet";
import { NewIntakeSessionSheet } from "./NewIntakeSessionSheet";

type Filter = "all" | SessionStatus;

const FILTERS: readonly SegmentedItem<Filter>[] = [
  { value: "all", label: "Todas" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Terminadas" },
  { value: "applied", label: "Aplicadas" },
];

/**
 * Las entrevistas emitidas.
 *
 * La columna que más importa no es el estado: es **dónde se quedó cada
 * persona**. Es la señal de cierre de lazo — la que responde «¿en qué tema se
 * cae la gente?» y convierte esto en aprendizaje de producto en vez de
 * registros de chat que nadie lee. En onboarding B2B, entre el 40 % y el 60 %
 * del tiempo perdido no es complejidad real: son pasos poco claros y respuestas
 * que nunca llegan, y sin esa columna ninguno de los dos se ve.
 *
 * Por eso el aviso de arriba: lo que pide acción son las terminadas sin aplicar
 * (trabajo pendiente de axi) y las que llevan días paradas (alguien se atascó).
 */
export function IntakeSessionsPanel() {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isPending, isError, error, refetch } = useIntakeSessionsQuery(
    filter === "all" ? {} : { status: filter },
  );

  const sessions = useMemo(() => data?.data ?? [], [data]);
  const attention = useMemo(() => sessions.filter((row) => needsAttention(row)), [sessions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          value={filter}
          onValueChange={setFilter}
          items={FILTERS}
          label="Filtrar entrevistas por estado"
        />
        <Button
          onClick={() => {
            setCreating(true);
          }}
        >
          <Plus aria-hidden="true" />
          Nueva entrevista
        </Button>
      </div>

      {attention.length > 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-accent-amber/30 bg-accent-amber/6 px-3 py-2 text-[12.5px] text-foreground">
          <AlertCircle className="size-4 flex-none text-accent-amber" aria-hidden="true" />
          {attention.length === 1
            ? "Una entrevista pide atención: o terminó y falta aplicarla, o lleva días parada."
            : `${String(attention.length)} entrevistas piden atención: terminadas sin aplicar, o paradas hace días.`}
        </p>
      ) : null}

      {isPending ? (
        <TableSkeleton rows={4} />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />
      ) : sessions.length === 0 ? (
        <EmptyState
          glyph="conversation"
          title="Ninguna entrevista todavía"
          description="Emite una, mándale el enlace al cliente por WhatsApp y míralo avanzar desde aquí."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {sessions.map((row) => (
            <IntakeSessionRow
              key={row.id}
              row={row}
              onOpen={() => {
                setOpenId(row.id);
              }}
            />
          ))}
        </ul>
      )}

      <IntakeSessionSheet
        sessionId={openId}
        onClose={() => {
          setOpenId(null);
        }}
      />
      <NewIntakeSessionSheet
        open={creating}
        onClose={() => {
          setCreating(false);
        }}
      />
    </div>
  );
}
