"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import {
  ACCEPTED_IMAGE_ACCEPT,
  validateImageFile,
  type ProductImageDTO,
} from "@/modules/catalog/domain/product";

type AlertConfig = { variant: "default" | "destructive" | "success"; title: string; description?: string };

/**
 * Tile de subida (drag&drop + click) para una galería. Valida formato y
 * tamaño EN CLIENTE antes de subir (ahorra el round-trip), sube secuencial y
 * muestra una barra indeterminada por estado (fetch no expone progreso por %).
 * Se deshabilita al llegar al tope del contenedor o sin permiso.
 */
export function PhotoUploader({
  uploadFn,
  remaining,
  disabled,
  onUploaded,
  setAlert,
}: {
  /** Adapter concreto ya ligado al contenedor (producto o variante). */
  uploadFn: (file: File) => Promise<ProductImageDTO>;
  /** Cupos restantes hasta el tope de la galería. */
  remaining: number;
  disabled: boolean;
  onUploaded: () => void | Promise<void>;
  setAlert?: (cfg: AlertConfig) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const blocked = disabled || remaining <= 0;

  const handleFiles = async (fileList: FileList) => {
    if (blocked) return;
    const files = Array.from(fileList);
    if (files.length > remaining) {
      setAlert?.({
        variant: "destructive",
        title: `Solo quedan ${remaining} ${remaining === 1 ? "espacio" : "espacios"} en esta galería`,
      });
      return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const invalid = validateImageFile(file);
        if (invalid) {
          setAlert?.({ variant: "destructive", title: invalid, description: file.name });
          continue;
        }
        try {
          await uploadFn(file);
        } catch (err) {
          setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo subir la imagen") });
        }
      }
      await onUploaded();
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) void handleFiles(e.target.files);
          e.target.value = "";
        }}
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        disabled={blocked || uploading}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          if (blocked) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
        }}
        aria-label="Subir fotos"
        className={cn(
          "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors",
          "hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground",
          dragOver && "border-brand bg-accent text-brand",
        )}
      >
        {uploading ? (
          <Loader2 className="size-5 animate-spin" aria-hidden />
        ) : (
          <ImagePlus className="size-5" aria-hidden />
        )}
        <span className="px-1 text-center text-[11px] leading-tight">
          {uploading ? "Subiendo…" : "Subir foto"}
        </span>
      </button>
    </>
  );
}
