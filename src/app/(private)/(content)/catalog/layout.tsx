import { CatalogProvider } from "@/modules/catalog/infrastructure/stores/catalog.context";

/**
 * Shell de la sección Catálogo. `CatalogProvider` cachea los datos de
 * referencia (catálogos, categorías, tipos) que comparten todas las sub-rutas.
 * Cada vista pinta su propio encabezado (catálogo premium): `CatalogHeader` en
 * las secciones con pestañas; la ficha, crear y el detalle de un tipo, su
 * enlace de vuelta y su `h1`.
 */
export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return <CatalogProvider>{children}</CatalogProvider>;
}
