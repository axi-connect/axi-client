import { Check } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { FlowStop } from "@/modules/onboarding/ui/flow/FlowRoute";

/**
 * La ruta en miniatura (banner del panel): las paradas como discos de 28 px
 * unidos por una línea, con el mismo vocabulario de estados que `FlowRoute`
 * —hecha en el color de «completado» con su check, omitida con el borde
 * discontinuo, pendiente en cristal— y sin movimiento: aquí informa, no
 * navega. Es una lista con nombre: cada disco lleva la parada y su estado
 * para el lector de pantalla. Necesita el alcance `.flow-ground` (o el campo)
 * para que resuelvan sus variables.
 */
export function FlowRouteMini({ stops, ariaLabel, className }: { stops: readonly FlowStop[]; ariaLabel: string; className?: string }) {
  return (
    <ol aria-label={ariaLabel} className={cn("flex items-center", className)}>
      {stops.map((stop, index) => {
        const Icon = stop.icon;
        const done = stop.status === "done";
        const skipped = stop.status === "skipped";
        return (
          <li key={stop.code} className="flex items-center">
            {index > 0 ? <i aria-hidden="true" className="block h-px w-5 bg-[var(--sf-line-on)]" /> : null}
            <span
              title={stop.label}
              className={cn(
                "grid size-7 place-items-center rounded-full border",
                done ? "flow-stop-badge border-transparent" : "sf-glass text-foreground",
                !done && !skipped && "sf-line",
                skipped && "flow-stop--skipped border-[color:var(--sf-line-on)]",
              )}
            >
              {done ? <Check aria-hidden="true" className="size-3.5" strokeWidth={2.6} /> : <Icon aria-hidden="true" className="size-3.5" strokeWidth={1.9} />}
              <span className="sr-only">
                {stop.label}: {done ? "hecho" : skipped ? "para después" : "pendiente"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
