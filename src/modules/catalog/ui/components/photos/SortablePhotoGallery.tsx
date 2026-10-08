"use client";

import { useMemo } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/core/lib/utils";
import type { ProductImageDTO } from "@/modules/catalog/domain/product";
import { PhotoTile, type PhotoTileActions } from "./PhotoTile";

/** Rejilla de la galería: misma medida en todas las bandas y en el alta. */
export const PHOTO_GRID = "grid grid-cols-3 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))]";

/**
 * Una banda de la galería (generales o las de una variante) con arrastre para
 * ordenar. La principal va FIJA en el primer lugar y no se arrastra: el orden
 * es el de envío del agente y la principal siempre sale primero; «Hacer
 * principal» es la forma de cambiarla. Componente CONTROLADO: emite el set
 * completo en su orden nuevo y el host hace el optimista y el rollback.
 */
export function SortablePhotoGallery({
  images,
  principalId,
  usedBy,
  altFallback,
  canManage,
  onReorder,
  trailing,
  ...actions
}: {
  /** Ya en orden de pintado (principal delante) */
  images: ProductImageDTO[];
  principalId: string | null;
  usedBy: ReadonlyMap<string, { mark: string; labels: readonly string[] }>;
  altFallback: string;
  canManage: boolean;
  onReorder?: (next: ProductImageDTO[]) => void;
  /** Lo que va después de las fotos: las que suben y el tile de subida */
  trailing?: React.ReactNode;
} & PhotoTileActions) {
  const sensors = useSensors(
    // Distancia mínima para no robar el clic del menú del tile
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const pinned = images[0]?.id === principalId ? images[0] : null;
  const movable = useMemo(() => (pinned === null ? images : images.slice(1)), [images, pinned]);
  const ids = useMemo(() => movable.map((image) => image.id), [movable]);
  const sortingDisabled = !canManage || onReorder === undefined || movable.length < 2;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || onReorder === undefined) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const reordered = arrayMove(movable, from, to);
    onReorder(pinned === null ? reordered : [pinned, ...reordered]);
  };

  const tileProps = (image: ProductImageDTO) => ({
    image,
    altFallback,
    canManage,
    isPrincipal: image.id === principalId,
    usedBy: usedBy.get(image.id) ?? null,
    ...actions,
  });

  return (
    <div className={PHOTO_GRID}>
      {pinned !== null ? <PhotoTile {...tileProps(pinned)} /> : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={rectSortingStrategy} disabled={sortingDisabled}>
          {movable.map((image) => (
            <SortableTile key={image.id} id={image.id} disabled={sortingDisabled}>
              <PhotoTile {...tileProps(image)} />
            </SortableTile>
          ))}
        </SortableContext>
      </DndContext>
      {trailing}
    </div>
  );
}

function SortableTile({ id, disabled, children }: { id: string; disabled: boolean; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "touch-manipulation",
        isDragging && "z-10 opacity-80",
        !disabled && "cursor-grab active:cursor-grabbing",
      )}
      // Sin arrastre posible, sin sus atributos: dnd-kit marcaría el contenedor
      // `aria-disabled` y el menú de la foto se leería deshabilitado (QA 390)
      {...(disabled ? {} : attributes)}
      {...(disabled ? {} : listeners)}
    >
      {children}
    </div>
  );
}
