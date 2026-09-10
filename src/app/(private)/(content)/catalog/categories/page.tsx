"use client";

import { useCallback, useMemo, useState } from "react";
import { EyeOff, MoreVertical, Pencil, Plus, RefreshCw, Search, Sparkles, Tag, Trash } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { TreeView, type TreeNode } from "@/shared/components/features/tree-view";
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import {
  CATEGORY_ORIGIN_LABELS,
  flattenCategoryTree,
  isTaxonomyCategory,
  MAX_CATEGORY_DEPTH,
  type CategoryTreeNodeDTO,
} from "@/modules/catalog/domain/category";
import {
  deleteCategory,
  ensurePlatformTaxonomy,
} from "@/modules/catalog/infrastructure/services/category-service.adapter";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { CategoryForm } from "@/modules/catalog/ui/forms/CategoryForm";
import {
  ROOT_PARENT_VALUE,
  type CategoryFormValues,
} from "@/modules/catalog/ui/forms/config/category.config";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

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

/**
 * Árbol de categorías (`/catalog/categories`). El backend limita la
 * profundidad a 6 niveles y bloquea el borrado si hay hijos o productos.
 */
export default function CategoriesPage() {
  const { hasPermission } = useAuth();
  const { categoryTree, fetchCategoryTree } = useCatalog();
  const canManage = hasPermission("catalog:manage");

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState<FloatingAlertConfig | null>(null);
  const [formDefaults, setFormDefaults] = useState<(Partial<CategoryFormValues> & { id?: string }) | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; hide: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const setAlert = (cfg: FloatingAlertConfig) => {
    setAlertConfig(cfg);
    setAlertOpen(true);
  };

  const flat = useMemo(() => flattenCategoryTree(categoryTree), [categoryTree]);
  const depthById = useMemo(() => new Map(flat.map((item) => [item.id, item.depth])), [flat]);

  /** Opciones de padre para el form (excluye el subárbol del nodo en edición). */
  const parentOptions = useMemo(() => {
    const excluded = formDefaults?.id
      ? new Set(collectSubtreeIds(findNode(categoryTree, formDefaults.id) ?? ({ id: formDefaults.id, children: [] } as unknown as CategoryTreeNodeDTO)))
      : new Set<string>();
    return flat
      .filter((item) => !excluded.has(item.id))
      .map((item) => ({ id: item.id, label: item.label, depth: item.depth }));
  }, [flat, categoryTree, formDefaults?.id]);

  const mapToNode = useCallback((dto: CategoryTreeNodeDTO): TreeNode<CategoryTreeNodeDTO> => {
    return {
      id: dto.id,
      label: dto.name,
      // isLeaf=true en todos: TreeView solo pinta renderActions en hojas;
      // el chevron sigue dependiendo de la presencia de children.
      isLeaf: true,
      ...(dto.children && dto.children.length > 0
        ? { children: dto.children.map((child) => mapToNode(child)) }
        : {}),
      meta: dto as CategoryTreeNodeDTO & { count?: number },
    };
  }, []);

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
      setAlert({
        variant: "success",
        title: touched === 0 ? "La taxonomía ya estaba al día" : "Taxonomía actualizada",
        description:
          touched === 0
            ? undefined
            : `${result.created} nuevas · ${result.adopted} adoptadas por nombre · ${result.updated} con sinónimos nuevos`,
      });
      await fetchCategoryTree();
    } catch (err) {
      setAlert({ variant: "destructive", title: errorMessage(err, "No se pudo actualizar la taxonomía") });
    } finally {
      setSeeding(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.id);
      setAlert({
        variant: "success",
        title: deleteTarget.hide ? "Categoría oculta" : "Categoría eliminada correctamente",
        description: deleteTarget.hide
          ? "El agente ya no la ofrece y sus productos vuelven a la clasificación automática."
          : undefined,
      });
      setDeleteTarget(null);
      await fetchCategoryTree();
    } catch (err) {
      setAlert({ variant: "destructive", title: errorMessage(err, "No se pudo eliminar la categoría") });
    } finally {
      setDeleting(false);
    }
  };

  const renderActions = (node: TreeNode<CategoryTreeNodeDTO>) => {
    if (!canManage) return null;
    const dto = node.meta as CategoryTreeNodeDTO;
    const depth = depthById.get(node.id) ?? 0;
    const canCreateChild = depth + 1 < MAX_CATEGORY_DEPTH;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
            <span className="sr-only">Acciones de {node.label}</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canCreateChild && (
            <DropdownMenuItem className="flex items-center gap-2" onClick={() => openCreate(dto)}>
              <Plus className="h-4 w-4" />
              <span>Crear subcategoría</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => openEdit(dto)}>
            <Pencil className="h-4 w-4" />
            <span>Editar</span>
          </DropdownMenuItem>
          {isTaxonomyCategory(dto) ? (
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => setDeleteTarget({ id: dto.id, name: dto.name, hide: true })}
            >
              <EyeOff className="h-4 w-4" />
              <span>Ocultar</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive"
              onClick={() => setDeleteTarget({ id: dto.id, name: dto.name, hide: false })}
            >
              <Trash className="h-4 w-4" />
              <span>Eliminar</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const isEdit = Boolean(formDefaults?.id);
  const isEmpty = categoryTree.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Categorías</h2>
          <p className="text-sm text-muted-foreground">
            La plataforma trae la base de tu tipo de negocio y la mantiene al día; tú renombras, ocultas
            o agregas las tuyas. Árbol de hasta 6 niveles.
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => void refreshTaxonomy()} disabled={seeding}>
              <RefreshCw className={seeding ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
              Actualizar taxonomía
            </Button>
            <Button className="rounded-full" onClick={() => openCreate()}>
              <Plus className="h-4 w-4" />
              Nueva categoría
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <GlassGlyph kind="catalog" />
            <p className="text-sm text-muted-foreground">Aún no tienes categorías.</p>
            {canManage && (
              <Button variant="outline" className="rounded-full" onClick={() => openCreate()}>
                <Plus className="h-4 w-4" />
                Crear la primera
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoría…"
                className="pl-9"
                aria-label="Buscar categoría"
              />
            </div>
            <TreeView<CategoryTreeNodeDTO>
              data={categoryTree}
              mapToNode={mapToNode}
              search={search || undefined}
              title="Árbol de categorías"
              header={({ expandAll, collapseAll }) => (
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expandir todo
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Contraer todo
                  </Button>
                  <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Sparkles className="size-3.5 text-accent-violet" aria-hidden="true" /> Plataforma
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="size-3.5" aria-hidden="true" /> Propia
                    </span>
                    <span className="flex items-center gap-1">
                      <EyeOff className="size-3.5 text-warning" aria-hidden="true" /> Oculta
                    </span>
                  </span>
                </div>
              )}
              // El ORIGEN va como icono al inicio de la fila, no como chip junto al
              // nombre (feedback del dueño sobre el mockup): violeta = plataforma,
              // neutro = propia, ámbar = oculta.
              getIcon={(node) => {
                const dto = node.meta as CategoryTreeNodeDTO;
                if (!dto.is_active) {
                  return <EyeOff className="h-4 w-4 text-warning" aria-label="Oculta" />;
                }
                if (dto.origin === "platform") {
                  return (
                    <Sparkles
                      className="h-4 w-4 text-accent-violet"
                      aria-label={CATEGORY_ORIGIN_LABELS.platform}
                    />
                  );
                }
                return <Tag className="h-4 w-4" aria-label={CATEGORY_ORIGIN_LABELS[dto.origin]} />;
              }}
              renderLabel={(node) => {
                const dto = node.meta as CategoryTreeNodeDTO;
                return (
                  <span className="flex items-center gap-2">
                    <span className={dto.is_active ? undefined : "text-muted-foreground"}>{node.label}</span>
                    {dto.search_aliases.length > 0 && (
                      <span className="hidden truncate font-mono text-xs font-normal text-muted-foreground md:inline">
                        {dto.search_aliases.slice(0, 4).join(" · ")}
                        {dto.search_aliases.length > 4 ? ` · +${dto.search_aliases.length - 4}` : ""}
                      </span>
                    )}
                  </span>
                );
              }}
              renderActions={renderActions}
            />
          </div>
        )}
      </div>

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
              label: deleting ? "Guardando…" : deleteTarget?.hide ? "Ocultar" : "Eliminar",
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
            setAlert,
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
