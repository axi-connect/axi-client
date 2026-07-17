"use client";

/**
 * Render estándar de un error RFC 7807 en el panel de plataforma:
 * título en español mapeado por `code` (reutiliza `errorMessage()`),
 * `detail` del server como secundario, `trace_id` copiable y reintento.
 * Una card en error muestra su ProblemAlert inline sin tumbar el resto.
 */
import { Check, Copy, OctagonAlert } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { useCopy } from "../hooks/use-copy";

type ProblemAlertProps = {
  error: unknown;
  /** Reintento de la query/acción que falló. */
  onRetry?: () => void;
  className?: string;
};

export function ProblemAlert({ error, onRetry, className }: ProblemAlertProps) {
  const { copied, copy } = useCopy();
  const problem = isHttpError(error) ? error.problem : null;
  const title = errorMessage(error);
  // Si errorMessage ya usó el detail como título, no repetirlo como secundario.
  const detail = problem?.detail && problem.detail !== title ? problem.detail : null;
  const traceId = problem?.trace_id;

  return (
    <Alert variant="destructive" className={cn("border-destructive/30", className)}>
      <OctagonAlert aria-hidden="true" className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {detail && <p>{detail}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {traceId && (
            <button
              type="button"
              onClick={() => void copy(traceId)}
              className="inline-flex items-center gap-1 rounded-md font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              aria-label={`Copiar trace ${traceId}`}
            >
              trace: {traceId}
              {copied ? (
                <Check aria-hidden="true" className="size-3 text-success" />
              ) : (
                <Copy aria-hidden="true" className="size-3" />
              )}
            </button>
          )}
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry} className="ml-auto">
              Reintentar
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
