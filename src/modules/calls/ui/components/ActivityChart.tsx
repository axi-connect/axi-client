"use client";

import { useMemo } from "react";
import type { CallsOverviewDTO, CallsOverviewGranularity } from "@/modules/calls/domain/call";

type SeriesBucket = CallsOverviewDTO["series"][number];

const WIDTH = 720;
const HEIGHT = 200;
const PAD_Y = 12;

/**
 * Gráfico de actividad del Monitoreo: dos series (salientes/entrantes) como
 * línea + área sobre un SVG propio — el repo no carga librerías de charts y
 * las de analytics son de barras. Los colores son tokens (violeta = acento
 * del módulo; azul semántico para la segunda serie — jamás violeta + ámbar
 * juntos, DESIGN §3.1). Cada cubeta lleva un <title> accesible.
 */
export function ActivityChart({
  series,
  granularity,
}: {
  series: SeriesBucket[];
  granularity: CallsOverviewGranularity;
}) {
  const { outboundPath, inboundPath, outboundArea, inboundArea, labels, columns } = useMemo(
    () => buildGeometry(series, granularity),
    [series, granularity],
  );

  const total = series.reduce((sum, bucket) => sum + bucket.inbound + bucket.outbound, 0);
  if (total === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        Sin actividad en esta ventana.
      </p>
    );
  }

  return (
    <div>
      <div className="text-muted-foreground mb-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <i className="bg-accent-violet size-2 rounded-full" aria-hidden />
          Salientes
        </span>
        <span className="flex items-center gap-1.5">
          <i className="bg-info size-2 rounded-full" aria-hidden />
          Entrantes
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-44 w-full"
        role="img"
        aria-label="Actividad de llamadas por franja"
      >
        <path d={outboundArea} fill="var(--color-accent-violet)" opacity={0.12} />
        <path d={inboundArea} fill="var(--color-info)" opacity={0.1} />
        <path
          d={outboundPath}
          fill="none"
          stroke="var(--color-accent-violet)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={inboundPath}
          fill="none"
          stroke="var(--color-info)"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />
        {columns.map((column) => (
          <rect
            key={column.key}
            x={column.x}
            y={0}
            width={column.width}
            height={HEIGHT}
            fill="transparent"
            className="hover:fill-foreground/5"
          >
            <title>{column.title}</title>
          </rect>
        ))}
      </svg>
      <div className="text-muted-foreground mt-1 flex justify-between text-[10px]">
        {labels.map((label) => (
          <span key={label.key}>{label.text}</span>
        ))}
      </div>
    </div>
  );
}

function buildGeometry(series: SeriesBucket[], granularity: CallsOverviewGranularity) {
  const max = Math.max(4, ...series.map((bucket) => Math.max(bucket.inbound, bucket.outbound)));
  const count = Math.max(1, series.length);
  const stepX = WIDTH / Math.max(1, count - 1);
  const y = (value: number) => HEIGHT - PAD_Y - (value / max) * (HEIGHT - PAD_Y * 2);
  const x = (index: number) => (count === 1 ? WIDTH / 2 : index * stepX);

  const line = (pick: (bucket: SeriesBucket) => number) =>
    series.map((bucket, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(pick(bucket)).toFixed(1)}`).join(" ");
  const area = (pick: (bucket: SeriesBucket) => number) =>
    `${line(pick)} L${x(count - 1).toFixed(1)},${HEIGHT} L${x(0).toFixed(1)},${HEIGHT} Z`;

  // Etiquetas del eje X en es-CO; ralas para que no se pisen
  const everyNth = granularity === "day" ? 3 : granularity === "week" ? 1 : 5;
  const labels = series
    .map((bucket, index) => ({ bucket, index }))
    .filter(({ index }) => index % everyNth === 0)
    .map(({ bucket, index }) => ({ key: `label-${index}`, text: bucketLabel(bucket, granularity) }));

  const columnWidth = WIDTH / count;
  const columns = series.map((bucket, index) => ({
    key: `col-${index}`,
    x: index * columnWidth,
    width: columnWidth,
    title: `${bucketLabel(bucket, granularity)}: ${bucket.outbound} salientes · ${bucket.inbound} entrantes`,
  }));

  return {
    outboundPath: line((bucket) => bucket.outbound),
    inboundPath: line((bucket) => bucket.inbound),
    outboundArea: area((bucket) => bucket.outbound),
    inboundArea: area((bucket) => bucket.inbound),
    labels,
    columns,
  };
}

function bucketLabel(bucket: SeriesBucket, granularity: CallsOverviewGranularity): string {
  const date = new Date(bucket.bucket_start);
  if (granularity === "day") {
    return date.toLocaleTimeString("es-CO", { hour: "numeric", hour12: true });
  }
  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}
