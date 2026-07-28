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
import { PhotoTile } from "./PhotoTile";
import { PhotoUploader } from "./PhotoUploader";

type AlertConfig = { variant: "default" | "destructive" | "success"; title: string; description?: string };

/**
 * Galería de UN contenedor (producto o una variante) con drag&drop de
 * reordenamiento. Componente CONTROLADO: pinta `images` tal como llegan y
 * emite `onReorder` con el set completo reordenado — el host aplica el
 * optimistic update y el rollback. La primera posición es la foto principal.
 */
export function SortablePhotoGallery({
  images,
  max,
  altFallback,
  canManage,
  uploadFn,
  onUploaded,
  onReorder,
  onView,
  onDelete,
  onRetryImport,
  onImageError,
  setAlert,
  emptyHint,
  className,
}: {
  images: ProductImageDTO[];
  max: number;
  altFallback: string;
  canManage: boolean;
  uploadFn: (file: File) => Promise<ProductImageDTO>;
  onUploaded: () => void | Promise<void>;
  onReorder: (next: ProductImageDTO[]) => void;
  onView: (image: ProductImageDTO) => void;
  onDelete: (image: ProductImageDTO) => void;
  onRetryImport?: (image: ProductImageDTO) => void;
  onImageError?: () => void;
  setAlert?: (cfg: AlertConfig) => void;
  /** Mensaje cuando la galería está vacía (p.ej. fallback de variante). */
  emptyHint?: React.ReactNode;
  className?: string;
}) {
  const sensors = useSensors(
    // Distancia mínima para no robar el click de las acciones del tile.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ids = useMemo(() => images.map((image) => image.id), [images]);
  const sortingDisabled = !canManage || images.length < 2;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(images, from, to));
  };

  return (
    <div className={cn("space-y-2", className)}>
      {images.length === 0 && emptyHint}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ids} strategy={rectSortingStrategy} disabled={sortingDisabled}>
            {images.map((image) => (
              <SortableTile
                key={image.id}
                image={image}
                altFallback={altFallback}
                canManage={canManage}
                sortingDisabled={sortingDisabled}
                onView={onView}
                onDelete={onDelete}
                onRetryImport={onRetryImport}
                onImageError={onImageError}
              />
            ))}
          </SortableContext>
        </DndContext>
        {canManage && (
          <PhotoUploader
            uploadFn={uploadFn}
            remaining={max - images.length}
            disabled={!canManage}
            onUploaded={onUploaded}
            setAlert={setAlert}
          />
        )}
      </div>
    </div>
  );
}

function SortableTile({
  image,
  altFallback,
  canManage,
  sortingDisabled,
  onView,
  onDelete,
  onRetryImport,
  onImageError,
}: {
  image: ProductImageDTO;
  altFallback: string;
  canManage: boolean;
  sortingDisabled: boolean;
  onView: (image: ProductImageDTO) => void;
  onDelete: (image: ProductImageDTO) => void;
  onRetryImport?: (image: ProductImageDTO) => void;
  onImageError?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
    disabled: sortingDisabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("touch-manipulation", isDragging && "z-10 opacity-80", !sortingDisabled && "cursor-grab active:cursor-grabbing")}
      {...attributes}
      {...listeners}
    >
      <PhotoTile
        image={image}
        altFallback={altFallback}
        canManage={canManage}
        onView={onView}
        onDelete={onDelete}
        onRetryImport={onRetryImport}
        onImageError={onImageError}
      />
    </div>
  );
}
