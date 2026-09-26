import { RotateCcw } from "lucide-react";
import { BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { CallSessionRowDTO } from "@/modules/calls/domain/call";
import { CallAura } from "@/modules/calls/ui/components/aura/CallAura";
import { LiveCallCard } from "@/modules/calls/ui/components/LiveCallCard";

/**
 * «Al teléfono ahora» (canvas, tablero 1): cada llamada en curso con su aura.
 * Vacía, un escenario pequeño con el aura dormida (tablero 9).
 */
export function LiveNowTile({
  calls,
  initialized,
  error,
  onRetry,
  now,
  onTestCall,
  className,
}: {
  calls: CallSessionRowDTO[];
  initialized: boolean;
  error: string | null;
  onRetry: () => void;
  now: number;
  /** null sin permiso de llamar. */
  onTestCall: (() => void) | null;
  className?: string;
}) {
  const talking = calls.filter((call) => call.status === "in_progress").length;
  const dialing = calls.length - talking;
  return (
    <BentoTile
      label="Al teléfono ahora"
      aside={
        initialized && error === null && calls.length > 0 ? (
          <span className="text-xs text-muted-foreground tabular-nums">
            {talking === 1 ? "1 en conversación" : `${talking} en conversación`}
            {dialing > 0 ? ` · ${dialing} marcando` : ""}
          </span>
        ) : undefined
      }
      className={className}
    >
      {error !== null ? (
        <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
          <span aria-hidden className="size-2.5 rounded-full bg-destructive ring-[6px] ring-destructive/15" />
          <p className="text-sm font-semibold">No pudimos cargar las llamadas en curso</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Revisa tu conexión e inténtalo de nuevo. Las llamadas siguen su curso.
          </p>
          <Button variant="outline" size="sm" className="rounded-full" onClick={onRetry}>
            <RotateCcw aria-hidden className="size-3.5" /> Reintentar
          </Button>
        </div>
      ) : !initialized ? (
        <div className="grid gap-3 md:grid-cols-2" aria-busy="true" aria-label="Cargando llamadas en curso">
          <Skeleton className="h-[104px] rounded-2xl" />
          <Skeleton className="h-[104px] rounded-2xl" />
        </div>
      ) : calls.length === 0 ? (
        // Superficie oscura y no una isla: la isla de la pantalla es «Lo próximo».
        <div className="surface-dark relative isolate flex min-h-44 flex-col items-center justify-end gap-2 overflow-hidden rounded-2xl bg-background p-5 text-center text-foreground">
          <div aria-hidden className="absolute inset-0 -z-10">
            <CallAura mode="idle" size="mini" options={{ scale: 0.26, centerY: 0.36 }} />
          </div>
          <p className="font-heading text-lg font-bold">Nadie está al teléfono</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Cuando tu agente llame o alguien entre, la llamada aparece aquí con su aura.
          </p>
          {onTestCall !== null && (
            <Button variant="glass" size="sm" className="mt-1" onClick={onTestCall}>
              Hacer una llamada de prueba
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {calls.map((call) => (
            <LiveCallCard key={call.id} call={call} now={now} />
          ))}
        </div>
      )}
    </BentoTile>
  );
}
