"use client";

import { Camera, Upload } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/lib/utils";
import {
  PRODUCT_GALLERY_MAX,
  VARIANT_GALLERY_MAX,
  type ProductDTO,
  type ProductImageDTO,
  type ProductVariantDTO,
} from "@/modules/catalog/domain/product";
import {
  effectivePrimaryImage,
  effectiveVariantPrimary,
  principalFirst,
  backToProductTarget,
} from "@/modules/catalog/domain/product-gallery";
import { useStorageQuotaState } from "@/modules/storage/public";
import { AnchoredPanel } from "./AnchoredPanel";
import { useProductGallery } from "./product-gallery.context";

/**
 * Selector de la principal de UNA variante (lienzo, artboard 3): las fotos
 * generales —la primera es «La del producto»— y las propias de la variante.
 * Tocar una la aplica al instante (el host avisa con «Deshacer»); «Subir foto
 * para esta variante» la deja como su principal.
 */
export function VariantPhotoPicker({
  product,
  variant,
  open,
  onOpenChange,
  onPick,
  onUpload,
  onShowGallery,
}: {
  product: ProductDTO;
  variant: ProductVariantDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `image_id` null = la variante vuelve a la del producto */
  onPick: (variant: ProductVariantDTO, imageId: string | null) => void;
  onUpload: (variant: ProductVariantDTO) => void;
  onShowGallery: (variant: ProductVariantDTO) => void;
}) {
  const { labelOf } = useProductGallery();
  const label = variant ? labelOf(variant) : "";
  return (
    <AnchoredPanel
      open={open && variant !== null}
      onOpenChange={onOpenChange}
      anchorSelector={variant ? `[data-variant-thumb="${variant.id}"]` : null}
      title={`Foto principal de ${label}`}
      className="w-[24rem] rounded-[20px] p-0"
    >
      {variant !== null ? (
        <PickerBody
          product={product}
          variant={variant}
          label={label}
          onPick={(imageId) => {
            onPick(variant, imageId);
            onOpenChange(false);
          }}
          onUpload={() => {
            onOpenChange(false);
            onUpload(variant);
          }}
          onShowGallery={() => {
            onOpenChange(false);
            onShowGallery(variant);
          }}
        />
      ) : null}
    </AnchoredPanel>
  );
}

function PickerBody({
  product,
  variant,
  label,
  onPick,
  onUpload,
  onShowGallery,
}: {
  product: ProductDTO;
  variant: ProductVariantDTO;
  label: string;
  onPick: (imageId: string | null) => void;
  onUpload: () => void;
  onShowGallery: () => void;
}) {
  const { blocksUploads, blockedHint } = useStorageQuotaState();
  const images = product.images ?? [];
  const productPrincipal = effectivePrimaryImage(images, product.primary_image_id);
  const current = effectiveVariantPrimary(images, variant, product.primary_image_id);
  const general = principalFirst(
    images.filter((image) => image.variant_id === null && image.status === "ready"),
    productPrincipal?.id ?? null,
  );
  const own = images
    .filter((image) => image.variant_id === variant.id && image.status === "ready")
    .sort((a, b) => a.position - b.position);
  const ownCount = images.filter((image) => image.variant_id === variant.id).length;
  const generalCount = images.filter((image) => image.variant_id === null).length;

  // «La del producto»: explícita si la variante tiene fotos propias
  const backToProduct = () => onPick(backToProductTarget(images, variant.id, productPrincipal));

  const summary =
    current.source === "product"
      ? "Hoy usa la del producto."
      : current.source === "own"
        ? "Hoy usa su primera foto propia."
        : "Hoy usa una foto elegida para ella.";

  const tile = (image: ProductImageDTO, caption: string, onClick: () => void) => {
    const selected = current.image?.id === image.id && (caption !== "La del producto" || current.source === "product");
    return (
      <li key={`${caption}-${image.id}`}>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={selected}
          className="group flex w-full flex-col gap-1 text-left focus-visible:outline-none"
        >
          <span
            className={cn(
              "block aspect-square overflow-hidden rounded-xl bg-muted group-focus-visible:ring-2 group-focus-visible:ring-ring",
              selected ? "ring-2 ring-foreground ring-offset-2 ring-offset-popover" : "border border-border",
            )}
          >
            {image.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt="" className="h-full w-full object-cover" />
            ) : null}
          </span>
          <span className={cn("line-clamp-2 text-[11px] leading-tight", selected ? "font-semibold" : "text-muted-foreground")}>
            {caption}
          </span>
        </button>
      </li>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 pt-4 pb-2">
        <p className="text-[15px] font-semibold">Foto principal de {label}</p>
        <p className="text-xs text-muted-foreground">
          {summary} Elige una de la galería o sube una solo para esta variante.
        </p>
      </div>

      <div className="max-h-[24rem] overflow-y-auto px-4 pb-3">
        <div className="flex items-center justify-between py-1.5 text-xs">
          <span className="font-medium">General</span>
          <span className="text-muted-foreground tabular-nums">
            {generalCount} de {PRODUCT_GALLERY_MAX}
          </span>
        </div>
        {general.length > 0 ? (
          <ul className="grid grid-cols-4 gap-2">
            {general.map((image, index) =>
              index === 0 && image.id === productPrincipal?.id
                ? tile(image, "La del producto", backToProduct)
                : tile(image, image.alt_text ?? `Foto ${index + 1}`, () => onPick(image.id)),
            )}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">El producto aún no tiene fotos generales.</p>
        )}

        <div className="flex items-center justify-between pt-3 pb-1.5 text-xs">
          <span className="font-medium">De {label}</span>
          <span className="text-muted-foreground tabular-nums">
            {ownCount} de {VARIANT_GALLERY_MAX}
          </span>
        </div>
        {own.length > 0 ? (
          <ul className="grid grid-cols-4 gap-2">
            {own.map((image, index) => tile(image, image.alt_text ?? `Propia ${index + 1}`, () => onPick(image.id)))}
          </ul>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground">
              <Camera className="size-4" aria-hidden />
            </span>
            <p className="text-xs text-muted-foreground">
              Aún sin fotos propias. La que subas aquí queda solo para {label} y como su principal.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={onShowGallery}
          className="text-xs font-medium underline underline-offset-3 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Ver toda la galería
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={ownCount >= VARIANT_GALLERY_MAX || blocksUploads}
          title={blocksUploads ? blockedHint : undefined}
          onClick={onUpload}
        >
          <Upload className="size-3.5" aria-hidden />
          Subir foto para esta variante
        </Button>
      </div>
    </div>
  );
}
