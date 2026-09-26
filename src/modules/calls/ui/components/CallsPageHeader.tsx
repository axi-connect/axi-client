import type { ReactNode } from "react";

/**
 * Cabecera de una sección de Llamadas (canvas, tableros 1, 7 y 8): antetítulo
 * en versalitas, el titular en Nexa con la voz de la marca y, a la derecha,
 * las acciones. El nombre del módulo vive en la barra de pestañas; el `h1` es
 * de la vista.
 */
export function CallsPageHeader({
  kicker,
  title,
  actions,
}: {
  kicker: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{kicker}</p>
        <h1 className="font-heading text-3xl leading-[1.05] font-bold tracking-tight text-balance md:text-4xl">
          {title}
        </h1>
      </div>
      {actions !== undefined && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
