import { CatalogProvider } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { CatalogShellHeader } from "@/modules/catalog/ui/components/CatalogShellHeader";

/**
 * Shell de la sección Catálogo. `CatalogProvider` cachea los datos de
 * referencia (catálogos, categorías, tipos) que comparten todas las sub-rutas.
 * El encabezado lo pone cada vista premium (`CatalogHeader`); las que aún no
 * migran reciben el compartido (`CatalogShellHeader`).
 */
export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return (
    <CatalogProvider>
      <div className="space-y-6">
        <CatalogShellHeader />
        {children}
      </div>
    </CatalogProvider>
  );
}
