"use client";

/**
 * Encabezado ÚNICO de las páginas de la consola (rediseño F1): antetítulo con
 * el grupo del menú («Clientes», «Operación»…), título en Nexa, una frase de
 * qué es la pantalla y las acciones a la derecha (la primaria, la última).
 *
 * En las rutas de un nivel el antetítulo sale solo del menú. En las más
 * hondas no hace falta: el armazón ya pinta la ruta legible encima
 * (`PlatformBreadcrumb`), como en el mockup aprobado.
 */
import { usePathname } from "next/navigation";
import { cn } from "@/core/lib/utils";
import { breadcrumbFor, navGroupFor } from "../../domain/navigation";

type PlatformPageHeaderProps = {
  title: React.ReactNode;
  /** Una frase: qué es esta pantalla y para qué sirve. Sin párrafos. */
  description?: React.ReactNode;
  actions?: React.ReactNode;
  /** `undefined` = el grupo del menú; `false` = sin antetítulo. */
  kicker?: string | false;
  className?: string;
};

export function PlatformPageHeader({ title, description, actions, kicker, className }: PlatformPageHeaderProps) {
  const pathname = usePathname() ?? "";
  const shallow = breadcrumbFor(pathname).length <= 1;
  const resolvedKicker = kicker === false ? null : (kicker ?? (shallow ? navGroupFor(pathname) : null));

  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0 max-w-full flex-[1_1_22rem]">
        {resolvedKicker ? (
          <p className="mb-2 text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">{resolvedKicker}</p>
        ) : null}
        <h1 className="font-heading text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.08] font-bold tracking-tight [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description ? <p className="mt-2 max-w-[64ch] text-sm text-muted-foreground text-pretty">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
