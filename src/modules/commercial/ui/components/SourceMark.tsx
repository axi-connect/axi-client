import { FlaskConical, History, UserRound, type LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { SourceKind } from "@/modules/commercial/domain/commercial";
import { sourceLabel } from "@/modules/commercial/domain/labels";

const ICONS: Record<SourceKind, LucideIcon> = {
  history: History,
  declared: UserRound,
  benchmark: FlaskConical,
};

/**
 * De dónde sale una cifra: «según tu historia» · «lo dijiste tú» · «supuesto
 * para clínicas estéticas». Cada número del módulo la lleva (D7): un supuesto
 * tomado por verdad es el riesgo n.º 2 del plan, y la marca es lo que lo evita.
 */
export function SourceMark({ source, nicheLabel, className }: { source: SourceKind; nicheLabel?: string | null; className?: string }) {
  const Icon = ICONS[source];
  return (
    <span className={cn("inline-flex items-center gap-1 text-muted-foreground", className)}>
      <Icon aria-hidden className="size-3 shrink-0" />
      {sourceLabel(source, nicheLabel)}
    </span>
  );
}
