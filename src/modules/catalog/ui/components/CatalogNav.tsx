"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/core/lib/utils";

/**
 * Sub-navegación persistente de la sección `/catalog` (pills).
 * La pill activa se resuelve por prefijo de ruta para cubrir sub-páginas
 * (`/catalog/products/create` mantiene activa "Productos").
 */
const NAV_ITEMS = [
  { href: "/catalog/products", label: "Productos" },
  { href: "/catalog/categories", label: "Categorías" },
  { href: "/catalog/product-types", label: "Tipos de producto" },
  { href: "/catalog/catalogs", label: "Catálogos" },
] as const;

export function CatalogNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Secciones del catálogo" className="border-b border-border">
      <ul className="-mb-px flex flex-wrap items-center gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex items-center whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2.5 text-sm transition-colors",
                  isActive
                    ? "border-primary font-medium text-brand"
                    : "border-transparent text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
