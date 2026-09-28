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
import type { CatalogListItemDTO } from "@/modules/catalog/domain/catalog";
import { byCreatedDesc, byName, localList } from "@/modules/catalog/domain/local-list";
import { deleteCatalog } from "@/modules/catalog/infrastructure/services/catalog-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { useCatalogOverview } from "@/modules/catalog/infrastructure/hooks/use-catalog-overview";
import { CatalogForm } from "@/modules/catalog/ui/forms/CatalogForm";
import type { CatalogFormValues } from "@/modules/catalog/ui/forms/config/catalog.config";
import { ListFooter, ListLoadError, ListSearch, ListSkeleton } from "@/modules/catalog/ui/components/LocalListParts";
import { CatalogHeader } from "@/modules/catalog/ui/products/CatalogHeader";

type Sort = "name" | "products" | "created";

const SORTS: Record<Sort, (a: CatalogListItemDTO, b: CatalogListItemDTO) => number> = {
  name: byName,
  products: (a, b) => b.product_count - a.product_count || byName(a, b),
  created: byCreatedDesc,
};

const ACTION = "flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

/**
 * Catálogos (`/catalog/catalogs`, catálogo premium F4, canvas tablero 11): una
 * lista con buscador, orden y paginación; cada catálogo con su código, sus
 * productos (enlace al listado filtrado) y sus acciones en la fila. Crear y
 * editar siguen en el mismo modal. Paridad: `docs/plans/catalog_premium_f4_paridad.md`.
 */
export default function CatalogsPage() {
  const { hasPermission } = useAuth();
  const { catalogs, fetchCatalogs, status } = useCatalog();
  const overview = useCatalogOverview();
  const { showAlert } = useAlert();
  const canManage = hasPermission("catalog:manage");

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("name");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<(Partial<CatalogFormValues> & { id?: string }) | null>(null);
  const [toDelete, setToDelete] = useState<CatalogListItemDTO | null>(null);
  const [deleting, setDeleting] = useState(false);

  const view = useMemo(
    () =>
      localList(catalogs, {
        query,
        searchIn: (catalog) => [catalog.name, catalog.code, catalog.description],
        compare: SORTS[sort],
        page,
      }),
    [catalogs, page, query, sort],
  );

  const openCreate = () => {
    setFormDefaults(null);
    setModalOpen(true);
  };
  const openEdit = (catalog: CatalogListItemDTO) => {
    setFormDefaults({ id: catalog.id, name: catalog.name, code: catalog.code, description: catalog.description ?? "" });
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!toDelete || deleting) return;
    try {
      setDeleting(true);
      await deleteCatalog(toDelete.id);
      showAlert({ tone: "success", title: "Catálogo eliminado correctamente" });
      setToDelete(null);
      await fetchCatalogs();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el catálogo") });
    } finally {
      setDeleting(false);
    }
  };

  const isEdit = Boolean(formDefaults?.id);
  const createButton = canManage ? (
    <Button className="rounded-full" onClick={openCreate}>
      <Plus aria-hidden="true" className="h-4 w-4" />
      Crear catálogo
    </Button>
  ) : undefined;
  const products = toDelete?.product_count ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <CatalogHeader
        kicker="Catálogo · catálogos"
        title="Tus productos, agrupados"
        description="Agrupa tus productos por catálogo (principal, temporadas, líneas)."
        actions={createButton}
        productCount={overview.summary.data?.products.total ?? null}
      />

      <section aria-label="Catálogos" className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:p-5">
        {status.catalogs === "error" ? (
          <ListLoadError title="No pudimos cargar tus catálogos" onRetry={() => void fetchCatalogs()} />
        ) : status.catalogs === "loading" ? (
          <ListSkeleton label="Cargando catálogos" />
        ) : catalogs.length === 0 ? (
          // Antes no había estado vacío: la tabla decía «Sin resultados» (D.1 #21).
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <GlassGlyph kind="catalog" />
            <p className="max-w-sm text-sm text-pretty text-muted-foreground">
              Aún no tienes catálogos. Crea uno para ubicar tus productos.
            </p>
            {canManage && (
              <Button variant="outline" className="rounded-full" onClick={openCreate}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Crear el primero
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
                placeholder="Buscar catálogo…"
                label="Buscar catálogo"
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
                  { value: "products", label: "Productos" },
                  { value: "created", label: "Creado" },
                ]}
              />
            </div>

            {view.total === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{`Ningún catálogo coincide con «${query.trim()}».`}</p>
            ) : (
              <ul className="divide-y divide-border">
                {view.items.map((catalog) => (
                  <li key={catalog.id} className="grid gap-x-5 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] md:items-center">
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-sm font-semibold" title={catalog.name}>
                        {catalog.name}
                      </span>
                      <code className="w-fit max-w-full truncate rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11.5px]" title={catalog.code}>
                        {catalog.code}
                      </code>
                    </span>
                    <span className="hidden truncate text-sm text-muted-foreground md:block" title={catalog.description ?? undefined}>
                      {catalog.description || "—"}
                    </span>
                    <span className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:justify-end">
                      <span className="flex flex-col whitespace-nowrap">
                        <Link
                          href={`/catalog/products?catalog_id=${catalog.id}`}
                          className="inline-flex min-h-6 items-center font-medium tabular-nums underline-offset-4 hover:underline"
                        >
                          {`${catalog.product_count.toLocaleString("es-CO")} ${catalog.product_count === 1 ? "producto" : "productos"}`}
                        </Link>
                        <span className="text-muted-foreground">{`creado ${formatShortDate(catalog.created_at)}`}</span>
                      </span>
                      {canManage ? (
                        <span className="ml-auto flex items-center sm:ml-0">
                          <button type="button" className={ACTION} aria-label={`Editar ${catalog.name}`} onClick={() => openEdit(catalog)}>
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                          <button type="button" className={`${ACTION} text-destructive hover:text-destructive`} aria-label={`Eliminar ${catalog.name}`} onClick={() => setToDelete(catalog)}>
                            <Trash2 aria-hidden="true" className="size-4" />
                          </button>
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <ListFooter
              summary={`${view.total} ${view.total === 1 ? "catálogo" : "catálogos"} · página ${view.page} de ${view.pages}`}
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
          title: "Eliminar catálogo",
          description: `¿Seguro que deseas eliminar “${toDelete?.name ?? ""}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", id: "catalog-delete-cancel" },
            {
              label: deleting ? "Eliminando…" : "Eliminar",
              variant: "destructive",
              keepOpen: true,
              onClick: handleConfirmDelete,
              id: "catalog-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          {products > 0
            ? `Sus ${products.toLocaleString("es-CO")} ${products === 1 ? "producto dejará" : "productos dejarán"} de estar disponibles para la IA y el equipo.`
            : "Los productos del catálogo dejarán de estar disponibles para la IA y el equipo."}
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: isEdit ? "Editar catálogo" : "Crear catálogo",
          description: isEdit ? "Actualiza la información del catálogo" : "Define un nuevo agrupador de productos",
          actions: [
            { label: "Cancelar", variant: "outline", id: "catalog-cancel" },
            {
              label: isEdit ? "Guardar cambios" : "Guardar",
              variant: "default",
              keepOpen: true,
              id: "catalog-save",
              onClick: () => (document.getElementById("catalog-form") as HTMLFormElement | null)?.requestSubmit(),
            },
          ],
        }}
      >
        <CatalogForm
          host={{
            setAlert: showAlert,
            closeModal: () => setModalOpen(false),
            defaultValues: formDefaults,
            refresh: fetchCatalogs,
          }}
        />
      </Modal>
    </div>
  );
}
