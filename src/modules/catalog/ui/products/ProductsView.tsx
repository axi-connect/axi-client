"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, List, Plus, Search, X } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { EmptyState } from "@/shared/components/features/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import BasicPagination from "@/shared/components/ui/pagination";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { flattenCategoryTree } from "@/modules/catalog/domain/category";
import {
  hasProductListFilters,
  parseProductListQuery,
  productFilterChips,
  serializeProductListQuery,
  withFilter,
  withoutFilters,
  type ProductListFilterKey,
  type ProductListFilters,
  type ProductListQuery,
} from "@/modules/catalog/domain/product-list-query";
import { useCatalogOverview } from "@/modules/catalog/infrastructure/hooks/use-catalog-overview";
import { PRODUCTS_PAGE_SIZE, useProductList } from "@/modules/catalog/infrastructure/hooks/use-product-list";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { ProductFilters } from "@/modules/catalog/ui/components/ProductFilters";
import { ProductGrid } from "@/modules/catalog/ui/components/ProductGrid";
import { mapProductToRow } from "@/modules/catalog/ui/tables/config/product.config";
import { CatalogHeader } from "./CatalogHeader";
import { ProductsOverview } from "./ProductsOverview";
import { ProductRowsSkeleton, ProductsLoadError, ProductsNoResults } from "./ProductsListStates";
import { ProductsTable } from "./ProductsTable";

const VIEW_STORAGE_KEY = "catalog:products:view";
const SEARCH_DEBOUNCE_MS = 350;

type ViewMode = "table" | "grid";

function readView(): ViewMode | null {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return stored === "grid" || stored === "table" ? stored : null;
  } catch {
    // Sin acceso al almacenamiento (privado, bloqueado): la vista por defecto.
    return null;
  }
}

function writeView(view: ViewMode) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    // La preferencia es una comodidad: si no se guarda, la vista igual cambia.
  }
}

/**
 * Listado de productos (`/catalog/products`, catálogo premium F2, canvas
 * tableros 1–3): encabezado del módulo, el bento con la isla «Lo próximo» y
 * el listado con UNA búsqueda y los filtros en la URL, en tabla o tarjetas
 * con los mismos datos. Paridad con la vista anterior:
 * `docs/plans/catalog_premium_f2_paridad.md`.
 */
export function ProductsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { showAlert } = useAlert();
  const { hasPermission } = useAuth();
  const { catalogs, categoryTree } = useCatalog();
  const canManage = hasPermission("catalog:manage");

  const paramsKey = searchParams.toString();
  const query = useMemo(() => parseProductListQuery(new URLSearchParams(paramsKey)), [paramsKey]);
  const { items, total, loading, settled, error, refresh } = useProductList(query);
  const overview = useCatalogOverview();
  const reloadOverview = overview.reload;

  const navigate = useCallback(
    (next: ProductListQuery) => {
      const search = serializeProductListQuery(next);
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  // La vista se restaura tras el mount (evita el desajuste de hidratación SSR).
  const [view, setView] = useState<ViewMode>("table");
  useEffect(() => {
    const stored = readView();
    if (stored !== null) setView(stored);
  }, []);
  const changeView = (next: ViewMode) => {
    setView(next);
    writeView(next);
  };

  // Una sola búsqueda para las dos vistas, con debounce; la URL manda.
  const [searchDraft, setSearchDraft] = useState(query.q ?? "");
  const lastPushed = useRef(query.q ?? "");
  useEffect(() => {
    // Si la URL cambia desde fuera (atrás, un enlace de la isla), el campo la sigue.
    if ((query.q ?? "") !== lastPushed.current) {
      lastPushed.current = query.q ?? "";
      setSearchDraft(query.q ?? "");
    }
  }, [query.q]);
  useEffect(() => {
    const value = searchDraft.trim();
    if (value === (query.q ?? "")) return;
    const timer = window.setTimeout(() => {
      lastPushed.current = value;
      navigate({ ...query, q: value || undefined, page: 1 });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [navigate, query, searchDraft]);

  const clearSearch = () => {
    setSearchDraft("");
    lastPushed.current = "";
    navigate({ ...query, q: undefined, page: 1 });
  };

  const setFilter = <K extends ProductListFilterKey>(key: K, value: ProductListFilters[K]) =>
    navigate(withFilter(query, key, value));

  // Borrar desde el menú de una fila: aviso, y se recargan listado y cifras.
  useEffect(() => {
    const onDeleteSuccess = () => {
      showAlert({ tone: "success", title: "Producto eliminado correctamente" });
      refresh();
      reloadOverview();
    };
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      showAlert({ tone: "error", title: detail?.message || "No se pudo completar la acción" });
    };
    window.addEventListener("products:delete:success", onDeleteSuccess);
    window.addEventListener("products:error", onError);
    return () => {
      window.removeEventListener("products:delete:success", onDeleteSuccess);
      window.removeEventListener("products:error", onError);
    };
  }, [refresh, reloadOverview, showAlert]);

  const categoryOptions = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const categoryNameById = useMemo(
    () => new Map(categoryOptions.map((option) => [option.id, option.label])),
    [categoryOptions],
  );
  const rows = useMemo(() => items.map((item) => mapProductToRow(item, categoryNameById)), [items, categoryNameById]);

  const filtered = hasProductListFilters(query);
  const chips = productFilterChips(query, {
    catalog: catalogs.find((catalog) => catalog.id === query.catalog_id)?.name,
    category: query.category_id !== undefined ? categoryNameById.get(query.category_id) : undefined,
  });
  const totalPages = Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE));

  // Una página que ya no existe (se borraron productos, un enlace viejo): a la última que sí.
  useEffect(() => {
    if (settled && error === null && total > 0 && items.length === 0 && query.page > totalPages) {
      navigate({ ...query, page: totalPages });
    }
  }, [error, items.length, navigate, query, settled, total, totalPages]);
  const emptyCatalog = settled && error === null && total === 0 && query.q === undefined && !filtered;
  const productTotal = overview.summary.data?.products.total ?? null;

  const createButton = canManage ? (
    <Button asChild className="rounded-full">
      <Link href="/catalog/products/create">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Crear producto
      </Link>
    </Button>
  ) : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <CatalogHeader
        kicker={
          productTotal !== null
            ? `Catálogo · ${productTotal.toLocaleString("es-CO")} ${productTotal === 1 ? "producto o servicio" : "productos y servicios"}`
            : "Catálogo"
        }
        title="Lo que vendes, listo para tu agente"
        description="Tu catálogo completo: productos físicos y servicios agendables."
        actions={createButton}
        productCount={productTotal}
      />

      {emptyCatalog ? (
        <EmptyState
          glyph="catalog"
          variant="solid"
          title="Aún no tienes productos"
          description="Crea el primero para que tu equipo y la IA puedan ofrecerlo."
          action={createButton}
        />
      ) : (
        <>
          <ProductsOverview overview={overview} />

          <section aria-label="Productos" className="@container flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card pt-4 pb-2">
            <div className="flex flex-col gap-2.5 px-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 basis-full sm:max-w-72 sm:flex-1 sm:basis-auto">
                  <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchDraft}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder="Buscar productos…"
                    aria-label="Buscar productos"
                    className={cn("h-9 rounded-full pl-9", searchDraft !== "" && "pr-9")}
                  />
                  {searchDraft !== "" ? (
                    <button
                      type="button"
                      onClick={clearSearch}
                      aria-label="Borrar la búsqueda"
                      className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <X aria-hidden="true" className="size-3.5" />
                    </button>
                  ) : null}
                </div>
                <div className="ml-auto shrink-0">
                  <SegmentedControl
                    value={view}
                    onValueChange={changeView}
                    label="Cambiar vista"
                    size="sm"
                    surface="inline"
                    labels="active"
                    items={[
                      { value: "table" as ViewMode, label: "Tabla", icon: List },
                      { value: "grid" as ViewMode, label: "Tarjetas", icon: LayoutGrid },
                    ]}
                  />
                </div>
              </div>
              <ProductFilters value={query} onChange={setFilter} catalogs={catalogs} categories={categoryOptions} />
            </div>

            {chips.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 px-4">
                <span className="text-xs text-muted-foreground">Filtrando:</span>
                {chips.map((chip) => (
                  <span key={chip.key} className="inline-flex h-7 items-center gap-1 rounded-full bg-muted pr-1 pl-3 text-xs font-medium">
                    {chip.label}
                    <button
                      type="button"
                      onClick={() => setFilter(chip.key, undefined)}
                      aria-label={`Quitar el filtro ${chip.label}`}
                      className="flex size-6 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                    >
                      <X aria-hidden="true" className="size-3" />
                    </button>
                  </span>
                ))}
                <Button variant="ghost" size="sm" className="h-7 rounded-full px-3" onClick={() => navigate(withoutFilters(query))}>
                  Limpiar filtros
                </Button>
                {settled && error === null ? (
                  <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                    {`${total.toLocaleString("es-CO")} ${total === 1 ? "producto" : "productos"}`}
                  </span>
                ) : null}
              </div>
            ) : null}

            {error !== null ? (
              <ProductsLoadError message={errorMessage(error)} onRetry={refresh} />
            ) : !settled ? (
              <ProductRowsSkeleton />
            ) : rows.length === 0 ? (
              <ProductsNoResults
                byFilters={filtered}
                search={query.q}
                onClearFilters={() => navigate(withoutFilters(query))}
                onClearSearch={clearSearch}
              />
            ) : view === "table" ? (
              <ProductsTable rows={rows} busy={loading} />
            ) : (
              <div className="px-4 pt-1">
                <ProductGrid rows={rows} busy={loading} canManage={canManage} />
              </div>
            )}

            {error === null && settled && total > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 px-5 pt-1 pb-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {`Página ${query.page} de ${totalPages} · ${total.toLocaleString("es-CO")} ${total === 1 ? "producto" : "productos"}`}
                </span>
                {totalPages > 1 ? (
                  <BasicPagination
                    totalPages={totalPages}
                    page={query.page}
                    onPageChange={(page) => navigate({ ...query, page })}
                  />
                ) : null}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
