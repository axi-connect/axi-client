import { cn } from "@/core/lib/utils";
import { funnelStages, type Funnel } from "@/modules/social/domain/social";

/**
 * El embudo de «Comenta y recibe»: comentarios → les escribimos → tocaron →
 * recibieron. Cada etapa dice cuántos y qué porcentaje pasó de la anterior,
 * que es la pregunta del dueño («de los que les escribimos, ¿cuántos tocaron?»).
 */
export function FunnelStrip({ funnel, compact = false }: { funnel: Funnel; compact?: boolean }) {
  const stages = funnelStages(funnel);
  return (
    <ol
      aria-label="Embudo de la automatización"
      className={cn("grid min-w-0 gap-2", compact ? "grid-cols-4" : "grid-cols-2 @[34rem]:grid-cols-4")}
    >
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          className={cn(
            "bg-muted/60 flex min-w-0 flex-col gap-0.5 rounded-2xl",
            compact ? "px-2.5 py-2" : "px-3.5 py-3",
          )}
        >
          <span className={cn("font-heading font-bold tabular-nums", compact ? "text-base" : "text-2xl")}>
            {stage.value.toLocaleString("es-CO")}
          </span>
          {/* Pasa a dos líneas antes que cortarse: «Tocaron «Envíamelo»» es el dato */}
          <span className="text-muted-foreground text-xs leading-snug text-pretty">{stage.label}</span>
          {!compact && index > 0 && (
            <span className="text-muted-foreground text-[11px] tabular-nums">
              {stage.rate === null ? "—" : `${String(stage.rate)} % de la anterior`}
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}
