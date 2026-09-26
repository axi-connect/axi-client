"use client";

import { useId, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { BentoTile } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";

/**
 * Piezas compartidas por las fichas del Panel (DESIGN-SYSTEM §9.5). Cada
 * ficha pinta sus tres estados obligatorios: cargando (la silueta), error
 * (qué pasó + «Reintentar»; nunca se confunde con un vacío) y listo.
 */

/** La ficha que no se pudo leer: lo dice en su sitio, con reintento. */
export function TileError({
  label,
  message,
  onRetry,
  className,
}: {
  label: string;
  message: string;
  onRetry: () => Promise<void>;
  className?: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const retry = () => {
    setRetrying(true);
    void onRetry().finally(() => setRetrying(false));
  };
  return (
    <BentoTile label={label} className={className}>
      <div className="flex flex-1 flex-col items-start gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-xl">
            <AlertCircle className="size-4" />
          </span>
          <p className="text-sm font-semibold text-pretty">No pudimos leer esta ficha</p>
        </div>
        <p className="text-muted-foreground text-xs text-pretty">{message}</p>
        <Button variant="outline" size="sm" className="mt-auto rounded-full px-4" onClick={retry} disabled={retrying}>
          {retrying ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
          Reintentar
        </Button>
      </div>
    </BentoTile>
  );
}

/** La silueta de una ficha mientras carga (§9.1): la forma del destino, no un bloque gris. */
export function TileSkeleton({ label, lines = 2, className }: { label: string; lines?: number; className?: string }) {
  return (
    <BentoTile label={label} className={className}>
      <div role="status" aria-label={`Cargando ${label.toLowerCase()}`} className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-10 w-40 rounded-xl" />
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={cn("h-3 rounded-md", index % 2 === 0 ? "w-3/4" : "w-1/2")} />
        ))}
      </div>
    </BentoTile>
  );
}

/**
 * Curva mínima sin ejes (la de Clientes nuevos). SVG puro: no carga recharts
 * para una línea de 90 px. `preserveAspectRatio="none"` estira la curva al
 * ancho de la ficha y `vector-effect` mantiene el trazo en píxeles.
 */
export function Sparkline({ values, height = 72, className }: { values: number[]; height?: number; className?: string }) {
  const width = 300;
  const fade = useId();
  if (values.length < 2) return <div aria-hidden="true" style={{ height }} className={className} />;
  const max = Math.max(...values, 1) * 1.1;
  const points = values.map((value, index) => [
    (index / (values.length - 1)) * width,
    height - 3 - (value / max) * (height - 8),
  ]);
  const line = smoothPath(points);
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${String(width)} ${String(height)}`}
      preserveAspectRatio="none"
      style={{ height }}
      className={cn("text-foreground block w-full overflow-visible", className)}
    >
      <defs>
        <linearGradient id={fade} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.12} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${String(width)},${String(height)} L0,${String(height)} Z`} fill={`url(#${fade})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Catmull-Rom a Bézier: una curva suave que pasa por cada punto. */
function smoothPath(points: number[][]): string {
  const f = (n: number) => String(Math.round(n * 10) / 10);
  let d = `M${f(points[0][0])},${f(points[0][1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/**
 * Barra de consumo con la marca del umbral. El tono va en la barra solo al
 * pasar el umbral (ámbar) o el límite (rojo); por debajo, tinta. La marca no
 * lleva información que no diga también el texto de al lado.
 */
export function UsageMeter({ pct, threshold = 80 }: { pct: number; threshold?: number }) {
  const fill = pct >= 100 ? "bg-destructive" : pct >= threshold ? "bg-warning" : "bg-foreground";
  return (
    <div aria-hidden="true" className="bg-muted relative h-1.5 rounded-full">
      <span className={cn("absolute inset-y-0 left-0 rounded-full", fill)} style={{ width: `${String(Math.min(100, Math.max(0, pct)))}%` }} />
      <span className="bg-foreground/35 absolute -top-1 h-3.5 w-0.5 rounded-full" style={{ left: `${String(threshold)}%` }} />
    </div>
  );
}
