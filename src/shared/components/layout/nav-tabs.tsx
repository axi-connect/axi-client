"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/core/lib/utils";
import {
  SegmentedCount,
  SegmentedLabel,
  SegmentedPill,
  segmentedItemVariants,
  segmentedListVariants,
  type SegmentedLabels,
  type SegmentedSize,
} from "@/shared/components/ui/segmented";

/**
 * Navegación de sección del panel: la pastilla de `segmented.tsx` con la
 * semántica de **navegación**, no de pestañas.
 *
 * Es `<nav>` + `<ul>` + `Link` + `aria-current="page"` a propósito: cada ítem
 * cambia de ruta, así que anunciarlo como `role="tab"` mentiría al lector de
 * pantalla (y rompería la expectativa de que las flechas cambian de panel sin
 * navegar). Sustituye siete copias del mismo bloque con subrayado.
 *
 * Recibe los ítems **ya filtrados por permiso**: el gate RBAC vive en el módulo
 * dueño de la sección, y así este componente se queda presentacional y testeable
 * sin montar el `AuthProvider`.
 */

export type NavTabItem = {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** Contador a la derecha; `null`/`undefined` no pinta nada. */
  count?: number | string | null;
  /**
   * Solo activo en la ruta exacta. Lo necesita la pestaña cuyo `href` ES la
   * base de la sección («Resumen», «Ajustes»): por prefijo se quedaría activa
   * en todas sus hermanas.
   */
  exact?: boolean;
};

/**
 * Activo por prefijo de **segmento**, no por `startsWith` a secas: con
 * `href + "/"` la ruta `/catalog/products/create` mantiene activo «Productos»
 * y `/dashboard-legacy` no activa `/dashboard`. Es la misma regla que el
 * `findActiveTrail` del sidebar.
 */
export function isNavTabActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavTabs({
  items,
  label,
  size = "default",
  surface = "raised",
  labels = "auto",
  prefetch,
  className,
}: {
  items: readonly NavTabItem[];
  /** Nombre de la navegación para el lector de pantalla. Obligatorio. */
  label: string;
  size?: SegmentedSize;
  surface?: "raised" | "inline";
  labels?: SegmentedLabels;
  /** `false` en secciones pesadas que no conviene precargar (consola interna). */
  prefetch?: boolean;
  className?: string;
}) {
  const pathname = usePathname();
  const listRef = React.useRef<HTMLElement>(null);

  return (
    <nav
      ref={listRef}
      aria-label={label}
      data-slot="nav-tabs"
      className={cn(segmentedListVariants({ size, surface }), className)}
    >
      <SegmentedPill listRef={listRef} size={size} />
      <ul className="flex items-center gap-0.5">
        {items.map((item) => {
          const active = isNavTabActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch={prefetch}
                aria-current={active ? "page" : undefined}
                className={segmentedItemVariants({ size })}
              >
                {Icon ? <Icon aria-hidden="true" /> : null}
                <SegmentedLabel labels={Icon ? labels : "always"} active={active}>
                  {item.label}
                </SegmentedLabel>
                {item.count !== null && item.count !== undefined ? (
                  <SegmentedCount active={active}>{item.count}</SegmentedCount>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
