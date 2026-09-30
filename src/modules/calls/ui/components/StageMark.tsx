import { Route } from "lucide-react";

/** Separador «Etapa · X» dentro de una conversación (plan de modos §4). */
export function StageMark({ label }: { label: string }) {
  return (
    <li
      role="separator"
      aria-label={`Etapa: ${label}`}
      className="flex items-center gap-2 px-3 py-2 text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase"
    >
      <span aria-hidden className="h-px flex-1 bg-border" />
      <Route aria-hidden className="size-3 text-accent-violet" />
      <span>Etapa · {label}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
    </li>
  );
}
