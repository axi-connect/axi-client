import { CatalogProvider } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { CatalogNav } from "@/modules/catalog/ui/components/CatalogNav";

/**
 * Shell de la sección Catálogo: encabezado + sub-navegación persistente.
 * `CatalogProvider` cachea los datos de referencia (catálogos, categorías,
 * tipos) que comparten todas las sub-rutas.
 */
export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Catálogo</h1>
          <p className="text-sm text-muted-foreground">
            Administra tus productos, categorías, tipos de producto y catálogos.
          </p>
        </div>
        <CatalogNav />
        {children}
      </div>
    </CatalogProvider>
  );
}
