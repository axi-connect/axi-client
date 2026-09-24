"use client";

import dynamic from "next/dynamic";

import { formatInteger } from "@/core/lib/commercial-units";
import type { CommercialPaceDTO } from "@/modules/commercial/domain/commercial";
import { shortDay } from "@/modules/commercial/domain/format";
import { salesTrend } from "@/modules/commercial/domain/key-result";
import { AXIS_COLOR, CHART_COLORS } from "@/shared/components/features/charts/chart-theme";
import { Skeleton } from "@/shared/components/ui/skeleton";

// recharts fuera del bundle inicial: se baja al abrir el detalle.
const AreaTrend = dynamic(() => import("@/shared/components/features/charts/AreaTrend").then((m) => m.AreaTrend), {
  ssr: false,
  loading: () => <Skeleton className="h-[180px] w-full rounded-xl" />,
});

const SERIES = [
  { key: "expected", label: "Esperado", color: AXIS_COLOR, dashed: true, fill: false },
  { key: "real", label: "Real", color: CHART_COLORS.brand },
];

/**
 * Las ventas del mes, ACUMULADAS: lo real (coral, con relleno) contra lo
 * esperado (trazo neutro punteado). Es la única gráfica del módulo; el violeta
 * no aparece aquí porque esto no lo propone la IA, lo midió el negocio.
 *
 * La serie ya viene acumulada del servidor; `salesTrend` corta lo real en
 * `today` para no dibujar la meseta de los días que no han pasado. La etiqueta
 * accesible dice lo mismo que la gráfica en una frase.
 */
export function PaceTrend({ pace }: { pace: Pick<CommercialPaceDTO, "series" | "today" | "key_results"> }) {
  const data = salesTrend(pace.series, pace.today);
  if (data.length < 2) return null;
  const sales = pace.key_results.find((kr) => kr.key === "sales");
  const label =
    sales === undefined
      ? "Ventas acumuladas del mes frente a lo esperado"
      : `Ventas acumuladas del mes: ${formatInteger(sales.actual)} reales frente a ${formatInteger(sales.expected)} esperadas a hoy`;
  return (
    <figure className="flex flex-col gap-2">
      <div role="img" aria-label={label}>
        <AreaTrend data={data} series={SERIES} xKey="date" formatX={shortDay} formatY={(value) => formatInteger(value)} />
      </div>
      <figcaption className="flex items-center gap-4 text-[12px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden className="block h-0.5 w-4 rounded-full bg-brand" />
          Real
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i aria-hidden className="block w-4 border-t-2 border-dashed border-muted-foreground" />
          Esperado
        </span>
      </figcaption>
    </figure>
  );
}
