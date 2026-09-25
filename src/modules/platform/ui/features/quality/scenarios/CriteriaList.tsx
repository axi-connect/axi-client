/**
 * Chips de solo lectura de los criterios de éxito. Se reutiliza en el sheet
 * de ver escenario, el detalle de suite y (F4) junto a los checks del case.
 * Los `unknown` (criteria_version vieja o kind nuevo) llevan punto ámbar sin
 * inventar semántica (texto en foreground: AA).
 */
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { criterionLabel, type SuccessCriterion } from "../../../../domain/quality";
import { TonePill } from "../shared/premium";

type CriteriaListProps = {
  criteria: SuccessCriterion[];
  className?: string;
};

export function CriteriaList({ criteria, className }: CriteriaListProps) {
  if (criteria.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>Sin criterios legibles.</p>;
  }
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)}>
      {criteria.map((criterion, index) => (
        <li key={index}>
          {criterion.kind === "unknown" ? (
            <TonePill tone="warning">{criterionLabel(criterion)}</TonePill>
          ) : (
            <Badge variant="outline" className="border-border bg-muted/50 text-foreground">
              {criterionLabel(criterion)}
            </Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
