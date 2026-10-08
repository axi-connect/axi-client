"use client";

import { useEffect, useRef } from "react";
import { Ellipsis, Info, Star, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { PRODUCT_GALLERY_MAX, validateImageFile } from "@/modules/catalog/domain/product";
import { splitByRemaining } from "@/modules/catalog/domain/product-gallery";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { AppAlert } from "@/core/notifications";
import { PhotoDropTile, PhotoPickerInput, type PhotoPickerHandle } from "./PhotoUploader";
import { PHOTO_GRID } from "./SortablePhotoGallery";

export type DraftPhoto = { id: string; file: File; preview_url: string };

let seq = 0;

/**
 * Fotos del alta (lienzo, «Crear producto»): se eligen del teléfono o el PC y
 * se queda en local hasta crear —el producto aún no existe—; al crear, la cola
 * las reduce y sube con la principal marcada. Aquí solo se elige la principal
 * del PRODUCTO: las de cada variante se asignan después, en la ficha.
 */
export function DraftPhotosField({
  photos,
  principalId,
  onChange,
  setAlert,
}: {
  photos: DraftPhoto[];
  principalId: string | null;
  onChange: (photos: DraftPhoto[], principalId: string | null) => void;
  setAlert?: (alert: AppAlert) => void;
}) {
  const pickerRef = useRef<PhotoPickerHandle>(null);

  // Las object URL viven mientras vive el formulario
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.preview_url)), []);

  const add = (files: File[]) => {
    const valid = files.filter((file) => {
      const reason = validateImageFile(file);
      if (reason !== null) setAlert?.({ tone: "error", title: reason, description: file.name });
      return reason === null;
    });
    const { accepted, rejected } = splitByRemaining(valid, PRODUCT_GALLERY_MAX - photos.length);
    if (rejected.length > 0) {
      setAlert?.({
        tone: "warning",
        title: `Caben ${PRODUCT_GALLERY_MAX} fotos: ${rejected.length === 1 ? "quedó fuera" : "quedaron fuera"} ${rejected.map((file) => file.name).join(", ")}`,
      });
    }
    if (accepted.length === 0) return;
    const added = accepted.map((file) => ({ id: `draft-${++seq}`, file, preview_url: URL.createObjectURL(file) }));
    const next = [...photos, ...added];
    onChange(next, principalId ?? next[0].id);
  };

  const remove = (photo: DraftPhoto) => {
    URL.revokeObjectURL(photo.preview_url);
    const next = photos.filter((row) => row.id !== photo.id);
    onChange(next, principalId === photo.id ? (next[0]?.id ?? null) : principalId);
  };

  // La principal, primera: así se verá en la ficha y así la envía el agente
  const ordered = [
    ...photos.filter((photo) => photo.id === principalId),
    ...photos.filter((photo) => photo.id !== principalId),
  ];

  return (
    <div className="space-y-3">
      <PhotoPickerInput ref={pickerRef} onFiles={add} />
      <div className={PHOTO_GRID}>
        {ordered.map((photo) => {
          const isPrincipal = photo.id === principalId;
          return (
            <div
              key={photo.id}
              className={cn(
                "relative aspect-square overflow-hidden rounded-2xl bg-muted",
                isPrincipal ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "border border-border",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview_url} alt={photo.file.name} className="h-full w-full object-cover" />
              {isPrincipal ? (
                <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-background/92 px-2 text-[10.5px] font-semibold text-foreground shadow-sm">
                  <Star className="size-3" aria-hidden />
                  Principal
                </span>
              ) : null}
              <div className="absolute top-1.5 right-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Acciones de ${photo.file.name}`}
                      className="inline-flex size-7 items-center justify-center rounded-full bg-background/92 text-foreground shadow-sm hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Ellipsis className="size-4" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" portal className="min-w-44">
                    {!isPrincipal ? (
                      <DropdownMenuItem className="flex items-center gap-2.5" onClick={() => onChange(photos, photo.id)}>
                        <Star className="size-4" aria-hidden />
                        Hacer principal
                      </DropdownMenuItem>
                    ) : null}
                    <DropdownMenuItem className="flex items-center gap-2.5 text-destructive" onClick={() => remove(photo)}>
                      <Trash2 className="size-4" aria-hidden />
                      Quitar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
        <PhotoDropTile
          remaining={PRODUCT_GALLERY_MAX - photos.length}
          label="Agregar o arrastrar"
          onPick={() => pickerRef.current?.open()}
          onFiles={add}
        />
      </div>
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        Hasta {PRODUCT_GALLERY_MAX}. La principal es la que tu agente envía primero: cámbiala desde el menú de cada
        foto. Se suben al crear el producto; las de cada variante se eligen después en la ficha.
      </p>
    </div>
  );
}
