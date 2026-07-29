import { cn } from "@/core/lib/utils";
import { CountUpNumber } from "@/modules/landing/ui/components/CountUpNumber";

/**
 * Stat-tile de la sección de medición: cifra grande en Geist Mono con
 * count-up + título + explicación. El acento violeta está permitido SOLO
 * en §6 (DESIGN.md §3.1) — se activa con `accent`.
 */
export function StatTile({
  title,
  body,
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  accent = false,
  className,
}: {
  title: string;
  body: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-border bg-card flex h-full flex-col gap-2 rounded-2xl border p-6 shadow-float",
        className,
      )}
    >
      <p
        className={cn(
          "font-mono text-4xl font-semibold tracking-tight tabular-nums",
          accent && "text-accent-violet",
        )}
      >
        <CountUpNumber value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </p>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
    </div>
  );
}
