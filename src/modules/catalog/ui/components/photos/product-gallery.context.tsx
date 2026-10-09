"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import type { AppAlert } from "@/core/notifications";
import { Modal } from "@/shared/components/ui/modal";
import {
  PRODUCT_GALLERY_MAX,
  VARIANT_GALLERY_MAX,
  validateImageFile,
  type ProductDTO,
  type ProductImageDTO,
  type ProductVariantDTO,
} from "@/modules/catalog/domain/product";
import {
  effectivePrimaryImage,
  effectiveVariantPrimary,
  compactVariantMark,
  principalFirst,
  splitByRemaining,
  variantShortLabel,
  variantsByPrimaryImage,
  type GalleryFilter,
  type VariantAssignment,
} from "@/modules/catalog/domain/product-gallery";
import { usePhotoUploads } from "@/modules/catalog/infrastructure/hooks/use-photo-uploads";
import {
  deleteProductImage,
  reorderProductImages,
  retryImageImport,
  setProductPrimaryImage,
  setVariantPrimaryImage,
  setVariantPrimaryImages,
} from "@/modules/catalog/infrastructure/services/product-image-service.adapter";
import { getProductById } from "@/modules/catalog/infrastructure/services/product-service.adapter";
import type { UploadItem } from "@/modules/catalog/infrastructure/stores/photo-upload-queue";
import { PhotoLightbox } from "./PhotoLightbox";
import { PhotoPickerInput, type PhotoPickerHandle } from "./PhotoUploader";
import { UseInVariantsPanel } from "./UseInVariantsPanel";
import { VariantPhotoPicker } from "./VariantPhotoPicker";

/** Lo que dijo la última selección de archivos: las que no cupieron y las que no sirven. */
export type VariantMark = { mark: string; labels: readonly string[] };

export type PickNotice = { kind: "over_limit"; accepted: number; rejected: string[] } | { kind: "invalid"; files: string[]; reason: string };

type GalleryContextValue = {
  product: ProductDTO;
  canManage: boolean;
  lockedByStore: boolean;
  /** Foto principal efectiva del producto */
  principal: ProductImageDTO | null;
  /** Qué variantes usan cada foto como principal: la píldora compacta y las etiquetas */
  usedBy: ReadonlyMap<string, VariantMark>;
  /** «M · Negro», en el orden de los ejes del tipo de producto */
  labelOf: (variant: Pick<ProductVariantDTO, "attributes" | "name" | "sku">) => string;
  uploads: readonly UploadItem[];
  notice: PickNotice | null;
  dismissNotice: () => void;
  filter: GalleryFilter;
  setFilter: (filter: GalleryFilter) => void;
  /** Abre el selector de archivos para las generales o para una variante */
  pick: (variantId?: string | null) => void;
  addFiles: (files: File[], variantId?: string | null) => void;
  retryUpload: (id: string) => void;
  discardUpload: (id: string) => void;
  refetch: () => Promise<void>;
  makePrimary: (image: ProductImageDTO) => void;
  reorder: (variantId: string | null, next: ProductImageDTO[]) => void;
  retryImport: (image: ProductImageDTO) => void;
  view: (image: ProductImageDTO) => void;
  askDelete: (image: ProductImageDTO) => void;
  openUseInVariants: (image: ProductImageDTO) => void;
  openVariantPicker: (variant: ProductVariantDTO) => void;
  /** Principal de UNA variante (con «Deshacer»); `null` = la del producto */
  makeVariantPrimary: (variant: ProductVariantDTO, imageId: string | null) => void;
};

const GalleryContext = createContext<GalleryContextValue | null>(null);
const EMPTY_AXES: readonly string[] = [];

/** Para piezas que también viven fuera de la ficha (la tabla de variantes): sin proveedor, null. */
export function useOptionalProductGallery(): GalleryContextValue | null {
  return useContext(GalleryContext);
}

export function useProductGallery(): GalleryContextValue {
  const value = useContext(GalleryContext);
  if (value === null) throw new Error("useProductGallery fuera de ProductGalleryProvider");
  return value;
}

/**
 * Estado y acciones de la galería de UN producto (plan catalog_images_gallery).
 * Lo comparten la sección «Fotos» y la tabla de variantes —el selector de cada
 * variante sube y elige sobre la misma galería— y monta una sola vez los
 * paneles (Usar en variante…, selector de variante, borrar, original) y el
 * input de archivos. La galería es la ÚNICA entrada de fotos del panel.
 */
export function ProductGalleryProvider({
  product,
  canManage,
  lockedByStore = false,
  axisOrder = EMPTY_AXES,
  onSaved,
  setAlert,
  children,
}: {
  product: ProductDTO;
  canManage: boolean;
  lockedByStore?: boolean;
  /** Códigos de los ejes de variante en el orden del tipo de producto */
  axisOrder?: readonly string[];
  onSaved: (updated: ProductDTO) => void;
  setAlert?: (alert: AppAlert) => void;
  children: React.ReactNode;
}) {
  // Las acciones asíncronas leen el producto vigente, no el de su render
  const productRef = useRef(product);
  useEffect(() => {
    productRef.current = product;
  }, [product]);

  // Secuencia de escrituras (auditoría C-7): cada acción toma un turno y solo
  // la respuesta del ÚLTIMO turno se pinta. Sin esto, un refetch lento que
  // salió antes de «Hacer principal» llegaba después y deshacía la pantalla.
  const seqRef = useRef(0);
  const begin = useCallback(() => ++seqRef.current, []);
  const applyIfLatest = useCallback(
    (turn: number, fresh: ProductDTO) => {
      if (turn === seqRef.current) onSaved(fresh);
    },
    [onSaved],
  );

  const refetch = useCallback(async () => {
    const turn = begin();
    applyIfLatest(turn, await getProductById(productRef.current.id));
  }, [applyIfLatest, begin]);

  const { items: uploads, enqueue, retry, discard } = usePhotoUploads(product.id, refetch);
  const [notice, setNotice] = useState<PickNotice | null>(null);
  const [filter, setFilter] = useState<GalleryFilter>({ kind: "all" });
  const [lightbox, setLightbox] = useState<ProductImageDTO | null>(null);
  const [toDelete, setToDelete] = useState<ProductImageDTO | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [useInVariants, setUseInVariants] = useState<ProductImageDTO | null>(null);
  const [pickerVariant, setPickerVariant] = useState<ProductVariantDTO | null>(null);
  const pickerRef = useRef<PhotoPickerHandle>(null);
  const pickTargetRef = useRef<string | null>(null);

  const images = useMemo(() => product.images ?? [], [product.images]);
  const principal = useMemo(() => effectivePrimaryImage(images, product.primary_image_id), [images, product.primary_image_id]);
  const labelOf = useCallback(
    (variant: Pick<ProductVariantDTO, "attributes" | "name" | "sku">) => variantShortLabel(variant, axisOrder),
    [axisOrder],
  );
  const usedBy = useMemo(() => {
    const marks = new Map<string, VariantMark>();
    for (const [imageId, variants] of variantsByPrimaryImage(product)) {
      marks.set(imageId, { mark: compactVariantMark(variants, axisOrder), labels: variants.map(labelOf) });
    }
    return marks;
  }, [product, axisOrder, labelOf]);

  const fail = useCallback(
    (err: unknown, fallback: string) => setAlert?.({ tone: "error", title: errorMessage(err, fallback) }),
    [setAlert],
  );

  const addFiles = useCallback(
    (files: File[], variantId: string | null = null) => {
      const invalid = files.flatMap((file) => {
        const reason = validateImageFile(file);
        return reason === null ? [] : [{ file, reason }];
      });
      const valid = files.filter((file) => validateImageFile(file) === null);
      const max = variantId === null ? PRODUCT_GALLERY_MAX : VARIANT_GALLERY_MAX;
      const used =
        images.filter((image) => image.variant_id === variantId).length +
        uploads.filter((item) => item.variant_id === variantId && item.status !== "done").length;
      const { accepted, rejected } = splitByRemaining(valid, max - used);
      if (rejected.length > 0) {
        setNotice({ kind: "over_limit", accepted: accepted.length, rejected: rejected.map((file) => file.name) });
      } else if (invalid.length > 0) {
        setNotice({ kind: "invalid", files: invalid.map((row) => row.file.name), reason: invalid[0].reason });
      } else {
        setNotice(null);
      }
      // Subir directo a una variante la deja como su principal (D9)
      if (accepted.length > 0) enqueue({ variant_id: variantId, files: accepted, primary_index: variantId === null ? null : 0 });
    },
    [enqueue, images, uploads],
  );

  const pick = useCallback((variantId: string | null = null) => {
    pickTargetRef.current = variantId;
    pickerRef.current?.open();
  }, []);

  const makePrimary = useCallback(
    (image: ProductImageDTO) => {
      const before = productRef.current;
      const turn = begin();
      onSaved({ ...before, primary_image_id: image.id });
      void (async () => {
        let updated: ProductDTO;
        try {
          updated = await setProductPrimaryImage(before.id, image.id);
        } catch (err) {
          // No se guardó: se vuelve a la verdad del servidor, no a una copia vieja
          fail(err, "No se pudo cambiar la foto principal");
          await refetch().catch(() => undefined);
          return;
        }
        applyIfLatest(turn, updated);
        // La principal pasa al frente de su banda: el orden es el de envío. Si
        // esto falla, la principal YA cambió (lo que se ve es lo guardado) y
        // solo se avisa del orden
        const band = (updated.images ?? []).filter((row) => row.variant_id === image.variant_id);
        const ordered = principalFirst(band, image.id);
        if (!ordered.some((row, index) => row.position !== index)) return;
        try {
          await reorderProductImages(before.id, { variant_id: image.variant_id, image_ids: ordered.map((row) => row.id) });
        } catch (err) {
          fail(err, "La principal cambió, pero no pudimos ordenar la galería");
        }
        await refetch().catch(() => undefined);
      })();
    },
    [applyIfLatest, begin, fail, onSaved, refetch],
  );

  const reorder = useCallback(
    (variantId: string | null, next: ProductImageDTO[]) => {
      const before = productRef.current;
      begin();
      const rest = (before.images ?? []).filter((image) => image.variant_id !== variantId);
      onSaved({ ...before, images: [...rest, ...next.map((image, index) => ({ ...image, position: index }))] });
      reorderProductImages(before.id, { variant_id: variantId, image_ids: next.map((image) => image.id) }).catch((err: unknown) => {
        fail(err, "No se pudo guardar el orden");
        void refetch().catch(() => undefined);
      });
    },
    [begin, fail, onSaved, refetch],
  );

  const retryImport = useCallback(
    (image: ProductImageDTO) => {
      retryImageImport(image.id)
        .then(() => refetch())
        .catch((err: unknown) => fail(err, "No se pudo reintentar la descarga"));
    },
    [fail, refetch],
  );

  const saveAssignments = useCallback(
    async (assignments: VariantAssignment[]) => {
      const turn = begin();
      try {
        applyIfLatest(turn, await setVariantPrimaryImages(productRef.current.id, { assignments }));
        setAlert?.({
          tone: "success",
          title: assignments.length === 1 ? "Variante actualizada" : `${assignments.length} variantes actualizadas`,
        });
      } catch (err) {
        fail(err, "No se pudieron guardar las variantes");
        throw err;
      }
    },
    [applyIfLatest, begin, fail, setAlert],
  );

  const pickVariantPrimary = useCallback(
    (variant: ProductVariantDTO, imageId: string | null) => {
      // El valor VIGENTE, no el del momento en que se abrió el selector (C-8):
      // «Deshacer» debe volver a lo que había justo antes de este cambio
      const current = productRef.current.variants.find((row) => row.id === variant.id) ?? variant;
      const previous = current.primary_image_id;
      if (previous === imageId) return;
      const label = labelOf(variant);
      const turn = begin();
      setVariantPrimaryImage(variant.id, imageId)
        .then((updated) => {
          applyIfLatest(turn, updated);
          setAlert?.({
            tone: "success",
            title: `Foto principal de ${label} actualizada`,
            actions: [
              {
                label: "Deshacer",
                onClick: () => {
                  const undoTurn = begin();
                  setVariantPrimaryImage(variant.id, previous)
                    .then((restored) => applyIfLatest(undoTurn, restored))
                    .catch((err: unknown) => fail(err, "No se pudo deshacer"));
                },
              },
            ],
          });
        })
        .catch((err: unknown) => fail(err, "No se pudo cambiar la foto de la variante"));
    },
    [applyIfLatest, begin, fail, labelOf, setAlert],
  );

  const confirmDelete = async () => {
    if (toDelete === null || deleting) return;
    try {
      setDeleting(true);
      await deleteProductImage(toDelete.id);
      setToDelete(null);
      await refetch();
    } catch (err) {
      fail(err, "No se pudo borrar la foto");
    } finally {
      setDeleting(false);
    }
  };

  const value: GalleryContextValue = {
    product,
    canManage,
    lockedByStore,
    principal,
    usedBy,
    labelOf,
    uploads,
    notice,
    dismissNotice: () => setNotice(null),
    filter,
    setFilter,
    pick,
    addFiles,
    retryUpload: retry,
    discardUpload: discard,
    refetch,
    makePrimary,
    reorder,
    retryImport,
    view: setLightbox,
    askDelete: setToDelete,
    openUseInVariants: setUseInVariants,
    openVariantPicker: setPickerVariant,
    makeVariantPrimary: pickVariantPrimary,
  };

  return (
    <GalleryContext.Provider value={value}>
      {children}

      <PhotoPickerInput ref={pickerRef} onFiles={(files) => addFiles(files, pickTargetRef.current)} />

      <UseInVariantsPanel
        product={product}
        image={useInVariants}
        open={useInVariants !== null}
        onOpenChange={(open) => !open && setUseInVariants(null)}
        onSave={saveAssignments}
      />

      <VariantPhotoPicker
        product={product}
        variant={pickerVariant}
        open={pickerVariant !== null}
        onOpenChange={(open) => !open && setPickerVariant(null)}
        onPick={pickVariantPrimary}
        onUpload={(variant) => pick(variant.id)}
        onShowGallery={(variant) => {
          setFilter({ kind: "variant", variantId: variant.id });
          document.getElementById("fotos")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <PhotoLightbox
        open={lightbox !== null}
        onOpenChange={(open) => !open && setLightbox(null)}
        imageId={lightbox?.id ?? null}
        alt={lightbox?.alt_text ?? product.name}
      />

      <Modal
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        config={{
          title: toDelete !== null && toDelete.id === principal?.id ? "Borrar la principal" : "Borrar foto",
          description: toDelete === null ? "" : deleteDescription(product, toDelete, principal, labelOf),
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "photo-delete-cancel" },
            {
              label: deleting ? "Borrando…" : "Borrar",
              variant: "destructive",
              asClose: false,
              onClick: confirmDelete,
              id: "photo-delete-confirm",
            },
          ],
          className: "sm:max-w-md",
        }}
      />
    </GalleryContext.Provider>
  );
}

/**
 * La confirmación dice qué pasa después (lienzo, «Borrar la principal»): qué
 * foto toma su lugar y qué variantes cambian.
 */
export function deleteDescription(
  product: Pick<ProductDTO, "images" | "variants" | "primary_image_id">,
  image: ProductImageDTO,
  principal: ProductImageDTO | null,
  labelOf: (variant: ProductVariantDTO) => string = (variant) => variantShortLabel(variant),
): string {
  const remaining = (product.images ?? []).filter((row) => row.id !== image.id);
  const name = (row: ProductImageDTO) => (row.alt_text ? `«${row.alt_text}»` : "la siguiente foto de la galería");
  // Las que la usan por elección o como propia; las que heredan siguen a la del producto
  const affected = product.variants
    .filter((variant) => {
      const current = effectiveVariantPrimary(product.images ?? [], variant, product.primary_image_id);
      return current.image?.id === image.id && current.source !== "product";
    })
    .map(labelOf);
  const parts: string[] = [];
  if (image.id === principal?.id) {
    const next = effectivePrimaryImage(remaining, null);
    parts.push(
      next === null
        ? "Es la principal del producto y no quedan otras fotos: tu agente solo podrá describirlo."
        : `Es la principal del producto. Al borrarla, ${name(next)} pasa a ser la principal.`,
    );
  } else {
    parts.push("La foto desaparecerá de la galería y tu agente dejará de enviarla.");
  }
  if (affected.length > 0) {
    const verb = affected.length === 1 ? "volverá" : "volverán";
    parts.push(`${affected.join(", ")} ${verb} a usar la principal del producto.`);
  }
  return parts.join(" ");
}
