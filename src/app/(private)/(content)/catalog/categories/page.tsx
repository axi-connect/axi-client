"use client";

import { useMemo, useState } from "react";
import { AlertCircle, EyeOff, Plus, RefreshCw, Search, Sparkles, Store, Tag, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { BentoFigure, BentoLink, BentoTile } from "@/shared/components/features/bento";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import {
  categoryTreeStats,
  flattenCategoryTree,
  isTaxonomyCategory,
  searchCategoryTree,
  type CategoryTreeNodeDTO,
} from "@/modules/catalog/domain/category";
import { share, VERTICAL_LABELS } from "@/modules/catalog/domain/catalog-summary";
import {
  deleteCategory,
  ensurePlatformTaxonomy,
  updateCategory,
} from "@/modules/catalog/infrastructure/services/category-service.adapter";
import { useCatalogOverview } from "@/modules/catalog/infrastructure/hooks/use-catalog-overview";
import { CategoryTree } from "@/modules/catalog/ui/components/CategoryTree";
import { CatalogHeader } from "@/modules/catalog/ui/products/CatalogHeader";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { CategoryForm } from "@/modules/catalog/ui/forms/CategoryForm";
import {
  ROOT_PARENT_VALUE,
  type CategoryFormValues,
} from "@/modules/catalog/ui/forms/config/category.config";

/** Ids del subárbol de un nodo (para excluirlo del select de padre al editar). */
function collectSubtreeIds(node: CategoryTreeNodeDTO): string[] {
  return [node.id, ...(node.children ?? []).flatMap(collectSubtreeIds)];
}

function findNode(nodes: CategoryTreeNodeDTO[], id: string): CategoryTreeNodeDTO | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNode(node.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

const n = (value: number) => value.toLocaleString("es-CO");

/**
 * Categorías (`/catalog/categories`, catálogo premium F4, canvas tablero 8):
 * el bento (clasificación, el árbol, la taxonomía del negocio) y el árbol con
 * búsqueda en todo el árbol, origen, sinónimos, productos por categoría y las
 * acciones en la fila. El backend limita la profundidad a 6 niveles y bloquea
 * el borrado si hay hijos o productos. Paridad:
 * `docs/plans/catalog_premium_f4_paridad.md`.
 */
export default function CategoriesPage() {
  const { hasPermission } = useAuth();
  const { categoryTree, fetchCategoryTree, status } = useCatalog();
  const overview = useCatalogOverview();
  const canManage = hasPermission("catalog:manage");

  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<(Partial<CategoryFormValues> & { id?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; hide: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const { showAlert } = useAlert();

  const flat = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);

  /** Opciones de padre para el form (excluye el subárbol del nodo en edición). */
  const parentOptions = useMemo(() => {
    const excluded = formDefaults?.id
      ? new Set(collectSubtreeIds(findNode(categoryTree, formDefaults.id) ?? ({ id: formDefaults.id, children: [] } as unknown as CategoryTreeNodeDTO)))
      : new Set<string>();
    return flat
      .filter((item) => !excluded.has(item.id))
      .map((item) => ({ id: item.id, label: item.label, depth: item.depth }));
  }, [flat, categoryTree, formDefaults?.id]);

  const openCreate = (parent?: CategoryTreeNodeDTO) => {
    setFormDefaults({
      parent_id: parent?.id ?? ROOT_PARENT_VALUE,
      position: 0,
    });
    setModalOpen(true);
  };

  const openEdit = (dto: CategoryTreeNodeDTO) => {
    setFormDefaults({
      id: dto.id,
      name: dto.name,
      parent_id: dto.parent_id ?? ROOT_PARENT_VALUE,
      description: dto.description ?? "",
      position: dto.position,
      is_active: dto.is_active ? "active" : "inactive",
      search_aliases: dto.search_aliases,
    });
    setModalOpen(true);
  };

  /** Siembra idempotente de la taxonomía del tipo de negocio (D2). */
  const refreshTaxonomy = async () => {
    if (seeding) return;
    try {
      setSeeding(true);
      const result = await ensurePlatformTaxonomy();
      const touched = result.created + result.adopted + result.updated;
      showAlert({
        tone: "success",
        title: touched === 0 ? "La taxonomía ya estaba al día" : "Taxonomía actualizada",
        description:
          touched === 0
            ? undefined
            : `${result.created} nuevas · ${result.adopted} adoptadas por nombre · ${result.updated} con sinónimos nuevos`,
      });
      await fetchCategoryTree();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo actualizar la taxonomía") });
    } finally {
      setSeeding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.id);
      showAlert({
        tone: "success",
        title: deleteTarget.hide ? "Categoría oculta" : "Categoría eliminada correctamente",
        description: deleteTarget.hide
          ? "El agente ya no la ofrece y sus productos vuelven a la clasificación automática."
          : undefined,
      });
      setDeleteTarget(null);
      await fetchCategoryTree();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar la categoría") });
    } finally {
      setDeleting(false);
    }
  };

  /** Volver a mostrar una oculta: la vía era Editar → Estado; ahora está en su fila (D.1 #25). */
  const showCategory = async (node: CategoryTreeNodeDTO) => {
    try {
      await updateCategory(node.id, { is_active: true });
      showAlert({ tone: "success", title: "Categoría visible", description: "Tu agente vuelve a ofrecerla." });
      await fetchCategoryTree();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo mostrar la categoría") });
    }
  };

  const isEdit = Boolean(formDefaults?.id);
  const loaded = status.categories !== "loading";
  const isEmpty = status.categories === "ready" && categoryTree.length === 0;
  const stats = useMemo(() => categoryTreeStats(categoryTree), [categoryTree]);
  const searched = useMemo(() => searchCategoryTree(categoryTree, search), [categoryTree, search]);
  const searching = search.trim() !== "";
  const allIds = useMemo(() => flat.map((item) => item.id), [flat]);
  const toggle = (id: string) =>
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const classification = overview.classification.data;
  const vertical = overview.enrichment.data?.vertical;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <CatalogHeader
        kicker="Catálogo · categorías"
        title="Cómo está ordenado lo que vendes"
        description="La plataforma trae la base de tu tipo de negocio y la mantiene al día; tú renombras, ocultas o agregas las tuyas. Árbol de hasta 6 niveles."
        productCount={overview.summary.data?.products.total ?? null}
        actions={
          canManage ? (
            <>
              <Button variant="outline" className="rounded-full" onClick={() => void refreshTaxonomy()} disabled={seeding}>
                <RefreshCw aria-hidden="true" className={seeding ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
                Actualizar taxonomía
              </Button>
              <Button className="rounded-full" onClick={() => openCreate()}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Nueva categoría
              </Button>
            </>
          ) : undefined
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
        {classification ? (
          <BentoTile label="Clasificación" aside={<BentoLink href="/catalog/products?uncategorized=true">Ver sin categoría</BentoLink>}>
            <BentoFigure value={n(classification.categorized)} unit={`de ${n(classification.products)} con categoría`} />
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="meter" aria-label="Productos con categoría" aria-valuemin={0} aria-valuemax={classification.products} aria-valuenow={classification.categorized}>
              <div className="h-full rounded-full bg-accent-violet" style={{ width: `${share(classification.categorized, classification.products)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="whitespace-nowrap">{`${n(classification.automatic)} automáticas por confirmar`}</span>
              {" · "}
              <span className="whitespace-nowrap">{`${n(Math.max(0, classification.products - classification.categorized))} sin categoría`}</span>
            </p>
          </BentoTile>
        ) : overview.classification.status === "loading" ? (
          <Skeleton className="h-40 rounded-3xl" />
        ) : (
          <BentoTile label="Clasificación">
            <p role="alert" className="text-sm">No pudimos leer la clasificación de tus productos.</p>
            <Button variant="outline" size="sm" className="mt-auto w-fit rounded-full px-4" onClick={overview.reload}>Reintentar</Button>
          </BentoTile>
        )}

        {loaded && status.categories === "ready" ? (
          <BentoTile label="Tu árbol" aside={<span className="text-xs whitespace-nowrap text-muted-foreground">hasta 6 niveles</span>}>
            <BentoFigure value={n(stats.total)} unit={stats.total === 1 ? "categoría" : "categorías"} />
            <p className="text-xs text-muted-foreground">
              {[
                `${n(stats.byOrigin.platform)} de la plataforma`,
                `${n(stats.byOrigin.tenant)} ${stats.byOrigin.tenant === 1 ? "tuya" : "tuyas"}`,
                ...(stats.byOrigin.integration > 0 ? [`${n(stats.byOrigin.integration)} de tu tienda`] : []),
              ].map((part, index, all) => (
                <span key={part}>
                  <span className="whitespace-nowrap">{part}</span>
                  {index < all.length - 1 ? " · " : null}
                </span>
              ))}
            </p>
            <p className="mt-auto text-xs text-muted-foreground">
              {stats.hidden > 0 ? `${n(stats.hidden)} ${stats.hidden === 1 ? "oculta: tu agente no la ofrece" : "ocultas: tu agente no las ofrece"}` : "Todas visibles para tu agente"}
            </p>
          </BentoTile>
        ) : (
          <Skeleton className="h-40 rounded-3xl" />
        )}

        <BentoTile label="Taxonomía de tu tipo de negocio" className="md:col-span-2 xl:col-span-1">
          {vertical ? (
            <p className="font-heading text-2xl leading-tight font-bold tracking-tight">{VERTICAL_LABELS[vertical]}</p>
          ) : overview.enrichment.status === "loading" ? (
            <Skeleton className="h-7 w-40 rounded-lg" />
          ) : (
            <p className="text-sm text-muted-foreground">No pudimos leer tu tipo de negocio.</p>
          )}
          <p className="text-xs text-pretty text-muted-foreground">
            «Actualizar taxonomía» trae lo nuevo de la plataforma sin tocar lo que renombraste u ocultaste.
          </p>
        </BentoTile>
      </div>

      <section aria-labelledby="category-tree-title" className="flex min-w-0 flex-col gap-3 rounded-3xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="category-tree-title" className="text-[15px] font-semibold">Árbol de categorías</h2>
          <ul aria-label="Leyenda" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <li className="inline-flex items-center gap-1.5"><Sparkles aria-hidden="true" className="size-3.5 text-accent-violet" />Plataforma</li>
            <li className="inline-flex items-center gap-1.5"><Tag aria-hidden="true" className="size-3.5" />Propia</li>
            <li className="inline-flex items-center gap-1.5"><Store aria-hidden="true" className="size-3.5" />De tu tienda</li>
            <li className="inline-flex items-center gap-1.5"><EyeOff aria-hidden="true" className="size-3.5" />Oculta</li>
          </ul>
        </div>

        {status.categories === "error" ? (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>No pudimos cargar tus categorías</AlertTitle>
            <AlertDescription>
              <Button variant="outline" size="sm" className="mt-2 rounded-full px-4 text-foreground" onClick={() => void fetchCategoryTree()}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        ) : !loaded ? (
          <div role="status" aria-label="Cargando categorías" className="flex flex-col gap-3 py-2">
            {["60%", "45%", "70%", "38%", "52%"].map((width, index) => (
              <div key={width} className="flex items-center gap-3" style={{ paddingLeft: `${(index % 2) * 1.5}rem` }}>
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-3 rounded-md" style={{ width }} />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <GlassGlyph kind="catalog" />
            <p className="text-sm text-muted-foreground">Aún no tienes categorías.</p>
            {canManage && (
              <Button variant="outline" className="rounded-full" onClick={() => openCreate()}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                Crear la primera
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 basis-60 sm:max-w-sm">
                <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar categoría…"
                  className={search ? "h-9 rounded-full pr-9 pl-9" : "h-9 rounded-full pl-9"}
                  aria-label="Buscar categoría"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Borrar la búsqueda"
                    className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </button>
                ) : null}
              </div>
              {!searching ? (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setExpanded(new Set(allIds))}>
                    Expandir todo
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setExpanded(new Set())}>
                    Contraer todo
                  </Button>
                </div>
              ) : (
                <p role="status" className="text-xs text-muted-foreground">
                  {searched.matches === 0
                    ? "Sin coincidencias"
                    : `${n(searched.matches)} ${searched.matches === 1 ? "coincidencia" : "coincidencias"}, también dentro de las ramas plegadas`}
                </p>
              )}
            </div>
            {searching && searched.matches === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{`Ninguna categoría coincide con «${search.trim()}».`}</p>
            ) : (
              <CategoryTree
                nodes={searched.nodes}
                expanded={searching ? searched.expand : expanded}
                onToggle={toggle}
                canManage={canManage}
                onCreateChild={(node) => openCreate(node)}
                onEdit={openEdit}
                onRemove={(node) => setDeleteTarget({ id: node.id, name: node.name, hide: isTaxonomyCategory(node) })}
                onShow={(node) => void showCategory(node)}
              />
            )}
          </>
        )}
      </section>

      <Modal
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        config={{
          title: deleteTarget?.hide ? "Ocultar categoría" : "Eliminar categoría",
          description: deleteTarget?.hide
            ? `“${deleteTarget.name}” dejará de ofrecerse y de usarse para clasificar. Puedes mostrarla de nuevo desde Editar.`
            : `¿Seguro que deseas eliminar “${deleteTarget?.name ?? ""}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "category-delete-cancel" },
            {
              label: deleting ? (deleteTarget?.hide ? "Ocultando…" : "Eliminando…") : deleteTarget?.hide ? "Ocultar" : "Eliminar",
              variant: deleteTarget?.hide ? "default" : "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "category-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          {deleteTarget?.hide
            ? "Es una categoría de la taxonomía de tu tipo de negocio: no se borra, se oculta, para que la próxima actualización no la vuelva a crear."
            : "Solo puede eliminarse si no tiene subcategorías ni productos asociados."}
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: isEdit ? "Editar categoría" : "Nueva categoría",
          description: isEdit
            ? "Actualiza la información de la categoría"
            : "Crea una categoría para clasificar tus productos",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "category-cancel" },
            {
              label: isEdit ? "Guardar cambios" : "Guardar",
              variant: "default",
              asClose: false,
              id: "category-save",
              onClick: () =>
                (document.getElementById("category-form") as HTMLFormElement | null)?.requestSubmit(),
            },
          ],
        }}
      >
        <CategoryForm
          host={{
            setAlert: showAlert,
            parents: parentOptions,
            closeModal: () => setModalOpen(false),
            defaultValues: formDefaults,
            refresh: fetchCategoryTree,
          }}
        />
      </Modal>
    </div>
  );
}
