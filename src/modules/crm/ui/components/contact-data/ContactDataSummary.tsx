"use client";

import { cn } from "@/core/lib/utils";
import type { ContactDataSummary as SummaryModel } from "@/modules/crm/domain/contact-data";
import type { ContactDataVariant } from "./types";

/**
 * Resumen de una línea sobre la lista: «9 de 11 datos», barra fina coral y,
 * si hay algo, «2 por revisar» con el punto ámbar (estado = punto, nunca tinte).
 */
export function ContactDataSummary({
  summary,
  variant,
}: {
  summary: SummaryModel;
  variant: ContactDataVariant;
}) {
  const percent = summary.total === 0 ? 0 : Math.round((summary.filled / summary.total) * 100);

  return (
    <div
      className={cn(
        "flex items-center text-muted-foreground",
        variant === "card" ? "my-0.5 mb-1.5 gap-3.5 text-[13px]" : "gap-2.5 text-xs",
      )}
    >
      <span className="shrink-0">
        <b className="font-medium text-foreground tabular-nums">
          {summary.filled} de {summary.total}
        </b>{" "}
        datos
      </span>
      <span
        role="progressbar"
        aria-label="Datos completados"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className={cn(
          "h-[3px] flex-1 overflow-hidden rounded-full bg-secondary",
          variant === "card" && "max-w-[220px]",
        )}
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </span>
      {summary.review > 0 && (
        <span className="inline-flex shrink-0 items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          {summary.review} por revisar
        </span>
      )}
    </div>
  );
}
