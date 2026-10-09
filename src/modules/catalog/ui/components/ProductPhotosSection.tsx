"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertCircle, HardDrive, ImagePlus, Info, Lock, Minimize2, RefreshCw, Store, TriangleAlert, Upload } from "lucide-react";
import { useStorageQuotaState } from "@/modules/storage/public";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/lib/utils";
import {
  PRODUCT_GALLERY_MAX,
  VARIANT_GALLERY_MAX,
  hasPendingImages,
  type ProductImageDTO,
} from "@/modules/catalog/domain/product";
import {
  imagesForVariant,
  principalFirst,
  type GalleryFilter,
} from "@/modules/catalog/domain/product-gallery";
import { useProductImagesPolling } from "@/modules/catalog/infrastructure/hooks/use-product-images-polling";
import { PhotoDropTile } from "./photos/PhotoUploader";
import type { PhotoTileActions } from "./photos/PhotoTile";
import { SortablePhotoGallery } from "./photos/SortablePhotoGallery";
import { UploadTile } from "./photos/UploadTile";
import { useProductGallery } from "./photos/product-gallery.context";

/**
 * Sección «Fotos» de la ficha (plan catalog_images_gallery, lienzo aprobado
 * 2026-10-08): UNA galería por producto, con las fotos generales y las
 * propias de cada variante en dos bandas, cada una con su tope. De aquí sale
 * la principal del producto (anillo de tinta, siempre primera) y la de cada
 * variante (la píldora «S · M» dice quién la usa). Es la única entrada de
 * fotos del panel: ya no hay campo URL. El estado vive en
 * `ProductGalleryProvider`, que comparte con la tabla de variantes.
 */
export function ProductPhotosSection() {
  const gallery = useProductGallery();
  // Espacio lleno (auditoría C-3): todas las entradas se apagan ANTES del 507
  const { blocksUploads } = useStorageQuotaState();
  const { product, canManage, lockedByStore, principal, uploads, filter, setFilter } = gallery;
  const images = useMemo(() => product.images ?? [], [product.images]);
  const variants = useMemo(() => [...product.variants].sort((a, b) => a.position - b.position), [product.variants]);
  const [dragging, setDragging] = useState(false);

  const general = principalFirst(
    images.filter((image) => image.variant_id === null),
    principal?.variant_id === null ? principal.id : null,
  );
  const generalUploads = uploads.filter((item) => item.variant_id === null);
  const generalRemaining = PRODUCT_GALLERY_MAX - general.length - generalUploads.filter((item) => item.status !== "done").length;
  const withOwn = variants.filter(
    (variant) =>
      images.some((image) => image.variant_id === variant.id) || uploads.some((item) => item.variant_id === variant.id),
  );
  const isEmpty = images.length === 0 && uploads.length === 0;

  const { stalled, resume } = useProductImagesPolling(hasPendingImages(product.images), gallery.refetch);
  const onImageError = useCallback(() => {
    void gallery.refetch().catch(() => undefined);
  }, [gallery]);

  const tileActions = {
    onView: gallery.view,
    onMakePrimary: gallery.makePrimary,
    onUseInVariants: variants.length > 1 ? gallery.openUseInVariants : undefined,
    onDelete: gallery.askDelete,
    onRetryImport: gallery.retryImport,
    onImageError,
  };

  const uploadTiles = (variantId: string | null) =>
    uploads
      .filter((item) => item.variant_id === variantId)
      .map((item) => (
        <UploadTile key={item.id} item={item} onRetry={gallery.retryUpload} onDiscard={gallery.discardUpload} />
      ));

  const dropTile = (variantId: string | null, remaining: number, label?: string) =>
    canManage ? (
      <PhotoDropTile
        remaining={remaining}
        label={label}
        onPick={() => gallery.pick(variantId)}
        onFiles={(files) => gallery.addFiles(files, variantId)}
      />
    ) : null;

  const dropHandlers = canManage && !blocksUploads
    ? {
        onDragOver: (event: React.DragEvent) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        },
        onDragLeave: (event: React.DragEvent) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        },
        onDrop: (event: React.DragEvent) => {
          if (!event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(false);
          const target = filter.kind === "variant" ? filter.variantId : null;
          gallery.addFiles(Array.from(event.dataTransfer.files), target);
        },
      }
    : {};

  return (
    <section
      id="fotos"
      aria-label="Fotos del producto"
      className={cn("relative scroll-mt-24 space-y-4 rounded-2xl", dragging && "outline-2 outline-offset-8 outline-dashed outline-foreground/40")}
      {...dropHandlers}
    >
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold">Fotos</h2>
          {lockedByStore ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock aria-hidden="true" className="size-3" />
              Las manda Shopify: se suben y ordenan en tu tienda
            </p>
          ) : null}
        </div>
        {stalled ? (
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => void resume()}>
            <RefreshCw className="size-3.5" aria-hidden />
            Actualizar
          </Button>
        ) : canManage && !isEmpty ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={blocksUploads || (filter.kind !== "variant" && generalRemaining <= 0)}
            onClick={() => gallery.pick(filter.kind === "variant" ? filter.variantId : null)}
          >
            <Upload className="size-3.5" aria-hidden />
            Subir
          </Button>
        ) : null}
      </div>

      {isEmpty ? (
        <>
          <EmptyGallery
            canManage={canManage}
            blocked={blocksUploads}
            onPick={() => gallery.pick(null)}
            productName={product.name}
          />
          {canManage && blocksUploads ? <StorageFullCallout /> : null}
        </>
      ) : (
        <>
          <UploadSummary />

          {variants.length > 1 ? <FilterChips filter={filter} onChange={setFilter} /> : null}

          {filter.kind === "variant" ? (
            <VariantFilterView variantId={filter.variantId} tileActions={tileActions} uploadTiles={uploadTiles} dropTile={dropTile} />
          ) : (
            <>
              <Band title="General" count={`${general.length} de ${PRODUCT_GALLERY_MAX}`}>
                {general.length === 0 && generalUploads.length === 0 ? (
                  <p className="mb-2 text-xs text-muted-foreground">Aún sin fotos generales: son las que comparten todas las variantes.</p>
                ) : null}
                <SortablePhotoGallery
                  images={general}
                  principalId={principal?.id ?? null}
                  usedBy={gallery.usedBy}
                  altFallback={product.name}
                  canManage={canManage}
                  onReorder={(next) => gallery.reorder(null, next)}
                  trailing={
                    <>
                      {uploadTiles(null)}
                      {dropTile(null, generalRemaining)}
                    </>
                  }
                  {...tileActions}
                />
              </Band>

              {filter.kind === "all" && withOwn.length > 0 ? (
                <div className="space-y-3">
                  {withOwn.map((variant, index) => {
                    const own = images.filter((image) => image.variant_id === variant.id);
                    const ownPrincipal = own.find((image) => image.id === principal?.id) ?? null;
                    return (
                      <Band
                        key={variant.id}
                        title={index === 0 ? "De una variante" : ""}
                        count={`${gallery.labelOf(variant)} · ${own.length} de ${VARIANT_GALLERY_MAX}`}
                      >
                        <SortablePhotoGallery
                          images={principalFirst(own, ownPrincipal?.id ?? null)}
                          principalId={principal?.id ?? null}
                          usedBy={gallery.usedBy}
                          altFallback={`${product.name} — ${gallery.labelOf(variant)}`}
                          canManage={canManage}
                          onReorder={(next) => gallery.reorder(variant.id, next)}
                          trailing={uploadTiles(variant.id)}
                          {...tileActions}
                        />
                      </Band>
                    );
                  })}
                </div>
              ) : null}
            </>
          )}

          <GalleryNotices generalRemaining={generalRemaining} />

          {lockedByStore ? (
            <Note icon={<Store className="size-3.5" aria-hidden />}>
              La principal es la primera de Shopify y la de cada variante, la que le asignaste allá. Aquí solo se ven.
            </Note>
          ) : canManage && images.length > 0 ? (
            <Note icon={<Info className="size-3.5" aria-hidden />}>
              La píldora con tallas o colores dice qué variantes usan esa foto como principal; las demás usan la del
              producto. Arrastra para ordenar: tu agente las envía en este orden, la principal primero.
            </Note>
          ) : null}
        </>
      )}
    </section>
  );
}

function Band({ title, count, children }: { title: string; count: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      </div>
      {children}
    </div>
  );
}

function Note({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function EmptyGallery({
  canManage,
  blocked,
  onPick,
  productName,
}: {
  canManage: boolean;
  blocked: boolean;
  onPick: () => void;
  productName: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-2 py-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <ImagePlus className="size-5" aria-hidden />
      </span>
      <div className="space-y-1">
        <p className="text-[15px] font-semibold">Aún sin fotos</p>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Cuando un cliente pida ver {productName.toLowerCase()}, tu agente le envía la principal primero. Sin fotos,
          solo puede describirlo.
        </p>
      </div>
      {canManage ? (
        <>
          <Button className="rounded-full px-5" onClick={onPick} disabled={blocked}>
            <ImagePlus className="size-4" aria-hidden />
            Elegir fotos
          </Button>
          {/* Sin HEIC en el texto (C-7): Chrome y Edge no lo leen; el iPhone ya lo convierte a JPG al subir */}
          <p className="text-xs text-muted-foreground">También puedes arrastrarlas aquí · JPG, PNG o WebP</p>
        </>
      ) : null}
    </div>
  );
}

function FilterChips({ filter, onChange }: { filter: GalleryFilter; onChange: (filter: GalleryFilter) => void }) {
  const { product, labelOf } = useProductGallery();
  const images = product.images ?? [];
  const variants = [...product.variants].sort((a, b) => a.position - b.position);
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring",
      active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent",
    );
  return (
    <div
      role="group"
      aria-label="Filtrar fotos"
      // Celular: una fila que se desliza; escritorio: envuelve (lienzo)
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible"
    >
      <button type="button" aria-pressed={filter.kind === "all"} className={chip(filter.kind === "all")} onClick={() => onChange({ kind: "all" })}>
        Todas <span className="opacity-70 tabular-nums">{images.length}</span>
      </button>
      <button
        type="button"
        aria-pressed={filter.kind === "general"}
        className={chip(filter.kind === "general")}
        onClick={() => onChange({ kind: "general" })}
      >
        General <span className="opacity-70 tabular-nums">{images.filter((image) => image.variant_id === null).length}</span>
      </button>
      {variants.map((variant) => {
        const active = filter.kind === "variant" && filter.variantId === variant.id;
        return (
          <button
            key={variant.id}
            type="button"
            aria-pressed={active}
            className={chip(active)}
            title={`Lo que muestra ${labelOf(variant)}`}
            onClick={() => onChange({ kind: "variant", variantId: variant.id })}
          >
            {labelOf(variant)}
          </button>
        );
      })}
    </div>
  );
}

function VariantFilterView({
  variantId,
  tileActions,
  uploadTiles,
  dropTile,
}: {
  variantId: string;
  tileActions: PhotoTileActions;
  uploadTiles: (variantId: string | null) => React.ReactNode;
  dropTile: (variantId: string | null, remaining: number, label?: string) => React.ReactNode;
}) {
  const { product, canManage, usedBy, uploads, labelOf, makeVariantPrimary } = useProductGallery();
  const variant = product.variants.find((row) => row.id === variantId);
  if (variant === undefined) return null;
  const images = product.images ?? [];
  const shown: ProductImageDTO[] = imagesForVariant(images, variant, product.primary_image_id);
  const own = images.filter((image) => image.variant_id === variant.id).length;
  const inFlight = uploads.filter((item) => item.variant_id === variant.id && item.status !== "done").length;
  const label = labelOf(variant);
  return (
    <Band title={`Lo que muestra ${label}`} count={`${own} de ${VARIANT_GALLERY_MAX} propias`}>
      {shown.length === 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">Usa la del producto. Sube una foto para que tenga la suya.</p>
      ) : null}
      {/* Sin arrastre: mezcla la principal elegida (quizá general) con las propias */}
      <SortablePhotoGallery
        images={shown}
        principalId={shown[0]?.id ?? null}
        usedBy={usedBy}
        altFallback={`${product.name} — ${label}`}
        canManage={canManage}
        trailing={
          <>
            {uploadTiles(variant.id)}
            {dropTile(variant.id, VARIANT_GALLERY_MAX - own - inFlight, `Subir para ${label}`)}
          </>
        }
        {...tileActions}
        // Dentro del filtro, «Hacer principal» es de ESTA variante (auditoría
        // C-7): antes cambiaba la portada de todo el producto
        onMakePrimary={(image) => makeVariantPrimary(variant, image.id)}
        makePrimaryLabel={`Hacer principal de ${label}`}
      />
    </Band>
  );
}

function UploadSummary() {
  const { uploads } = useProductGallery();
  const active = uploads.filter((item) => item.status !== "failed");
  const pending = active.filter((item) => item.status !== "done");
  if (pending.length === 0) return null;
  const done = active.length - pending.length;
  const progress = active.reduce((sum, item) => sum + (item.status === "done" ? 1 : item.progress), 0) / active.length;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-sm">
        <Upload className="size-4 shrink-0" aria-hidden />
        <span className="font-medium whitespace-nowrap">
          Subiendo {active.length} {active.length === 1 ? "foto" : "fotos"}
        </span>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          · {done} {done === 1 ? "lista" : "listas"} · de a 3
        </span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className="block h-full rounded-full bg-foreground transition-[width] duration-200" style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
      </div>
      <Note icon={<Minimize2 className="size-3.5" aria-hidden />}>
        Las reducimos en tu navegador antes de subirlas: un celular saca fotos de 8 MB y tu cliente las recibe de unos
        600 KB, igual de nítidas en el chat.
      </Note>
    </div>
  );
}

function GalleryNotices({ generalRemaining }: { generalRemaining: number }) {
  const { uploads, notice, product, canManage } = useProductGallery();
  const { blocksUploads } = useStorageQuotaState();
  const failed = uploads.filter((item) => item.status === "failed" && item.failure === "error");
  const noSpace = uploads.filter((item) => item.failure === "storage_full" || item.failure === "platform_full");
  const pendingImports = (product.images ?? []).some((image) => image.status === "pending");
  return (
    <div className="space-y-2 empty:hidden">
      {canManage && (blocksUploads || noSpace.length > 0) ? (
        <StorageFullCallout
          pending={noSpace.length}
          platform={noSpace.some((item) => item.failure === "platform_full")}
        />
      ) : null}
      {failed.length > 0 ? (
        <Callout icon={<AlertCircle className="size-4 text-destructive" aria-hidden />}>
          <span className="font-semibold">
            {failed.length === 1 ? `${failed[0].file_name} no se subió:` : `${failed.length} fotos no se subieron:`}
          </span>{" "}
          {failed[0].error}. Las demás siguen. Toca «Reintentar» en esa foto.
        </Callout>
      ) : null}
      {notice?.kind === "over_limit" ? (
        <Callout icon={<TriangleAlert className="size-4 text-warning" aria-hidden />}>
          <span className="font-semibold">
            Elegiste {notice.accepted + notice.rejected.length} fotos y caben {notice.accepted}.
          </span>{" "}
          {notice.accepted > 0 ? `Subimos ${notice.accepted === 1 ? "la primera" : `las ${notice.accepted} primeras`}. ` : ""}
          {notice.rejected.length === 1 ? "Quedó fuera" : "Quedaron fuera"} {notice.rejected.join(", ")}.
        </Callout>
      ) : null}
      {notice?.kind === "invalid" ? (
        <Callout icon={<TriangleAlert className="size-4 text-warning" aria-hidden />}>
          <span className="font-semibold">{notice.files.join(", ")}:</span> {notice.reason}
        </Callout>
      ) : null}
      {canManage && generalRemaining <= 0 ? (
        <Callout icon={<Info className="size-4 text-info" aria-hidden />}>
          <span className="font-semibold">Llegaste a {PRODUCT_GALLERY_MAX} fotos generales.</span> Borra una para subir
          otra, o súbela a una variante: cada una admite {VARIANT_GALLERY_MAX} propias.
        </Callout>
      ) : null}
      {pendingImports ? (
        <Note icon={<Info className="size-3.5" aria-hidden />}>
          La primera que llega queda como principal. Puedes cambiarla cuando terminen.
        </Note>
      ) : null}
    </div>
  );
}

/**
 * Espacio lleno (auditoría C-3): un solo aviso por lote, con el motivo y qué
 * hacer, en vez de una foto «No se subió · Reintentar» por archivo. Si el que
 * se llenó es el almacenamiento de Axi, no es culpa ni tarea del tenant.
 */
function StorageFullCallout({ pending = 0, platform = false }: { pending?: number; platform?: boolean }) {
  const { blockedHint } = useStorageQuotaState();
  const waiting =
    pending > 0 ? ` ${pending === 1 ? "Quedó 1 foto sin subir" : `Quedaron ${String(pending)} fotos sin subir`}.` : "";
  return (
    <Callout icon={<HardDrive className="size-4 text-warning" aria-hidden />}>
      {platform ? (
        <>
          <span className="font-semibold">El almacenamiento de Axi está lleno por ahora.</span> Ya avisamos a soporte;
          intenta de nuevo más tarde.{waiting}
        </>
      ) : (
        <>
          <span className="font-semibold">Tu espacio de almacenamiento está lleno.</span> {blockedHint}
          {waiting}
        </>
      )}
    </Callout>
  );
}

function Callout({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-muted/70 px-4 py-3 text-sm leading-relaxed">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p className="min-w-0">{children}</p>
    </div>
  );
}
