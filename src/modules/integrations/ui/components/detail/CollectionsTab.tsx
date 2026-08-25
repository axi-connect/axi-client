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
import type { IntegrationCollectionDTO } from "@/modules/integrations/domain/integration";
import {
  listIntegrationCollections,
  updateIntegrationCollections,
} from "@/modules/integrations/infrastructure/services/integrations-service.adapter";

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
      const res = await listIntegrationCollections(integrationId);
      setItems(res.items);
      setSelected(
        res.items
          .filter((item) => item.is_selected)
          .sort((a, b) => a.priority - b.priority)
          .map((item) => item.external_collection_id),
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
      await updateIntegrationCollections(integrationId, selected);
      // 202 a propósito: recategorizar re-recorre el catálogo. Decir "guardado"
      // sin más haría creer que el agente ya ve la taxonomía nueva.
      setNotice(
        "Guardado. Estamos recategorizando el catálogo: el avance se ve en la pestaña Historial.",
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
          <h3 className="font-semibold">Tus categorías, en orden de prioridad</h3>
          <p className="text-sm text-muted-foreground">
            Un producto que esté en varias cae en la PRIMERA de esta lista. Arrastra para
            reordenar.
          </p>
        </div>
        {selected.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Sin categorías elegidas, el catálogo se espeja plano: el agente busca igual, pero sin
            estructura que ofrecer.
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
            campañas de marketing: promoverlas ensuciaría el menú del agente.
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
  onRemove,
}: {
  collection: IntegrationCollectionDTO;
  position: number;
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
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{collection.title}</p>
        {collection.products_count !== null && (
          <p className="text-xs text-muted-foreground">{collection.products_count} productos</p>
        )}
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
