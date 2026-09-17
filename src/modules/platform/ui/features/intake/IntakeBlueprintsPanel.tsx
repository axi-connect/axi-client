"use client";

import { FileText, Target } from "lucide-react";

import { TableSkeleton } from "@/shared/components/features/loading";
import { Badge } from "@/shared/components/ui/badge";
import { countAppliableFields, countFields } from "../../../domain/intake";
import { useIntakeBlueprintsQuery } from "../../../infrastructure/api/hooks/use-intake";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";

/**
 * Los guiones disponibles.
 *
 * De momento **solo lectura**: se siembran con `npm run seed` y se editan por
 * ahí. El editor visual es una pantalla propia y grande (arrastrar temas,
 * validar targets duplicados, previsualizar el saludo) y meterla a medias aquí
 * daría algo peor que no tenerla — el guion sembrado cubre el caso real, y la
 * prioridad del dueño es probar la conversación, no montar guiones nuevos.
 *
 * Lo que sí se ve es lo que hay que poder auditar de un vistazo: cuántos
 * campos tiene, **cuántos de ellos escriben de verdad en la configuración del
 * tenant**, y qué versión va — porque una entrevista emitida ayer se leyó con
 * la versión de ayer.
 */
export function IntakeBlueprintsPanel() {
  const { data, isPending, isError, error, refetch } = useIntakeBlueprintsQuery(true);

  if (isPending) return <TableSkeleton rows={3} />;
  if (isError) {
    return <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />;
  }

  const blueprints = data.data;

  if (blueprints.length === 0) {
    return (
      <EmptyState
        glyph="conversation"
        title="No hay guiones"
        description="Siembra el guion por defecto con `npm run seed` en el servidor."
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {blueprints.map((blueprint) => {
        const total = countFields(blueprint);
        const appliable = countAppliableFields(blueprint);

        return (
          <li
            key={blueprint.id}
            className="rounded-lg border border-border bg-card p-4 shadow-float"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{blueprint.name}</h3>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {blueprint.code} · v{blueprint.version}
                </p>
              </div>
              <Badge variant="secondary" className="flex-none gap-1.5">
                <span
                  className={
                    blueprint.is_active
                      ? "size-1.5 rounded-full bg-success"
                      : "size-1.5 rounded-full bg-muted-foreground/40"
                  }
                  aria-hidden="true"
                />
                {blueprint.is_active ? "Activo" : "Inactivo"}
              </Badge>
            </div>

            {blueprint.description === null ? null : (
              <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground">
                {blueprint.description}
              </p>
            )}

            <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
              <div className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <dt className="sr-only">Contenido</dt>
                <dd className="text-muted-foreground">
                  {blueprint.topics.length} temas · {total} datos
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="size-3.5 text-muted-foreground" aria-hidden="true" />
                <dt className="sr-only">Aplicables</dt>
                <dd className="text-muted-foreground">
                  {appliable} se aplican solos
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Asistente</dt>
                <dd className="text-muted-foreground">
                  {blueprint.assistant_name} · ~{blueprint.estimated_minutes} min
                </dd>
              </div>
            </dl>

            <p className="mt-3 border-t border-border-soft pt-2.5 text-[11.5px] leading-snug text-muted-foreground/80">
              {blueprint.sessions === 0
                ? "Sin entrevistas todavía"
                : blueprint.sessions === 1
                  ? "1 entrevista emitida"
                  : `${blueprint.sessions} entrevistas emitidas`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
