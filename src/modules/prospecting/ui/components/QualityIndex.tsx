"use client";

import { cn } from "@/core/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

import {
  QUALITY_AXES,
  checksByAxis,
  hasQualitySignals,
  readAxisEvaluable,
  readQualityAxes,
  readQualityChecks,
  type LeadRow,
} from "../../domain/lead";
import { QualityEvidence } from "./QualityEvidence";

/**
 * El Índice de Calidad de Lead, en su forma compacta: cuatro segmentos, uno
 * por eje.
 *
 * No es un número suelto a propósito. Un «74» sin desglose no se puede
 * discutir ni accionar; cuatro barras dicen de un vistazo si el problema es
 * que no hay por dónde contactarlo o que no encaja con lo que vende el tenant.
 *
 * Va en violeta —el acento de dataviz del sistema— y no en coral: el coral es
 * ACCIÓN y gastarlo en decorar un dato lo desgasta donde sí importa.
 */
export function QualityIndex({
  row,
  className,
}: {
  row: LeadRow;
  className?: string;
}) {
  const axes = QUALITY_AXES.map((axis) => ({
    key: axis.key,
    label: axis.label,
    score:
      axis.key === "contactability"
        ? row.axis_contactability
        : axis.key === "identity"
          ? row.axis_identity
          : axis.key === "fit"
            ? row.axis_fit
            : row.axis_provenance,
    max: 25,
  }));
  const measured = row.measured;
  const score = row.quality_score;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex items-center gap-2", className)}>
          <span className="font-heading w-6 text-right text-sm font-bold tabular-nums">
            {measured ? score : "—"}
          </span>
          <span className="flex w-[88px] gap-0.5" aria-hidden>
            {axes.map((axis) => (
              <span
                key={axis.key}
                className="bg-foreground/10 h-1.5 flex-1 overflow-hidden rounded-sm"
              >
                <span
                  className="bg-accent-violet block h-full rounded-sm"
                  style={{ width: `${(axis.score / axis.max) * 100}%` }}
                />
              </span>
            ))}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="w-64">
        {measured ? (
          <ul className="space-y-1 text-xs">
            {axes.map((axis) => (
              <li key={axis.key} className="flex justify-between gap-3">
                <span>{axis.label}</span>
                <span className="tabular-nums">
                  {axis.score}/{axis.max}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs">
            Todavía nadie ha medido este lead. La verificación llega con el
            motor de calidad.
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/** Desglose completo con la evidencia de cada señal, para el detalle. */
export function QualityBreakdown({
  score,
  signals,
}: {
  score: number;
  signals: unknown;
}) {
  const axes = readQualityAxes(signals);
  const measured = hasQualitySignals(signals);
  const checks = readQualityChecks(signals);

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="font-heading text-base font-bold">Índice de calidad</h3>
        <span className="font-heading text-accent-violet text-2xl leading-none font-extrabold tabular-nums">
          {measured ? score : "—"}
        </span>
        <span className="text-muted-foreground text-xs">de 100</span>
      </div>

      {!measured && (
        <p className="text-muted-foreground mb-3 text-xs">
          Este lead todavía no se ha puntuado. Aparecerá aquí en cuanto el motor
          lo revise.
        </p>
      )}

      <dl className="divide-border-soft divide-y">
        {axes.map((axis) => {
          const evaluable = readAxisEvaluable(signals, axis.key);
          const axisChecks = checksByAxis(checks, axis.key);
          return (
            <div key={axis.key} className="py-3">
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-3">
                <dt className="text-sm font-semibold">{axis.label}</dt>
                <dd className="font-heading text-sm font-bold tabular-nums">
                  {axis.score}{" "}
                  <span className="text-muted-foreground text-xs font-medium">
                    / {evaluable > 0 ? evaluable : axis.max}
                  </span>
                </dd>
              </div>
              <div className="bg-foreground/8 mt-1 h-1 overflow-hidden rounded-sm">
                <div
                  className="bg-accent-violet h-full rounded-sm"
                  style={{
                    width: `${(axis.score / (evaluable > 0 ? evaluable : axis.max)) * 100}%`,
                  }}
                />
              </div>
              {/* «de 25» cuando solo se midieron 18 sería mentir sobre lo que
                  se sabe: el denominador es lo evaluable, no el peso. */}
              {evaluable > 0 && evaluable < axis.max && (
                <p className="text-muted-foreground mt-1 text-[11px]">
                  Sobre {evaluable} de {axis.max} puntos medibles
                </p>
              )}
              <QualityEvidence checks={axisChecks} />
            </div>
          );
        })}
      </dl>
    </div>
  );
}
