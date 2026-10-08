"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Ban, HardDrive, ImagePlus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { ACCEPTED_IMAGE_ACCEPT } from "@/modules/catalog/domain/product";
import { useStorageQuotaState } from "@/modules/storage/public";

export type PhotoPickerHandle = { open: () => void };

/**
 * Input de archivos oculto de una galería. Sin `capture`: en el celular el
 * sistema ofrece cámara o fototeca («Tomar o elegir fotos»); en el PC, el
 * explorador. Lo dispara el botón «Subir» de la cabecera o el tile.
 */
export const PhotoPickerInput = forwardRef<PhotoPickerHandle, { onFiles: (files: File[]) => void }>(
  function PhotoPickerInput({ onFiles }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }), []);
    return (
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onFiles(files);
        }}
        aria-hidden
        tabIndex={-1}
      />
    );
  },
);

/**
 * Tile de subida al final de una banda: clic o arrastre. Lleva los cupos que
 * quedan («quedan 3»); sin cupo dice «Galería llena» y no recibe nada. Con el
 * espacio de la empresa lleno dice «Espacio lleno» (storage T2) en vez de
 * dejar elegir fotos que el servidor rechazaría con 507.
 */
export function PhotoDropTile({
  remaining,
  onPick,
  onFiles,
  label = "Subir fotos",
}: {
  remaining: number;
  onPick: () => void;
  onFiles: (files: File[]) => void;
  label?: string;
}) {
  const [dragOver, setDragOver] = useState(false);
  const { blocksUploads, blockedHint } = useStorageQuotaState();
  const full = remaining <= 0;

  if (blocksUploads && !full) {
    return (
      <div
        title={blockedHint}
        className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-muted-foreground"
      >
        <HardDrive className="size-5" aria-hidden />
        <span className="px-1 text-center text-[11px] leading-tight">Espacio lleno</span>
        <span className="sr-only">{blockedHint}</span>
      </div>
    );
  }

  if (full) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-muted-foreground">
        <Ban className="size-5" aria-hidden />
        <span className="px-1 text-center text-[11px] leading-tight">Galería llena</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length > 0) onFiles(files);
      }}
      className={cn(
        "flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-foreground/20 text-foreground transition-colors",
        "hover:border-foreground/40 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        dragOver && "border-foreground/50 bg-accent",
      )}
    >
      <ImagePlus className="size-5" aria-hidden />
      <span className="px-1 text-center text-[11px] leading-tight font-medium">{label}</span>
      <span className="text-[11px] text-muted-foreground tabular-nums">quedan {remaining}</span>
    </button>
  );
}
