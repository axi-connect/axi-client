"use client";

import { useCallback, useMemo, useState } from "react";
import { FolderTree, MoreVertical, Pencil, Plus, Search, Tag, Trash } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { useAuth } from "@/shared/auth/auth.hooks";
import { errorMessage } from "@/core/lib/error-messages";
import { TreeView, type TreeNode } from "@/shared/components/features/tree-view";
import { FloatingAlert, type FloatingAlertConfig } from "@/shared/components/ui/floating-alert";
import { GlassGlyph } from "@/shared/components/ui/glyphs";
import {
  flattenCategoryTree,
  MAX_CATEGORY_DEPTH,
  type CategoryTreeNodeDTO,
} from "@/modules/catalog/domain/category";
import { deleteCategory } from "@/modules/catalog/infrastructure/services/category-service.adapter";
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
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

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
    });
    setModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    try {
      setDeleting(true);
      await deleteCategory(deleteTarget.id);
      setAlert({ variant: "success", title: "Categoría eliminada correctamente" });
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
          <DropdownMenuItem
            className="flex items-center gap-2 text-destructive"
            onClick={() => setDeleteTarget({ id: dto.id, name: dto.name })}
          >
            <Trash className="h-4 w-4" />
            <span>Eliminar</span>
          </DropdownMenuItem>
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
            Organiza tus productos en un árbol de hasta 6 niveles.
          </p>
        </div>
        {canManage && (
          <Button className="rounded-full" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" />
            Nueva categoría
          </Button>
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
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={expandAll}>
                    Expandir todo
                  </Button>
                  <Button variant="outline" size="sm" onClick={collapseAll}>
                    Contraer todo
                  </Button>
                </div>
              )}
              getIcon={(node) =>
                node.children ? <FolderTree className="h-4 w-4" /> : <Tag className="h-4 w-4" />
              }
              renderLabel={(node) => {
                const dto = node.meta as CategoryTreeNodeDTO;
                return (
                  <span className="flex items-center gap-2">
                    {node.label}
                    {!dto.is_active && <Badge variant="secondary">Inactiva</Badge>}
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
          title: "Eliminar categoría",
          description: `¿Seguro que deseas eliminar “${deleteTarget?.name ?? ""}”?`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "category-delete-cancel" },
            {
              label: deleting ? "Eliminando..." : "Eliminar",
              variant: "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "category-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      >
        <div className="text-sm text-muted-foreground">
          Solo puede eliminarse si no tiene subcategorías ni productos asociados.
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
