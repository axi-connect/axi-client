"use client";

import { ImageOff } from "lucide-react";
import { cn } from "@/core/lib/utils";
import type { ProductVariantDTO } from "@/modules/catalog/domain/product";
import { effectiveVariantPrimary } from "@/modules/catalog/domain/product-gallery";
import { useOptionalProductGallery } from "./product-gallery.context";

const SOURCE_LABEL = { chosen: "elegida", own: "foto propia", product: "la del producto" } as const;

/**
 * La principal de una variante en su fila (lienzo, artboard 3): atenuada si
 * hereda la del producto, y una nota que lo dice. Con permiso, tocarla abre el
 * selector de la galería; sin permiso es solo la miniatura. Fuera de la
 * ficha (sin `ProductGalleryProvider`) no pinta nada: la tabla sigue sirviendo.
 */
export function VariantPrimaryThumb({ variant }: { variant: ProductVariantDTO }) {
  const gallery = useOptionalProductGallery();
  if (gallery === null) return null;
  return <Thumb variant={variant} gallery={gallery} />;
}

function Thumb({
  variant,
  gallery,
}: {
  variant: ProductVariantDTO;
  gallery: NonNullable<ReturnType<typeof useOptionalProductGallery>>;
}) {
  const { product, canManage, openVariantPicker, labelOf } = gallery;
  const { image, source } = effectiveVariantPrimary(product.images ?? [], variant, product.primary_image_id);
  const label = labelOf(variant);
  const note = source === "chosen" && image?.alt_text ? `«${image.alt_text}»` : SOURCE_LABEL[source];

  const picture = (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground",
        canManage && "group-hover:ring-2 group-hover:ring-foreground/30 group-focus-visible:ring-2 group-focus-visible:ring-ring",
      )}
    >
      {image?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.url}
          alt=""
          loading="lazy"
          className={cn("h-full w-full object-cover", source === "product" && "opacity-55")}
        />
      ) : (
        <ImageOff className="size-4" aria-hidden />
      )}
    </span>
  );

  return canManage ? (
    <button
      type="button"
      data-variant-thumb={variant.id}
      onClick={() => openVariantPicker(variant)}
      aria-label={`Foto principal de ${label}: ${image === null ? "sin foto" : note}. Cambiar`}
      className="group shrink-0 rounded-xl focus-visible:outline-none"
    >
      {picture}
    </button>
  ) : (
    <span data-variant-thumb={variant.id} className="shrink-0">
      {picture}
    </span>
  );
}

/** «la del producto» · «foto propia» · «Negra, de frente»: de dónde sale su foto. */
export function VariantPrimaryNote({ variant }: { variant: ProductVariantDTO }) {
  const gallery = useOptionalProductGallery();
  if (gallery === null) return null;
  const { product } = gallery;
  const { image, source } = effectiveVariantPrimary(product.images ?? [], variant, product.primary_image_id);
  const note = image === null ? "sin foto" : source === "chosen" && image.alt_text ? `«${image.alt_text}»` : SOURCE_LABEL[source];
  return <span className="truncate text-xs text-muted-foreground">{note}</span>;
}
