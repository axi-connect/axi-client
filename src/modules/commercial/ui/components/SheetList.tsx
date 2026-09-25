import type { ReactNode } from "react";

import { cn } from "@/core/lib/utils";

/**
 * Las listas de las hojas de detalle («El camino», «De dónde sale», «Qué va a
 * pasar»): la ficha de siempre —etiqueta → valor, una línea secundaria, una
 * acción a la derecha que aparece al pasar el ratón— con su titular en
 * versalitas. Nada de tablas.
 */
export function SheetList({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={cn("overflow-hidden rounded-2xl border border-border bg-background", className)}>
      <h3 className="px-4 pt-3 pb-1 text-[11.5px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">{title}</h3>
      <ul className="grouped-list rounded-none">{children}</ul>
    </section>
  );
}

export function SheetRow({
  label,
  value,
  secondary,
  action,
}: {
  label: ReactNode;
  value: ReactNode;
  secondary?: ReactNode;
  /** Fuera de cualquier enlace; `.hover-reveal`: se esconde solo donde hay ratón. */
  action?: ReactNode;
}) {
  return (
    <li className="grouped-row reveal-group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-px px-4 py-2.5">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      {action !== undefined ? <span className="hover-reveal row-span-3 self-center">{action}</span> : null}
      <span className="col-start-1 text-[14.5px] font-medium text-foreground tabular-nums">{value}</span>
      {secondary !== undefined && secondary !== null ? (
        <span className="col-start-1 flex flex-wrap items-center gap-x-1.5 text-[12.5px] text-muted-foreground">{secondary}</span>
      ) : null}
    </li>
  );
}
