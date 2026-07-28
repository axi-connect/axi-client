"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Modal } from "@/shared/components/ui/modal";
import { Separator } from "@/shared/components/ui/separator";
import { errorMessage } from "@/core/lib/error-messages";
import {
  PRODUCT_GALLERY_MAX,
  VARIANT_GALLERY_MAX,
  groupProductImages,
  hasPendingImages,
  type ProductDTO,
  type ProductImageDTO,
} from "@/modules/catalog/domain/product";
import {
  deleteProductImage,
  reorderProductImages,
  uploadProductImage,
  uploadVariantImage,
} from "@/modules/catalog/infrastructure/services/product-image-service.adapter";
import {
  getProductById,
  updateProduct,
  updateVariant,
} from "@/modules/catalog/infrastructure/services/product-service.adapter";
import { useProductImagesPolling } from "@/modules/catalog/infrastructure/hooks/use-product-images-polling";
import { PhotoLightbox } from "./photos/PhotoLightbox";
import { SortablePhotoGallery } from "./photos/SortablePhotoGallery";

const BANNER_DISMISSED_KEY = "axi.catalog.photos_banner_dismissed";

type AlertConfig = { variant: "default" | "destructive" | "success"; title: string; description?: string };

/**
 * Sección "Fotos" del detalle (F16): galería del producto (comodín para
 * todas las variantes) + galería por variante. La IA resuelve fotos así:
 * variante → producto → texto; la primera posición es la foto principal.
 *
 * Las `url` son presigned (TTL ~300 s): tras cada mutación se re-fetch el
 * detalle, y un error de carga dispara un refresh (nunca se cachean).
 */
export function ProductPhotosSection({
  product,
  canManage,
  onSaved,
  setAlert,
}: {
  product: ProductDTO;
  canManage: boolean;
  onSaved: (updated: ProductDTO) => void;
  setAlert?: (cfg: AlertConfig) => void;
}) {
  const { productImages, byVariant } = groupProductImages(product.images);
  const [lightbox, setLightbox] = useState<{ id: string; alt: string } | null>(null);
  const [toDelete, setToDelete] = useState<ProductImageDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Banner educativo one-shot (localStorage, leído post-mount para no romper SSR).
  useEffect(() => {
    try {
      setShowBanner(localStorage.getItem(BANNER_DISMISSED_KEY) !== "1");
    } catch {
      /* storage bloqueado: no mostrar */
    }
  }, []);
  const dismissBanner = () => {
    setShowBanner(false);
    try {
      localStorage.setItem(BANNER_DISMISSED_KEY, "1");
    } catch {
      /* best-effort */
    }
  };

  const refetch = useCallback(async () => {
    const fresh = await getProductById(product.id);
    onSaved(fresh);
  }, [product.id, onSaved]);

  // Import por URL en curso → polling del detalle (3 s, tope ~30 s).
  const pending = hasPendingImages(product.images);
  const { stalled, resume } = useProductImagesPolling(pending, refetch);

  /** Un error de <img> (presigned vencida) → refresh silencioso del detalle. */
  const handleImageError = useCallback(() => {
    void refetch().catch(() => undefined);
  }, [refetch]);

  /** Reorden optimista: pinta ya, persiste después, rollback si falla. */
  const handleReorder = async (variantId: string | null, next: ProductImageDTO[]) => {
    const prevImages = product.images ?? [];
    const rest = prevImages.filter((image) => image.variant_id !== variantId);
    const reordered = next.map((image, index) => ({ ...image, position: index }));
    onSaved({ ...product, images: [...rest, ...reordered] });
    try {
      await reorderProductImages(product.id, {
        variant_id: variantId,
        image_ids: next.map((image) => image.id),
      });
    } catch (err) {
      onSaved({ ...product, images: prevImages });
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo guardar el orden") });
    }
  };

  const handleConfirmDelete = async () => {
    if (!toDelete || deleting) return;
    try {
      setDeleting(true);
      await deleteProductImage(toDelete.id);
      setToDelete(null);
      await refetch();
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo borrar la foto") });
    } finally {
      setDeleting(false);
    }
  };

  /** Import fallido → re-guardar con la misma URL (el backend re-encola la fila). */
  const handleRetryImport = async (image: ProductImageDTO) => {
    if (!image.source_url) return;
    try {
      if (image.variant_id === null) {
        await updateProduct(product.id, { image_url: image.source_url });
      } else {
        await updateVariant(image.variant_id, { image_url: image.source_url });
      }
      await refetch();
    } catch (err) {
      setAlert?.({ variant: "destructive", title: errorMessage(err, "No se pudo reintentar el import") });
    }
  };

  const openLightbox = (image: ProductImageDTO, altFallback: string) =>
    setLightbox({ id: image.id, alt: image.alt_text ?? altFallback });

  return (
    <section className="space-y-4" aria-label="Fotos del producto">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Fotos</h3>
        {stalled && (
          <Button variant="outline" size="sm" onClick={() => void resume()}>
            <RefreshCw className="size-3.5" aria-hidden />
            Actualizar
          </Button>
        )}
      </div>
      <Separator />

      {showBanner && (
        <div className="relative flex items-start gap-3 rounded-lg border border-accent-violet/25 bg-accent-violet/8 p-3 pr-10">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-violet" aria-hidden />
          <p className="text-sm text-foreground">
            Tu agente de ventas envía estas fotos por WhatsApp cuando un cliente pide ver un
            producto. Sube fotos por color/talla para que muestre la variante exacta.
          </p>
          <button
            type="button"
            onClick={dismissBanner}
            aria-label="Descartar aviso"
            className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      )}

      {/* Galería del producto (comodín) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Fotos del producto <span className="hidden sm:inline">(comodín para todas las variantes)</span>
          </p>
          <span className="text-xs tabular-nums text-muted-foreground">
            {productImages.length}/{PRODUCT_GALLERY_MAX}
          </span>
        </div>
        <SortablePhotoGallery
          images={productImages}
          max={PRODUCT_GALLERY_MAX}
          altFallback={product.name}
          canManage={canManage}
          uploadFn={(file) => uploadProductImage(product.id, file)}
          onUploaded={refetch}
          onReorder={(next) => void handleReorder(null, next)}
          onView={(image) => openLightbox(image, product.name)}
          onDelete={setToDelete}
          onRetryImport={(image) => void handleRetryImport(image)}
          onImageError={handleImageError}
          setAlert={setAlert}
          emptyHint={
            !canManage ? (
              <p className="text-sm text-muted-foreground">Este producto aún no tiene fotos.</p>
            ) : undefined
          }
        />
      </div>

      {/* Galerías por variante */}
      {product.variants.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">Por variante</p>
          {product.variants.map((variant) => {
            const images = byVariant.get(variant.id) ?? [];
            const label = variant.name ?? variant.sku;
            const altFallback = `${product.name} — ${label}`;
            return (
              <div key={variant.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm">{label}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {variant.sku}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {images.length}/{VARIANT_GALLERY_MAX}
                  </span>
                </div>
                <SortablePhotoGallery
                  images={images}
                  max={VARIANT_GALLERY_MAX}
                  altFallback={altFallback}
                  canManage={canManage}
                  uploadFn={(file) => uploadVariantImage(variant.id, file)}
                  onUploaded={refetch}
                  onReorder={(next) => void handleReorder(variant.id, next)}
                  onView={(image) => openLightbox(image, altFallback)}
                  onDelete={setToDelete}
                  onRetryImport={(image) => void handleRetryImport(image)}
                  onImageError={handleImageError}
                  setAlert={setAlert}
                  emptyHint={
                    <p className="text-xs text-muted-foreground">
                      Sin fotos — usará las del producto.
                    </p>
                  }
                />
              </div>
            );
          })}
        </div>
      )}

      <PhotoLightbox
        open={lightbox !== null}
        onOpenChange={(open) => !open && setLightbox(null)}
        imageId={lightbox?.id ?? null}
        alt={lightbox?.alt ?? product.name}
      />

      <Modal
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        config={{
          title: "Borrar foto",
          description: "La foto desaparecerá de la galería y tu agente dejará de enviarla.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "photo-delete-cancel" },
            {
              label: deleting ? "Borrando…" : "Borrar",
              variant: "destructive",
              asClose: false,
              onClick: handleConfirmDelete,
              id: "photo-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      />
    </section>
  );
}
