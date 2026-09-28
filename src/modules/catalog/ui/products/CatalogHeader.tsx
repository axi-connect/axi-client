import type { ReactNode } from "react";
import { CatalogNav } from "@/modules/catalog/ui/components/CatalogNav";

/**
 * Encabezado de una sección del catálogo (catálogo premium, canvas tablero 1):
 * antetítulo en versalitas, el titular en Nexa con la voz de la marca, las
 * acciones a la derecha y, debajo, la navegación del módulo. El `h1` es de la
 * vista; el nombre del módulo vive en el antetítulo y en las pestañas.
 */
export function CatalogHeader({
  kicker,
  title,
  description,
  actions,
  productCount,
}: {
  kicker: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  productCount?: number | null;
}) {
  return (
    <header className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{kicker}</p>
          <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-[2.5rem]">
            {title}
          </h1>
          {description ? <p className="max-w-3xl text-sm text-pretty text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <CatalogNav productCount={productCount} />
    </header>
  );
}
