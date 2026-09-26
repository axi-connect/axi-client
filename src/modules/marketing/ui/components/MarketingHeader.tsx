"use client";

import { cn } from "@/core/lib/utils";
import { NavTabs, type NavTabItem } from "@/shared/components/layout/nav-tabs";

const BASE = "/marketing";

/**
 * Las secciones del módulo, en el orden del canvas aprobado (2026-09-26). Es la
 * MISMA barra en todas: antes Captación y Configuración ordenaban encabezado y
 * pestañas al revés, y Resumen, Campañas, Recuperación y Promociones no tenían
 * ninguna.
 */
export const MARKETING_SECTIONS: readonly NavTabItem[] = [
  // `exact`: su href ES la base, así que por prefijo se quedaría activa en todas.
  { href: BASE, label: "Resumen", exact: true },
  { href: `${BASE}/campaigns`, label: "Campañas" },
  { href: `${BASE}/automations`, label: "Recuperación" },
  { href: `${BASE}/promotions`, label: "Promociones" },
  { href: `${BASE}/leads`, label: "Captación" },
  { href: `${BASE}/settings`, label: "Configuración" },
];

/** La navegación del módulo. La monta `MarketingHeader`, y sola el layout de Captación. */
export function MarketingNav({ className }: { className?: string }) {
  return <NavTabs items={MARKETING_SECTIONS} label="Secciones de marketing" className={className} />;
}

/**
 * El encabezado de una sección de marketing: antetítulo, el título en Nexa, una
 * línea que dice para qué sirve, las acciones y, debajo, la navegación del
 * módulo. Sustituye al `PageHeader` suelto de cada vista.
 */
export function MarketingHeader({
  kicker = "Marketing",
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">{kicker}</p>
          <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-[2.5rem]">
            {title}
          </h1>
          {description ? <p className="text-muted-foreground max-w-3xl text-sm text-pretty">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <MarketingNav />
    </header>
  );
}
