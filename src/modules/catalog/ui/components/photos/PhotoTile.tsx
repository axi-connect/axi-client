"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  Ellipsis,
  ImageOff,
  Layers,
  Loader2,
  Maximize2,
  RotateCw,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { ProductImageDTO } from "@/modules/catalog/domain/product";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";

export type PhotoTileActions = {
  onView: (image: ProductImageDTO) => void;
  onMakePrimary?: (image: ProductImageDTO) => void;
  /** Texto del menú: «Hacer principal» del producto o «Hacer principal de M · Negro» */
  makePrimaryLabel?: string;
  onUseInVariants?: (image: ProductImageDTO) => void;
  onDelete?: (image: ProductImageDTO) => void;
  /** Foto por URL (importador) cuya descarga falló */
  onRetryImport?: (image: ProductImageDTO) => void;
  /** La miniatura no cargó: el host re-pide el detalle para renovar la URL */
  onImageError?: () => void;
};

/**
 * Una foto de la galería (plan catalog_images_gallery, lienzo aprobado). La
 * principal lleva anillo de TINTA e insignia «Principal» (el coral queda para
 * la acción); las variantes que la usan como principal van en una píldora
 * arriba a la izquierda. Las acciones viven en el menú «···», siempre visible
 * —en el celular no hay hover—.
 */
export function PhotoTile({
  image,
  altFallback,
  canManage,
  isPrincipal = false,
  usedBy = null,
  ...actions
}: {
  image: ProductImageDTO;
  altFallback: string;
  canManage: boolean;
  isPrincipal?: boolean;
  /** Variantes que la usan como principal: píldora compacta («Blanco · S M L») y etiquetas */
  usedBy?: { mark: string; labels: readonly string[] } | null;
} & PhotoTileActions) {
  const [broken, setBroken] = useState(false);
  const autoRetriedRef = useRef(false);
  const alt = image.alt_text ?? altFallback;
  const isReady = image.status === "ready";

  const handleError = () => {
    if (!autoRetriedRef.current && actions.onImageError) {
      autoRetriedRef.current = true;
      actions.onImageError();
      return;
    }
    setBroken(true);
  };

  return (
    <div
      // Ancla de «Usar en variante…»: el panel se abre junto a ESTA foto
      data-photo-id={image.id}
      className={cn(
        "group relative aspect-square overflow-hidden rounded-2xl bg-muted",
        isPrincipal ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : "border border-border",
      )}
    >
      {image.status === "pending" ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="px-2 text-center text-[11px] leading-tight">Importando…</span>
        </div>
      ) : image.status === "failed" ? (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-1.5 border border-destructive/30 bg-destructive/8 p-2 text-center"
          title={image.error ?? "No se pudo importar la foto"}
        >
          <AlertTriangle className="size-5 text-destructive" aria-hidden />
          <span className="text-[11px] leading-tight text-foreground">No se pudo importar</span>
          {canManage && actions.onRetryImport ? (
            <button
              type="button"
              onClick={() => actions.onRetryImport?.(image)}
              className="mt-0.5 inline-flex min-h-7 items-center gap-1 rounded-full bg-background px-2.5 text-[11px] font-medium text-foreground shadow-sm hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <RotateCw className="size-3" aria-hidden />
              Reintentar
            </button>
          ) : null}
        </div>
      ) : broken || !image.url ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
          <ImageOff className="size-5" aria-hidden />
          <span className="text-[11px]">No disponible</span>
        </div>
      ) : (
        // URL firmada estable por una hora: el navegador la cachea por sí solo;
        // next/image la volvería a pedir a su optimizador con otra clave.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onError={handleError}
          draggable={false}
        />
      )}

      {usedBy !== null && usedBy.labels.length > 0 ? (
        <span
          // Abajo y a lo ancho: arriba compite con el «···» y se truncaba (QA)
          className={cn(
            // Hasta dos líneas: «Blanco · S M L» no cabe en una en un tile de 90 px
            "pointer-events-none absolute left-1.5 line-clamp-2 max-w-[calc(100%-0.75rem)] rounded-[10px] bg-background/92 px-2 py-0.5 text-[10.5px] leading-[1.3] font-semibold text-foreground shadow-sm",
            isPrincipal ? "bottom-7.5" : "bottom-1.5",
          )}
          title={`Principal de ${usedBy.labels.join(", ")}`}
        >
          <span className="sr-only">Principal de </span>
          {usedBy.mark}
        </span>
      ) : null}

      {isPrincipal ? (
        <span className="pointer-events-none absolute bottom-1.5 left-1.5 inline-flex h-5 items-center gap-1 rounded-full bg-background/92 px-2 text-[10.5px] font-semibold text-foreground shadow-sm">
          <Star className="size-3" aria-hidden />
          Principal
        </span>
      ) : null}

      {/* Fallida, pendiente o rota: sin menú, pero se puede borrar (auditoría
          C-7) — si no, ocupaba un cupo de la galería para siempre */}
      {canManage && actions.onDelete && (!isReady || broken || !image.url) ? (
        <button
          type="button"
          aria-label="Borrar foto"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => actions.onDelete?.(image)}
          className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full bg-background/92 text-destructive shadow-sm hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      ) : null}

      {isReady && !broken && image.url ? (
        <div className="absolute top-1.5 right-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Acciones de la foto"
                // dnd-kit escucha el pointerdown del tile: el menú no debe iniciar un arrastre
                onPointerDown={(event) => event.stopPropagation()}
                className="inline-flex size-7 items-center justify-center rounded-full bg-background/92 text-foreground shadow-sm hover:bg-background focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Ellipsis className="size-4" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" portal className="min-w-52">
              {canManage && actions.onMakePrimary && !isPrincipal ? (
                <DropdownMenuItem className="flex items-center gap-2.5" onClick={() => actions.onMakePrimary?.(image)}>
                  <Star className="size-4" aria-hidden />
                  {actions.makePrimaryLabel ?? "Hacer principal"}
                </DropdownMenuItem>
              ) : null}
              {canManage && actions.onUseInVariants ? (
                <DropdownMenuItem className="flex items-center gap-2.5" onClick={() => actions.onUseInVariants?.(image)}>
                  <Layers className="size-4" aria-hidden />
                  Usar en variante…
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem className="flex items-center gap-2.5" onClick={() => actions.onView(image)}>
                <Maximize2 className="size-4" aria-hidden />
                Ver original
              </DropdownMenuItem>
              {canManage && actions.onDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center gap-2.5 text-destructive" onClick={() => actions.onDelete?.(image)}>
                    <Trash2 className="size-4" aria-hidden />
                    Borrar
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
}
