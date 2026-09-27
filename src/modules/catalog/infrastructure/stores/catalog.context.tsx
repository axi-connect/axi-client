"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import type { CatalogListItemDTO } from "@/modules/catalog/domain/catalog";
import type { CategoryTreeNodeDTO } from "@/modules/catalog/domain/category";
import type { ProductTypeListItemDTO } from "@/modules/catalog/domain/product-type";
import { listCatalogs } from "@/modules/catalog/infrastructure/services/catalog-service.adapter";
import { listCategoryTree } from "@/modules/catalog/infrastructure/services/category-service.adapter";
import { listProductTypes } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";

/**
 * Provider del segmento `/catalog`: cachea los datos de referencia que
 * comparten todas las sub-rutas (catálogos, árbol de categorías y tipos de
 * producto) para alimentar selects y filtros sin re-fetch al navegar.
 * Cada vista los refresca (`fetchX`) tras sus propias mutaciones.
 */
type CatalogContextValue = {
  error: string | null;
  catalogs: CatalogListItemDTO[];
  categoryTree: CategoryTreeNodeDTO[];
  productTypes: ProductTypeListItemDTO[];
  fetchCatalogs: () => Promise<void>;
  fetchCategoryTree: () => Promise<void>;
  fetchProductTypes: () => Promise<void>;
  /**
   * Catálogo premium F4: el estado de cada recurso por separado. `error` (arriba)
   * guarda el último mensaje; esto dice qué recurso falló y si ya respondió,
   * para no pintar «vacío» mientras carga ni cuando falló (inventario D.1 #21).
   */
  status: Record<CatalogResource, ResourceStatus>;
};

export type CatalogResource = "catalogs" | "categories" | "productTypes";
export type ResourceStatus = "loading" | "ready" | "error";

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogListItemDTO[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNodeDTO[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeListItemDTO[]>([]);
  const [status, setStatus] = useState<Record<CatalogResource, ResourceStatus>>({
    catalogs: "loading",
    categories: "loading",
    productTypes: "loading",
  });
  const mark = useCallback(
    (resource: CatalogResource, next: ResourceStatus) => setStatus((previous) => ({ ...previous, [resource]: next })),
    [],
  );

  const fetchCatalogs = useCallback(async () => {
    try {
      const res = await listCatalogs();
      setCatalogs(res.data);
      setError(null);
      mark("catalogs", "ready");
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los catálogos"));
      mark("catalogs", "error");
    }
  }, [mark]);

  const fetchCategoryTree = useCallback(async () => {
    try {
      const res = await listCategoryTree();
      setCategoryTree(res.data);
      setError(null);
      mark("categories", "ready");
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las categorías"));
      mark("categories", "error");
    }
  }, [mark]);

  const fetchProductTypes = useCallback(async () => {
    try {
      const res = await listProductTypes();
      setProductTypes(res.data);
      setError(null);
      mark("productTypes", "ready");
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los tipos de producto"));
      mark("productTypes", "error");
    }
  }, [mark]);

  useEffect(() => {
    void fetchCatalogs();
    void fetchCategoryTree();
    void fetchProductTypes();
  }, [fetchCatalogs, fetchCategoryTree, fetchProductTypes]);

  return (
    <CatalogContext.Provider
      value={{
        error,
        catalogs,
        categoryTree,
        productTypes,
        fetchCatalogs,
        fetchCategoryTree,
        fetchProductTypes,
        status,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("useCatalog debe usarse dentro de CatalogProvider");
  return context;
}
