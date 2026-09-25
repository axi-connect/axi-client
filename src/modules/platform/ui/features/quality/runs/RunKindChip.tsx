/**
 * Tipo de ejecución como píldora neutra con icono (quality_premium_plan F4).
 * Sustituye al badge tintado ámbar/violeta, cuyo texto no pasaba AA: el
 * acento queda en el icono y el texto en foreground.
 */
import { ClipboardCheck, Gauge, MessageSquareText, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { RunListItem } from "../../../../domain/quality-runs";
import { runKindLabel } from "./runs-format";

const KIND_ICON: Record<RunListItem["kind"], { icon: LucideIcon; tone: string }> = {
  qa: { icon: ClipboardCheck, tone: "text-muted-foreground" },
  stress: { icon: Gauge, tone: "text-accent-amber" },
  probe: { icon: Target, tone: "text-accent-violet" },
  interactive: { icon: MessageSquareText, tone: "text-brand" },
};

export function RunKindChip({ kind, className }: { kind: RunListItem["kind"]; className?: string }) {
  const { icon: Icon, tone } = KIND_ICON[kind] ?? KIND_ICON.qa;
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 text-xs font-medium whitespace-nowrap",
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("size-3.5", tone)} />
      {runKindLabel(kind)}
    </span>
  );
}
