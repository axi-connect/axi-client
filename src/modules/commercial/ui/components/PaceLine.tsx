"use client";

import { formatInteger } from "@/core/lib/commercial-units";
import type { CommercialPaceDTO } from "@/modules/commercial/domain/commercial";
import { formatRate } from "@/modules/commercial/domain/format";
import { weekProgress } from "@/modules/commercial/domain/weeks";
import { InlineFigures } from "@/shared/components/features/inline-figures";

/**
 * El ritmo de esta semana, en una línea: «6 ventas · esperadas 8 · 1,5 al día».
 * Mismo molde que el parte del agente en la bandeja (`InlineFigures`), con el
 * filete coral porque aquí habla el negocio, no la IA.
 *
 * La serie del servidor es ACUMULADA y «hoy» y los días hábiles los manda él
 * (`pace.today`, `pace.weekdays`): el navegador no decide qué día es. Con
 * `href` (F6, el detalle de ventas) la línea entera es un enlace.
 */
export function PaceLine({ pace, href }: { pace: Pick<CommercialPaceDTO, "series" | "today" | "weekdays">; href?: string }) {
  const week = weekProgress(pace.series, pace.today, pace.weekdays);
  if (week === null) return null;

  const perDay = week.business_days > 0 ? week.sales / week.business_days : 0;
  const salesLabel = week.sales === 1 ? "venta" : "ventas";
  const figures = [
    { key: "sales", value: formatInteger(week.sales), label: salesLabel, good: week.expected_sales > 0 && week.sales >= week.expected_sales },
    { key: "expected", value: formatInteger(week.expected_sales), label: "esperadas" },
    { key: "rate", value: formatRate(perDay), label: "al día" },
  ];

  return (
    <InlineFigures
      eyebrow="Ritmo · esta semana"
      accent="brand"
      figures={figures}
      href={href}
      ariaLabel={
        href === undefined
          ? undefined
          : `Ritmo de esta semana: ${formatInteger(week.sales)} ${salesLabel}, esperadas ${formatInteger(week.expected_sales)}, ${formatRate(perDay)} al día. Abre el detalle de ventas`
      }
    />
  );
}
