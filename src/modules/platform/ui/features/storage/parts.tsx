"use client";

/**
 * Piezas del almacenamiento en platform (lienzo «Almacenamiento · control por
 * tenant»): medidor con marca del 80 %, barra apilada por origen en neutros
 * (el color es estado, no categoría), tendencia y leyenda. Puras de datos.
 */
import { cn } from "@/core/lib/utils";
import { BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatBytes, ORIGIN_LABELS, type StorageOrigin } from "../../../domain/storage";

/** Tonos neutros por origen: clientes oscuro, equipo medio, sistema claro. */
export const ORIGIN_SWATCH: Record<StorageOrigin, string> = {
  customer: "bg-foreground/85",
  team: "bg-foreground/45",
  system: "bg-foreground/20",
};

export function StorageMeter({
  pct,
  tone = "default",
  label,
  showMark = true,
  className,
}: {
  pct: number | null;
  tone?: "default" | "warning" | "destructive";
  label: string;
  showMark?: boolean;
  className?: string;
}) {
  const width = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  const fill = {
    default: "bg-foreground",
    warning: "bg-warning",
    destructive: "bg-destructive",
  }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("relative h-2 w-full rounded-full bg-muted", className)}
    >
      <span
        className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-300", fill)}
        style={{ width: `${String(width)}%` }}
      />
      {showMark ? (
        <span
          aria-hidden="true"
          className="absolute -inset-y-[3px] w-0.5 rounded-full bg-background ring-1 ring-border"
          style={{ left: "80%" }}
        />
      ) : null}
    </div>
  );
}

export function OriginBar({
  parts,
  className,
}: {
  parts: { origin: StorageOrigin; pct: number }[];
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted", className)}>
      {parts
        .filter((part) => part.pct > 0)
        .map((part) => (
          <span
            key={part.origin}
            className={cn("h-full", ORIGIN_SWATCH[part.origin])}
            style={{ width: `${String(part.pct)}%` }}
          />
        ))}
    </div>
  );
}

export function LegendRow({
  swatch,
  title,
  hint,
  value,
}: {
  swatch: string;
  title: string;
  hint?: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[10px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border/60 py-2.5 first:border-t-0 first:pt-0">
      <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", swatch)} />
      <span className="min-w-0">
        <span className="block text-sm font-medium [overflow-wrap:anywhere]">{title}</span>
        {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
      <span className="text-right text-sm font-medium tabular-nums whitespace-nowrap">{value}</span>
    </div>
  );
}

export function OriginLegend({ rows }: { rows: { origin: StorageOrigin; bytes: number }[] }) {
  return (
    <div>
      {rows.map((row) => (
        <LegendRow
          key={row.origin}
          swatch={ORIGIN_SWATCH[row.origin]}
          title={ORIGIN_LABELS[row.origin].label}
          hint={ORIGIN_LABELS[row.origin].hint}
          value={formatBytes(row.bytes)}
        />
      ))}
    </div>
  );
}

/** Tendencia: lo recorrido sólido y, si la hay, la proyección punteada. */
export function Sparkline({
  points,
  projection,
  className,
}: {
  points: number[];
  projection?: number[];
  className?: string;
}) {
  if (points.length < 2) return null;
  const width = 300;
  const height = 56;
  const all = [...points, ...(projection ?? [])];
  // Dominio ajustado a los datos (con aire): desde 0 una serie de 230→312 GB se vería plana
  const low = Math.min(...all);
  const high = Math.max(...all);
  const pad = (high - low) * 0.15 || high * 0.05 || 1;
  const min = Math.max(0, low - pad);
  const max = high + pad;
  const total = points.length + (projection === undefined ? 0 : projection.length - 1);
  const x = (index: number) => (index * width) / Math.max(1, total - 1);
  const y = (value: number) => height - ((value - min) / (max - min)) * height;
  const line = points.map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = `0,${String(height)} ${line} ${x(points.length - 1).toFixed(1)},${String(height)}`;
  const projected =
    projection === undefined
      ? null
      : projection.map((value, index) => `${x(points.length - 1 + index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("block h-14 w-full", className)}
    >
      <polygon points={area} className="fill-foreground/[0.06]" />
      <polyline
        points={line}
        className="fill-none stroke-foreground"
        strokeWidth={1.6}
        vectorEffect="non-scaling-stroke"
      />
      {projected === null ? null : (
        <polyline
          points={projected}
          className="fill-none stroke-muted-foreground"
          strokeWidth={1.4}
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}

/** Una línea de procedencia: de dónde sale la cifra, al lado de la cifra. */
export function Provenance({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function TileFailure({ label, onRetry, className }: { label: string; onRetry: () => void; className?: string }) {
  return (
    <BentoTile label={label} className={className}>
      <p className="text-sm text-muted-foreground">No pudimos cargar esta ficha.</p>
      <div>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </BentoTile>
  );
}

export function TileLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-col gap-3 rounded-3xl border border-border p-5", className)}
      role="status"
      aria-label="Cargando"
    >
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

/** «hace 3 min», «hace 2 h», «hace 4 días» — la antigüedad de una medición. */
export function ago(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${String(minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${String(hours)} h`;
  return `hace ${String(Math.round(hours / 24))} días`;
}
