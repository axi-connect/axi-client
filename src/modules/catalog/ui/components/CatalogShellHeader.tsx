"use client";

import { usePathname } from "next/navigation";
import { CatalogNav } from "@/modules/catalog/ui/components/CatalogNav";

/** Rutas que ya pintan su propio encabezado premium (`CatalogHeader`). */
const OWN_HEADER = new Set(["/catalog/products"]);

/**
 * Encabezado compartido del catálogo para las vistas que todavía no pasaron
 * al diseño premium (catálogo premium F3/F4 las migra). El listado de
 * productos lleva el suyo, con el `h1` de la vista y las pestañas debajo.
 */
export function CatalogShellHeader() {
  const pathname = usePathname();
  if (OWN_HEADER.has(pathname)) return null;
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
