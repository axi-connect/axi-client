"use client";

/**
 * El ÚNICO error del panel de plataforma (rediseño F1): título en español por
 * `code` RFC 7807 (`errorMessage()`), el `detail` del servidor debajo, la
 * referencia (`trace_id`) copiable para soporte y «Reintentar».
 *
 * Dos formas, el mismo contenido:
 * - `inline` (por defecto): una franja dentro de una tarjeta o encima de una
 *   tabla. Una tarjeta en error no tumba el resto de la pantalla.
 * - `tile`: ocupa el lugar de una ficha del bento, con su etiqueta. Absorbe a
 *   `TileFailure` de Almacenamiento (que ahora la usa).
 *
 * Nunca se pinta un vacío en lugar de un error (regla «error ≠ vacío», ver
 * `domain/query-view.ts` y `QueryBoundary`).
 */
import { Check, Copy, OctagonAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { useCopy } from "../hooks/use-copy";

type ProblemAlertProps = {
  /** El error de la query o la mutación. Sin él se usa `fallbackTitle`. */
  error?: unknown;
  /** Reintento de la query/acción que falló. */
  onRetry?: () => void;
  className?: string;
  variant?: "inline" | "tile";
  /** Etiqueta de la ficha en `variant="tile"`. */
  label?: string;
  /** El título cuando no hay un error que leer. */
  fallbackTitle?: string;
};

function ProblemBody({
  error,
  onRetry,
  fallbackTitle,
}: Pick<ProblemAlertProps, "error" | "onRetry" | "fallbackTitle">) {
  const { copied, copy } = useCopy();
  const problem = isHttpError(error) ? error.problem : null;
  const title = error === undefined ? (fallbackTitle ?? "No pudimos cargar esto.") : errorMessage(error);
  // Si errorMessage ya usó el detail como título, no repetirlo como secundario.
  const detail = problem?.detail && problem.detail !== title ? problem.detail : null;
  const traceId = problem?.trace_id;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="text-sm font-medium text-foreground [overflow-wrap:anywhere]">{title}</p>
      {detail ? <p className="text-sm text-muted-foreground [overflow-wrap:anywhere]">{detail}</p> : null}
      {traceId || onRetry ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {onRetry ? (
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
          {traceId ? (
            <button
              type="button"
              onClick={() => void copy(traceId)}
              title="Dale esta referencia a quien revise el error"
              aria-label={`Copiar la referencia ${traceId}`}
              className="inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-md text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="shrink-0">Referencia</span>
              <span className="min-w-0 truncate font-mono">{traceId}</span>
              {copied ? (
                <Check aria-hidden="true" className="size-3 shrink-0 text-success" />
              ) : (
                <Copy aria-hidden="true" className="size-3 shrink-0" />
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ProblemAlert({ error, onRetry, className, variant = "inline", label, fallbackTitle }: ProblemAlertProps) {
  if (variant === "tile") {
    return (
      <BentoTile label={label ?? "Error"} className={className}>
        <div role="alert" className="flex min-w-0 gap-3">
          <OctagonAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <ProblemBody error={error} onRetry={onRetry} fallbackTitle={fallbackTitle} />
        </div>
      </BentoTile>
    );
  }
  return (
    <div
      role="alert"
      className={cn(
        "flex min-w-0 gap-3 rounded-2xl border border-destructive/30 bg-card px-4 py-3.5",
        className,
      )}
    >
      <OctagonAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
      <ProblemBody error={error} onRetry={onRetry} fallbackTitle={fallbackTitle} />
    </div>
  );
}
