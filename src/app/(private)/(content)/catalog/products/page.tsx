"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Input } from "@/shared/components/ui/input";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import BasicPagination from "@/shared/components/ui/pagination";
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert";
import { EmptyState } from "@/shared/components/features/empty-state";
import { flattenCategoryTree } from "@/modules/catalog/domain/category";
import type { ProductListItemDTO } from "@/modules/catalog/domain/product";
import { listProducts } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { ProductFilters, type ProductFiltersValue } from "@/modules/catalog/ui/components/ProductFilters";
import { ProductGrid } from "@/modules/catalog/ui/components/ProductGrid";
import { mapProductToRow, productColumns } from "@/modules/catalog/ui/tables/config/product.config";

const PAGE_SIZE = 20; // default del backend para /catalog/products (no 25)
const VIEW_STORAGE_KEY = "catalog:products:view";

type ViewMode = "table" | "grid";

/**
 * Listado de productos (`/catalog/products`): paginación server-side,
 * búsqueda `q`, filtros por catálogo/categoría/tipo/estado y vista
 * conmutable tabla ⇄ grid (persistida en localStorage).
 */
export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const { catalogs, categoryTree } = useCatalog();
  const canManage = hasPermission("catalog:manage");

  const [view, setView] = useState<ViewMode>("table");
  const [filters, setFilters] = useState<ProductFiltersValue>({});
  const [gridSearch, setGridSearch] = useState("");
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);

  // La vista se restaura tras el mount (evita mismatch de hidratación SSR).
  useEffect(() => {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === "grid" || stored === "table") setView(stored);
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  };

  const extraParams = useMemo(
    () => ({
      catalog_id: filters.catalog_id,
      category_id: filters.category_id,
      kind: filters.kind,
      is_active: filters.is_active,
    }),
    [filters],
  );

  const {
    items,
    total,
    loading,
    error,
    page,
    setPage,
    setSearch,
    searchValue,
    refresh,
  } = usePaginatedList<ProductListItemDTO, "q">({
    fetcher: listProducts,
    pageSize: PAGE_SIZE,
    searchField: "q",
    extraParams,
  });

  const categoryOptions = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((option) => [option.id, option.label])),
    [categoryOptions],
  );
  const rows = useMemo(
    () => items.map((item) => mapProductToRow(item, categoryNameById)),
    [items, categoryNameById],
  );

  useEffect(() => {
    const onDeleteSuccess = () => {
      setAlertConfig({ variant: "success", title: "Producto eliminado correctamente" });
      setAlertOpen(true);
      void refresh();
    };
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      setAlertConfig({ variant: "destructive", title: detail?.message || "No se pudo completar la acción" });
      setAlertOpen(true);
    };
    window.addEventListener("products:delete:success", onDeleteSuccess);
    window.addEventListener("products:error", onError);
    return () => {
      window.removeEventListener("products:delete:success", onDeleteSuccess);
      window.removeEventListener("products:error", onError);
    };
  }, [refresh]);

  const hasFilters = Object.values(filters).some((value) => value !== undefined);
  const isEmpty = !loading && total === 0 && !searchValue && !hasFilters;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Productos</h2>
          <p className="text-sm text-muted-foreground">
            Tu catálogo completo: productos físicos y servicios agendables.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            value={view}
            onValueChange={changeView}
            label="Cambiar vista"
            size="sm"
            surface="inline"
            // Solo iconos: el nombre de la vista lo dice la propia vista.
            labels="active"
            items={[
              { value: "table" as ViewMode, label: "Tabla", icon: List },
              { value: "grid" as ViewMode, label: "Tarjetas", icon: LayoutGrid },
            ]}
          />
          {canManage && (
            <Button asChild className="rounded-full">
              <Link href="/catalog/products/create">
                <Plus className="h-4 w-4" />
                Crear producto
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          glyph="catalog"
          variant="solid"
          title="Aún no tienes productos"
          description="Crea el primero para que tu equipo y la IA puedan ofrecerlo."
          action={
            canManage ? (
              <Button asChild className="rounded-full">
                <Link href="/catalog/products/create">
                  <Plus className="h-4 w-4" />
                  Crear producto
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-background p-4 md:p-6">
          <ProductFilters
            value={filters}
            onChange={setFilters}
            catalogs={catalogs}
            categories={categoryOptions}
          />

          {view === "table" ? (
            loading && rows.length === 0 ? (
              <TableSkeleton rows={6} showHeader={false} />
            ) : (
              <DataTable
                data={rows}
                columns={productColumns}
                pagination={{ page, pageSize: PAGE_SIZE, total }}
                onPageChange={setPage}
                search={{ field: "name", value: searchValue ?? "" }}
                onSearchChange={({ value }) => setSearch(value)}
                preferredSearchFields={["name"]}
                messages={{
                  searchPlaceholder: () => "Buscar productos…",
                  empty: "Sin resultados para esta búsqueda",
                }}
              />
            )
          ) : (
            <div className="space-y-4">
              <form
                className="relative max-w-sm"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearch(gridSearch);
                }}
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={gridSearch}
                  onChange={(e) => setGridSearch(e.target.value)}
                  placeholder="Buscar productos…"
                  className="pl-9"
                  aria-label="Buscar productos"
                />
              </form>
              {loading && rows.length === 0 ? (
                <TableSkeleton rows={4} showHeader={false} />
              ) : rows.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Sin resultados para esta búsqueda
                </p>
              ) : (
                <ProductGrid rows={rows} />
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground tabular-nums">
                  Página {page} de {totalPages} — {total} productos
                </span>
                <BasicPagination totalPages={totalPages} page={page} onPageChange={setPage} />
              </div>
            </div>
          )}
        </div>
      )}

      <FloatingAlert
        open={alertOpen}
        onOpenChange={setAlertOpen}
        config={{
          variant: alertConfig?.variant ?? "default",
          title: alertConfig?.title ?? "",
          description: alertConfig?.description,
          durationMs: 4000,
        }}
      />
    </div>
  );
}
