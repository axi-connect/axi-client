"use client";

import type { PacePointDTO } from "@/modules/commercial/domain/commercial";
import { formatCount, formatRate } from "@/modules/commercial/domain/format";
import { groupSeriesByWeek, isBusinessDay, parseLocalDate, toIsoDate, weekOf } from "@/modules/commercial/domain/weeks";
import { InlineFigures } from "@/shared/components/features/inline-figures";

/**
 * El ritmo de esta semana, en una línea: «6 ventas · esperadas 8 · 1,5 al día».
 * Mismo molde que el parte del agente en la bandeja (`InlineFigures`), con el
 * filete coral porque aquí habla el negocio, no la IA. La línea entera lleva
 * al detalle de ventas (F6).
 */
export function PaceLine({ series, today = toIsoDate(new Date()) }: { series: readonly PacePointDTO[]; today?: string }) {
  const week = weekOf(groupSeriesByWeek(series), today);
  if (week === null || week.points.length === 0) return null;

  const upToToday = week.points.filter((point) => point.date <= today);
  const sales = upToToday.reduce((acc, point) => acc + point.sales, 0);
  const expected = upToToday.reduce((acc, point) => acc + point.expected_sales, 0);
  const businessDays = upToToday.filter((point) => isBusinessDay(parseLocalDate(point.date))).length;
  const perDay = businessDays > 0 ? sales / businessDays : 0;

  const figures = [
    { key: "sales", value: formatCount(sales), label: sales === 1 ? "venta" : "ventas", good: sales >= expected && expected > 0 },
    { key: "expected", value: formatCount(expected), label: "esperadas" },
    { key: "rate", value: formatRate(perDay), label: "al día" },
  ];

  return (
    <InlineFigures
      eyebrow="Ritmo · esta semana"
      accent="brand"
      figures={figures}
      href="/comercial/resultados/sales"
      ariaLabel={`Ritmo de esta semana: ${formatCount(sales)} ${sales === 1 ? "venta" : "ventas"}, esperadas ${formatCount(expected)}, ${formatRate(perDay)} al día. Abre el detalle de ventas`}
    />
  );
}
