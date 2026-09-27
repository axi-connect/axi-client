"use client";

import { usePathname } from "next/navigation";
import { CatalogNav } from "@/modules/catalog/ui/components/CatalogNav";

/** Todo `/catalog/products/**` (listado, crear y la ficha) lleva su propio encabezado desde F3. */
const hasOwnHeader = (pathname: string) => pathname === "/catalog/products" || pathname.startsWith("/catalog/products/");

/**
 * Encabezado compartido del catálogo para las vistas que todavía no pasaron
 * al diseño premium (catálogo premium F3/F4 las migra). El listado de
 * productos lleva el suyo, con el `h1` de la vista y las pestañas debajo.
 */
export function CatalogShellHeader() {
  const pathname = usePathname();
  if (hasOwnHeader(pathname)) return null;
  return (
    <>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Catálogo</h1>
        <p className="text-sm text-muted-foreground">
          Administra tus productos, categorías, tipos de producto y catálogos.
        </p>
      </div>
      <CatalogNav />
    </>
  );
}
