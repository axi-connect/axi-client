"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { PaceStatus } from "@/modules/commercial/domain/commercial";
import { isOffPace, PACE_BADGES } from "@/modules/commercial/domain/labels";
import { StatusBadge } from "@/shared/components/features/status-badge";

export interface KeyResultRowProps {
  /** Detalle del resultado (F6). Sin él la fila no enlaza ni pinta chevron. */
  href?: string;
  label: string;
  /** «27 de 43 · faltan 16» (o el ticket: «$ 701.000»). */
  value: React.ReactNode;
  /** «Ritmo 1,35 al día · esperado 1,6 · según tu historia». */
  secondary: React.ReactNode;
  /** Segunda línea secundaria (el mix de productos bajo «Ventas»). */
  extra?: React.ReactNode;
  /** Regla fina de 96 px: camino recorrido de esta fila, 0–100. */
  pct: number;
  /** Solo pinta badge fuera de ritmo: «Al ritmo» en cada fila sería ruido. */
  status?: PaceStatus | null;
}

const ROW = "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-px px-4 py-3";

/**
 * Una fila de la lista de resultados clave, con la forma de la ficha de
 * Contactos: etiqueta pequeña / valor de lectura / línea secundaria, y a la
 * derecha un solo indicador (la regla fina) y el badge si hace falta.
 *
 * Con `href` la fila ENTERA es un enlace al detalle y el chevron aparece al
 * pasar el ratón o al enfocar con el teclado (filas como enlaces, no `div`
 * con `onClick`). Sin `href` —F3, las páginas de detalle no existen— es una
 * fila estática: nada promete un destino que dé 404.
 */
export function KeyResultRow({ href, label, value, secondary, extra, pct, status = null }: KeyResultRowProps) {
  const badge = status !== null && isOffPace(status) ? status : null;
  const body = (
    <>
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="row-span-3 flex items-center gap-3 self-center">
        {badge !== null ? <StatusBadge status={badge} map={PACE_BADGES} appearance="dot" /> : null}
        <Rule pct={pct} />
        {href !== undefined ? (
          <ChevronRight
            aria-hidden
            className="size-4 text-muted-foreground transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          />
        ) : null}
      </span>
      <span className="text-[15px] font-medium text-foreground tabular-nums">{value}</span>
      <span className="flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted-foreground">{secondary}</span>
      {extra !== undefined && extra !== null ? <span className="col-start-1 text-[12.5px] text-muted-foreground">{extra}</span> : null}
    </>
  );

  if (href === undefined) {
    return <li className={cn("grouped-row", ROW)}>{body}</li>;
  }
  return (
    <li className="grouped-row group">
      <Link
        href={href}
        className={cn(
          ROW,
          "transition-colors hover:bg-foreground/[0.03] focus-visible:bg-foreground/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        )}
      >
        {body}
      </Link>
    </li>
  );
}

/** La regla fina de 96 px: el único indicador gráfico de la fila. */
function Rule({ pct }: { pct: number }) {
  const width = Math.min(100, Math.max(2, pct));
  return (
    <span aria-hidden className="block h-1 w-24 shrink-0 overflow-hidden rounded-full bg-secondary">
      <span className="block h-full rounded-full bg-brand" style={{ width: `${String(width)}%` }} />
    </span>
  );
}
