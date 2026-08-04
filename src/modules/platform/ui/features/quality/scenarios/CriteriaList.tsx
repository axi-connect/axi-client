/**
 * Chips de solo lectura de los criterios de éxito. Se reutiliza en el sheet
 * de ver escenario, el detalle de suite y (F4) junto a los checks del case.
 * Los `unknown` (criteria_version vieja o kind nuevo) se pintan en ámbar sin
 * inventar semántica.
 */
import { cn } from "@/core/lib/utils";
import { Badge } from "@/shared/components/ui/badge";
import { criterionLabel, type SuccessCriterion } from "../../../../domain/quality";

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
          <Badge
            variant="outline"
            className={cn(
              criterion.kind === "unknown"
                ? "border-warning/40 bg-warning/10 text-warning"
                : "border-border bg-muted/50 text-foreground",
            )}
          >
            {criterionLabel(criterion)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
