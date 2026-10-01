import { cn } from "@/core/lib/utils";
import type { StatePillTone } from "@/shared/components/features/bento";

const DOT: Record<StatePillTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  info: "bg-info",
  neutral: "bg-muted-foreground/60",
};

/**
 * El estado en texto con su punto, sin fondo (Rutas de captación): la
 * `StatePill` sin su píldora, para las líneas de estado y las tarjetas. El
 * color vive en el punto, nunca en el texto (§10). `live` le pone el halo de
 * «en ruta».
 */
export function StatusDot({ tone, live = false, children, className }: { tone: StatePillTone; live?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[7px] text-[13px] font-medium whitespace-nowrap", className)}>
      <span
        aria-hidden
        className={cn("size-2 shrink-0 rounded-full", DOT[tone], live && "shadow-[0_0_0_4px_color-mix(in_srgb,var(--axi-info)_18%,transparent)]")}
      />
      {children}
    </span>
  );
}
