"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LoaderCircle, Megaphone, Plus, RefreshCw, X } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  flattenCategoryTree,
  listCategoryTree,
  type CategoryTreeNodeDTO,
} from "@/modules/catalog/public";
import type { IntegrationCollectionDTO } from "@/modules/integrations/domain/integration";
import {
  listIntegrationCollections,
  updateIntegrationCollections,
} from "@/modules/integrations/infrastructure/services/integrations-service.adapter";

/** Sentinel del select de destino: seleccionada sin destino no clasifica. */
const NO_DESTINATION = "__none__";

type CategoryOption = { id: string; label: string; depth: number };

/**
 * Pestaña Categorías (D5): de las ~75 colecciones de la tienda, cuáles se
 * vuelven categorías del catálogo y en qué ORDEN — un producto cae en la
 * PRIMERA seleccionada que lo contiene, así que el orden es la prioridad y se
 * edita arrastrando (dnd-kit, patrón FieldMasterList de forms).
 *
 * `looks_campaign` viene del backend como PISTA para no promover un drop de
 * marketing a categoría; la decisión sigue siendo del tenant.
 */
export function CollectionsTab({
  integrationId,
  onChanged,
}: {
  integrationId: string;
  onChanged: () => Promise<void>;
}) {
  const [items, setItems] = useState<IntegrationCollectionDTO[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  /** Categoría destino por colección (D10); se envía completa al guardar. */
  const [destinations, setDestinations] = useState<Record<string, string | null>>({});
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const [res, tree] = await Promise.all([
        listIntegrationCollections(integrationId),
        listCategoryTree().catch(() => ({ data: [] as CategoryTreeNodeDTO[] })),
      ]);
      setItems(res.items);
      setSelected(
        res.items
          .filter((item) => item.is_selected)
          .sort((a, b) => a.priority - b.priority)
          .map((item) => item.external_collection_id),
      );
      setDestinations(
        Object.fromEntries(res.items.map((item) => [item.external_collection_id, item.category_id])),
      );
      setCategories(
        flattenCategoryTree(tree.data)
          .filter((option) => option.is_active)
          .map((option) => ({ id: option.id, label: option.label, depth: option.depth })),
      );
    } catch (err) {
      setError(errorMessage(err, "No se pudieron cargar las colecciones de la tienda"));
    }
  }, [integrationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setNotice(null);
    try {
      await updateIntegrationCollections(
        integrationId,
        selected,
        selected.map((id) => ({ external_collection_id: id, category_id: destinations[id] ?? null })),
      );
      // Recategorizar re-recorre el catálogo: si ya hay espejo el backend relanza
      // la sincronización. Decir solo "guardado" haría creer que el agente ya ve
      // la taxonomía nueva.
      setNotice(
        "Guardado. Si el catálogo ya está sincronizado, se recategoriza en segundos sin volver a leer la tienda.",
      );
      await onChanged();
    } catch (err) {
      setNotice(errorMessage(err, "No se pudo guardar la selección"));
    } finally {
      setSaving(false);
    }
  };

  if (error !== null) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Reintentar
        </Button>
      </div>
    );
  }

  if (items === null) return <Skeleton className="h-64 rounded-lg" />;

  const byId = new Map(items.map((item) => [item.external_collection_id, item]));
  const available = items.filter((item) => !selected.includes(item.external_collection_id));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over === null || active.id === over.id) return;
    const from = selected.indexOf(String(active.id));
    const to = selected.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    setSelected((prev) => arrayMove(prev, from, to));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Colecciones que clasifican, en orden de prioridad</h3>
          <p className="text-sm text-muted-foreground">
            Cada una manda sus productos a una <span className="font-medium text-foreground">categoría destino</span>.
            Un producto que esté en varias cae en la PRIMERA de esta lista. Arrastra para reordenar.
          </p>
        </div>
        {selected.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sin colecciones elegidas, la categoría de cada producto la decide la clasificación
            automática por nombre y tipo.
          </p>
        ) : (
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={selected} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2">
                {selected.map((id, index) => {
                  const collection = byId.get(id);
                  if (collection === undefined) return null;
                  return (
                    <SelectedRow
                      key={id}
                      collection={collection}
                      position={index + 1}
                      destination={destinations[id] ?? null}
                      categories={categories}
                      onDestination={(categoryId) =>
                        setDestinations((prev) => ({ ...prev, [id]: categoryId }))
                      }
                      onRemove={() =>
                        setSelected((prev) => prev.filter((candidate) => candidate !== id))
                      }
                    />
                  );
                })}
              </ol>
            </SortableContext>
          </DndContext>
        )}

        {notice !== null && <p className="text-sm text-muted-foreground">{notice}</p>}
        <Button onClick={() => void save()} disabled={saving}>
          {saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Guardar y recategorizar
        </Button>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Colecciones de tu tienda</h3>
          <p className="text-sm text-muted-foreground">
            Las marcadas con <Megaphone aria-hidden="true" className="inline size-3.5" /> parecen
            campañas o listas: no arrancan seleccionadas, pero puedes agregarlas igual.
          </p>
        </div>
        <ul className="max-h-[28rem] space-y-1.5 overflow-y-auto pr-1">
          {available.map((collection) => (
            <li
              key={collection.external_collection_id}
              className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                  {collection.looks_campaign && (
                    <Megaphone
                      aria-label="Parece una campaña de marketing"
                      className="size-3.5 shrink-0 text-warning"
                    />
                  )}
                  <span className="truncate">{collection.title}</span>
                </p>
                {collection.products_count !== null && (
                  <p className="text-xs text-muted-foreground">
                    {collection.products_count} productos
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Usar ${collection.title} como categoría`}
                onClick={() =>
                  setSelected((prev) => [...prev, collection.external_collection_id])
                }
              >
                <Plus aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SelectedRow({
  collection,
  position,
  destination,
  categories,
  onDestination,
  onRemove,
}: {
  collection: IntegrationCollectionDTO;
  position: number;
  destination: string | null;
  categories: CategoryOption[];
  onDestination: (categoryId: string | null) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.external_collection_id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2",
        isDragging && "z-10 shadow-md",
      )}
    >
      <button
        type="button"
        aria-label={`Reordenar ${collection.title}`}
        className="cursor-grab touch-none text-muted-foreground"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <span className="w-5 shrink-0 text-xs text-muted-foreground">{position}.</span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-medium">{collection.title}</p>
        {collection.products_count !== null && (
          <p className="text-xs text-muted-foreground">{collection.products_count} productos</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span aria-hidden="true">→</span>
          <Select
            value={destination ?? NO_DESTINATION}
            onValueChange={(value) => onDestination(value === NO_DESTINATION ? null : value)}
          >
            <SelectTrigger
              className={cn("h-7 w-52 text-xs", destination === null && "border-dashed")}
              aria-label={`Categoría destino de ${collection.title}`}
            >
              <SelectValue placeholder="Elegir categoría destino…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_DESTINATION}>Sin destino</SelectItem>
              {categories.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {`${"— ".repeat(option.depth)}${option.label}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {destination === null && <span className="text-warning">sin destino: no clasifica</span>}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        aria-label={`Quitar ${collection.title}`}
        onClick={onRemove}
      >
        <X aria-hidden="true" className="size-4" />
      </Button>
    </li>
  );
}
