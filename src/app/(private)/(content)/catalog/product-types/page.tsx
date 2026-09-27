"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import { useAuth } from "@/shared/auth/auth.hooks";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { byCreatedDesc, byName, localList } from "@/modules/catalog/domain/local-list";
import {
  ATTRIBUTE_TYPE_LABELS,
  type ProductTypeListItemDTO,
} from "@/modules/catalog/domain/product-type";
import { deleteProductType } from "@/modules/catalog/infrastructure/services/product-type-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { useCatalogOverview } from "@/modules/catalog/infrastructure/hooks/use-catalog-overview";
import { ListFooter, ListLoadError, ListSearch, ListSkeleton } from "@/modules/catalog/ui/components/LocalListParts";
import { CatalogHeader } from "@/modules/catalog/ui/products/CatalogHeader";

type Sort = "name" | "attributes" | "created";

const SORTS: Record<Sort, (a: ProductTypeListItemDTO, b: ProductTypeListItemDTO) => number> = {
  name: byName,
  attributes: (a, b) => b.attributes.length - a.attributes.length || byName(a, b),
  created: byCreatedDesc,
};

const ACTION = "flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

/**
 * Tipos de producto (`/catalog/product-types`, catálogo premium F4, canvas
 * tablero 9): una lista con buscador, orden real y paginación; cada tipo con
 * sus atributos a la vista, cuántos productos lo usan y sus acciones en la
 * fila. Crear y editar viven en páginas propias (el editor de atributos no
 * cabe en un modal). Paridad: `docs/plans/catalog_premium_f4_paridad.md`.
 */
export default function ProductTypesPage() {
  const { hasPermission } = useAuth();
  const { productTypes, fetchProductTypes, status } = useCatalog();
  const overview = useCatalogOverview();
  const { showAlert } = useAlert();
  const canManage = hasPermission("catalog:manage");

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<ProductTypeListItemDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const view = useMemo(
    () =>
      localList(productTypes, {
        query,
        searchIn: (type) => [type.name, type.description, ...type.attributes.map((attribute) => attribute.label)],
        compare: SORTS[sort],
        page,
      }),
    [page, productTypes, query, sort],
  );

  const handleConfirmDelete = async () => {
    if (!toDelete || deleting) return;
    try {
      setDeleting(true);
      await deleteProductType(toDelete.id);
      showAlert({ tone: "success", title: "Tipo de producto eliminado" });
      setToDelete(null);
      await fetchProductTypes();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el tipo de producto") });
    } finally {
      setDeleting(false);
    }
  };

  const createButton = canManage ? (
    <Button asChild className="rounded-full">
      <Link href="/catalog/product-types/create">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Nuevo tipo
      </Link>
    </Button>
  ) : undefined;
  const inUse = toDelete?.product_count ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <CatalogHeader
        kicker="Catálogo · tipos de producto"
        title="Lo que cada ficha debe decir"
        description="Define atributos tipados por familia (material, talla, color…)."
        actions={createButton}
        productCount={overview.summary.data?.products.total ?? null}
      />

      <section aria-label="Tipos de producto" className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:p-5">
        {status.productTypes === "error" ? (
          <ListLoadError title="No pudimos cargar tus tipos de producto" onRetry={() => void fetchProductTypes()} />
        ) : status.productTypes === "loading" ? (
          <ListSkeleton label="Cargando tipos de producto" />
        ) : productTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <GlassGlyph kind="catalog" />
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              Aún no tienes tipos de producto. Son opcionales, pero dan superpoderes a tus fichas.
            </p>
            {canManage && (
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/catalog/product-types/create">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  Crear el primero
                </Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ListSearch
                value={query}
                onChange={(next) => {
                  setQuery(next);
                  setPage(1);
                }}
                placeholder="Buscar tipo…"
                label="Buscar tipo de producto"
              />
              <SegmentedControl<Sort>
                value={sort}
                onValueChange={(next) => {
                  setSort(next);
                  setPage(1);
                }}
                label="Ordenar por"
                size="sm"
                surface="inline"
                items={[
                  { value: "name", label: "Nombre" },
                  { value: "attributes", label: "Atributos" },
                  { value: "created", label: "Creado" },
                ]}
              />
            </div>

            {view.total === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{`Ningún tipo coincide con «${query.trim()}».`}</p>
            ) : (
              <ul className="divide-y divide-border">
                {view.items.map((type) => {
                  const axes = type.attributes.filter((attribute) => attribute.scope === "variant").length;
                  const shown = type.attributes.slice(0, 4);
                  return (
                    <li key={type.id} className="grid gap-x-5 gap-y-2 py-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_19rem] md:items-center">
                      <Link
                        href={`/catalog/product-types/${type.id}`}
                        className="flex min-w-0 flex-col gap-0.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      >
                        <span className="truncate text-sm font-semibold" title={type.name}>
                          {type.name}
                        </span>
                        <span className="truncate text-xs text-muted-foreground" title={type.description ?? undefined}>
                          {type.description || "—"}
                        </span>
                      </Link>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {shown.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Sin atributos todavía</span>
                        ) : (
                          shown.map((attribute) => (
                            <span key={attribute.id} className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs">
                              <span className="truncate font-medium" title={attribute.label}>
                                {attribute.label}
                              </span>
                              <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                                {[
                                  ATTRIBUTE_TYPE_LABELS[attribute.type].toLowerCase(),
                                  ...(attribute.scope === "variant" ? ["variante"] : []),
                                  ...(attribute.is_required ? ["requerido"] : []),
                                ].join(" · ")}
                              </span>
                            </span>
                          ))
                        )}
                        {type.attributes.length > shown.length ? (
                          <span className="text-xs text-muted-foreground">+{type.attributes.length - shown.length}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs md:justify-end">
                        <span className="flex flex-col whitespace-nowrap">
                          <span>
                            <b className="font-semibold tabular-nums">{type.attributes.length}</b> atributos
                          </span>
                          <span className="text-muted-foreground">{axes === 0 ? "sin ejes" : `${axes} ${axes === 1 ? "eje" : "ejes"} de variante`}</span>
                        </span>
                        <span className="flex flex-col whitespace-nowrap">
                          <span className="tabular-nums">
                            {type.product_count === 0 ? "ningún producto" : `${type.product_count.toLocaleString("es-CO")} ${type.product_count === 1 ? "producto" : "productos"}`}
                          </span>
                          <span className="text-muted-foreground">{`creado ${formatShortDate(type.created_at)}`}</span>
                        </span>
                        {canManage ? (
                          <span className="ml-auto flex items-center md:ml-0">
                            <Link href={`/catalog/product-types/${type.id}`} className={ACTION} aria-label={`Editar ${type.name}`}>
                              <Pencil aria-hidden="true" className="size-4" />
                            </Link>
                            <button type="button" className={`${ACTION} text-destructive hover:text-destructive`} aria-label={`Eliminar ${type.name}`} onClick={() => setToDelete(type)}>
                              <Trash2 aria-hidden="true" className="size-4" />
                            </button>
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <ListFooter
              summary={`${view.total} ${view.total === 1 ? "tipo" : "tipos"} · página ${view.page} de ${view.pages}`}
              page={view.page}
              pages={view.pages}
              onPage={setPage}
            />
          </>
        )}
      </section>

      <Modal
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        config={{
          title: "Eliminar tipo de producto",
          description: `¿Seguro que deseas eliminar “${toDelete?.name ?? ""}”?`,
          // Con productos que lo usan el backend lo rechaza: se dice antes y no se ofrece eliminar.
          actions:
            inUse > 0
              ? [{ label: "Entendido", variant: "outline", id: "product-type-delete-cancel" }]
              : [
                  { label: "Cancelar", variant: "outline", id: "product-type-delete-cancel" },
                  {
                    label: deleting ? "Eliminando…" : "Eliminar",
                    variant: "destructive",
                    keepOpen: true,
                    onClick: handleConfirmDelete,
                    id: "product-type-delete-confirm",
                  },
                ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          {inUse > 0
            ? `Lo usan ${inUse.toLocaleString("es-CO")} ${inUse === 1 ? "producto" : "productos"}: cámbialos de tipo antes de eliminarlo. Sus atributos se borran con él.`
            : "Solo puede eliminarse si ningún producto lo usa. Sus atributos se borran con él."}
        </div>
      </Modal>
    </div>
  );
}
