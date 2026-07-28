"use client";

import { useRef, useState } from "react";
import { AlertTriangle, ImageOff, Loader2, Maximize2, RotateCw, Trash2 } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { ProductImageDTO } from "@/modules/catalog/domain/product";

/**
 * Miniatura de una foto de catálogo con acciones al hover (ver original,
 * borrar) y estados de import (pending/failed). La `url` es presigned
 * (TTL ~300 s): ante un error de carga se hace UN auto-retry pidiendo al host
 * que re-fetch el detalle; si vuelve a fallar, se muestra el estado roto.
 */
export function PhotoTile({
  image,
  altFallback,
  canManage,
  onView,
  onDelete,
  onRetryImport,
  onImageError,
}: {
  image: ProductImageDTO;
  altFallback: string;
  canManage: boolean;
  onView: (image: ProductImageDTO) => void;
  onDelete: (image: ProductImageDTO) => void;
  /** Reintentar un import fallido (re-guardar con la misma image_url). */
  onRetryImport?: (image: ProductImageDTO) => void;
  /** El host re-fetch el detalle para renovar las presigned expiradas. */
  onImageError?: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const autoRetriedRef = useRef(false);
  const alt = image.alt_text ?? altFallback;

  const isPending = image.status === "pending";
  const isFailed = image.status === "failed";
  const isReady = image.status === "ready";

  const handleError = () => {
    if (!autoRetriedRef.current && onImageError) {
      autoRetriedRef.current = true;
      onImageError();
      return;
    }
    setBroken(true);
  };

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
      {/* Import en curso: sin url todavía */}
      {isPending ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="px-2 text-center text-[11px] leading-tight">Importando…</span>
        </div>
      ) : isFailed ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-destructive/8 p-2 text-center text-destructive"
          title={image.error ?? "No se pudo importar la imagen"}
        >
          <AlertTriangle className="size-5" aria-hidden />
          <span className="text-[11px] leading-tight">No se pudo importar</span>
          {canManage && onRetryImport && (
            <button
              type="button"
              onClick={() => onRetryImport(image)}
              className="mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground hover:bg-accent"
            >
              <RotateCw className="size-3" aria-hidden />
              Reintentar
            </button>
          )}
        </div>
      ) : broken || !image.url ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          <span className="text-[11px]">No disponible</span>
        </div>
      ) : (
        // Presigned rotativa (TTL ~300 s): incompatible con el caché de next/image.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={alt}
          className="h-full w-full object-cover"
          onError={handleError}
          draggable={false}
        />
      )}

      {/* Acciones al hover — solo cuando la foto está lista */}
      {isReady && !broken && image.url && (
        <div
          className={cn(
            "absolute inset-0 flex items-start justify-end gap-1 bg-gradient-to-b from-black/40 to-transparent p-1.5",
            "opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
          )}
        >
          <button
            type="button"
            onClick={() => onView(image)}
            aria-label="Ver original"
            className="inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Maximize2 className="size-3.5" aria-hidden />
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => onDelete(image)}
              aria-label="Borrar foto"
              className="inline-flex size-7 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
