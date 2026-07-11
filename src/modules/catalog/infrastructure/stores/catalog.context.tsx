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
};

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const [catalogs, setCatalogs] = useState<CatalogListItemDTO[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNodeDTO[]>([]);
  const [productTypes, setProductTypes] = useState<ProductTypeListItemDTO[]>([]);

  const fetchCatalogs = useCallback(async () => {
    try {
      const res = await listCatalogs();
      setCatalogs(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los catálogos"));
    }
  }, []);

  const fetchCategoryTree = useCallback(async () => {
    try {
      const res = await listCategoryTree();
      setCategoryTree(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las categorías"));
    }
  }, []);

  const fetchProductTypes = useCallback(async () => {
    try {
      const res = await listProductTypes();
      setProductTypes(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar los tipos de producto"));
    }
  }, []);

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
