import type { ProductDTO, ProductImageDTO, ProductVariantDTO } from "./product";

/**
 * Galería única del producto y su foto principal (plan
 * catalog_images_gallery). Espejo de `application/primary_image.ts` del
 * servidor: la principal ELEGIDA es un puntero (`primary_image_id`) en el
 * producto y en cada variante; la EFECTIVA es la que se pinta y la que el
 * agente envía primero, y nunca falta si hay alguna foto lista.
 *
 * El servidor ya entrega la efectiva del producto (`primary_image`); estas
 * funciones existen para lo que el panel resuelve en vivo: la principal de
 * cada variante, las marcas «la usa S · M» y los estados optimistas.
 */

type Candidate = Pick<ProductImageDTO, "id" | "variant_id" | "position" | "status">;

function byGalleryOrder(a: Candidate, b: Candidate): number {
  if ((a.variant_id === null) !== (b.variant_id === null)) return a.variant_id === null ? -1 : 1;
  if (a.variant_id !== b.variant_id) return (a.variant_id ?? "").localeCompare(b.variant_id ?? "");
  return a.position - b.position;
}

/** La elegida si está lista; si no, la primera general lista; si no hay, la primera de una variante. */
export function effectivePrimaryImage<T extends Candidate>(
  images: readonly T[],
  primaryImageId: string | null,
): T | null {
  const ready = images.filter((image) => image.status === "ready");
  const chosen = primaryImageId === null ? undefined : ready.find((image) => image.id === primaryImageId);
  if (chosen !== undefined) return chosen;
  return [...ready].sort(byGalleryOrder)[0] ?? null;
}

/** Cómo llega una variante a su principal: la eligió, es su primera propia o hereda la del producto. */
export type VariantPrimarySource = "chosen" | "own" | "product";

export type VariantPrimary<T> = { image: T | null; source: VariantPrimarySource };

/**
 * Principal de una variante: la elegida si es general o de ESTA variante y
 * está lista; si no, su primera propia; si no tiene, la del producto.
 */
export function effectiveVariantPrimary<T extends Candidate>(
  images: readonly T[],
  variant: Pick<ProductVariantDTO, "id" | "primary_image_id">,
  productPrimaryImageId: string | null,
): VariantPrimary<T> {
  const ready = images.filter((image) => image.status === "ready");
  const chosen = ready.find(
    (image) =>
      image.id === variant.primary_image_id &&
      (image.variant_id === null || image.variant_id === variant.id),
  );
  if (chosen !== undefined) return { image: chosen, source: "chosen" };
  const own = ready
    .filter((image) => image.variant_id === variant.id)
    .sort((a, b) => a.position - b.position)[0];
  if (own !== undefined) return { image: own, source: "own" };
  return { image: effectivePrimaryImage(images, productPrimaryImageId), source: "product" };
}

/**
 * Qué variantes usan cada foto como principal ELEGIDA o propia (las marcas
 * «S · M · L» de la galería). Las que heredan la del producto no marcan: la
 * insignia «Principal» ya dice que es de todas.
 */
export function variantsByPrimaryImage(product: Pick<ProductDTO, "variants" | "images" | "primary_image_id">) {
  const images = product.images ?? [];
  const map = new Map<string, ProductVariantDTO[]>();
  for (const variant of product.variants) {
    const { image, source } = effectiveVariantPrimary(images, variant, product.primary_image_id);
    if (image === null || source === "product") continue;
    map.set(image.id, [...(map.get(image.id) ?? []), variant]);
  }
  return map;
}

/**
 * Orden de pintado de una banda: la principal delante y el resto por
 * `position`. Es el orden en que el agente envía (la principal primero).
 */
export function principalFirst<T extends Candidate>(images: readonly T[], principalId: string | null): T[] {
  const sorted = [...images].sort((a, b) => a.position - b.position);
  const index = principalId === null ? -1 : sorted.findIndex((image) => image.id === principalId);
  if (index <= 0) return sorted;
  return [sorted[index], ...sorted.slice(0, index), ...sorted.slice(index + 1)];
}

/** Filtro de la galería: todas, solo las generales o lo que muestra una variante. */
export type GalleryFilter = { kind: "all" } | { kind: "general" } | { kind: "variant"; variantId: string };

/**
 * Lo que muestra una variante: su principal y sus fotos propias. Las generales
 * que no eligió no aparecen en su filtro — son de todas, no de ella.
 */
export function imagesForVariant<T extends Candidate>(
  images: readonly T[],
  variant: Pick<ProductVariantDTO, "id" | "primary_image_id">,
  productPrimaryImageId: string | null,
): T[] {
  const { image: principal } = effectiveVariantPrimary(images, variant, productPrimaryImageId);
  const own = images.filter((image) => image.variant_id === variant.id);
  const all = principal !== null && !own.includes(principal) ? [principal, ...own] : own;
  return principalFirst(all, principal?.id ?? null);
}

// ── Subida ───────────────────────────────────────────────────────────────────

/** Borde máximo al reducir en el navegador: sobra para el chat (el servidor genera 1600 px). */
export const UPLOAD_MAX_EDGE = 2048;
export const UPLOAD_JPEG_QUALITY = 0.85;
/** Lo que se acepta ELEGIR: una foto de celular sin reducir pesa 4–12 MB. */
export const UPLOAD_INPUT_MAX_BYTES = 40 * 1024 * 1024;
/** Concurrencia de la cola: de a 3 llena el ancho de banda sin ahogar el BFF. */
export const UPLOAD_CONCURRENCY = 3;

/**
 * Dimensiones al reducir: el borde mayor a `maxEdge`, proporción intacta.
 * Nunca agranda: una foto pequeña se queda como está.
 */
export function fitWithin(width: number, height: number, maxEdge = UPLOAD_MAX_EDGE): { width: number; height: number } {
  const edge = Math.max(width, height);
  if (edge <= maxEdge || edge === 0) return { width, height };
  const scale = maxEdge / edge;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/**
 * ¿Vale la pena re-codificar? Un JPEG/WebP que ya cabe en el borde y pesa
 * poco se sube tal cual (re-comprimirlo solo pierde calidad). Todo lo demás
 * —HEIC, PNG pesados, fotos de celular— se reduce a JPEG.
 */
export function needsReencode(
  file: { type: string; size: number },
  dims: { width: number; height: number },
  maxEdge = UPLOAD_MAX_EDGE,
): boolean {
  const light = file.size <= 1.5 * 1024 * 1024;
  const fits = Math.max(dims.width, dims.height) <= maxEdge;
  const sendable = file.type === "image/jpeg" || file.type === "image/webp";
  return !(light && fits && sendable);
}

/** «8,2 MB», «640 KB»: tamaños como los lee una persona. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString("es-CO", { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Reparte lo elegido contra los cupos: se suben las primeras que caben y se
 * nombran las que quedaron fuera (mockup «Tope alcanzado»).
 */
export function splitByRemaining<T>(files: readonly T[], remaining: number): { accepted: T[]; rejected: T[] } {
  const room = Math.max(0, remaining);
  return { accepted: files.slice(0, room), rejected: files.slice(room) };
}

/**
 * Valores de los ejes de una variante en el orden del tipo de producto (talla
 * antes que color, si así lo definió el dueño). El servidor guarda `attributes`
 * con las claves ordenadas alfabéticamente, que no es el orden en que se lee
 * una variante; un eje que no figura en `axisOrder` va al final.
 */
export function variantAxisValues(
  variant: Pick<ProductVariantDTO, "attributes">,
  axisOrder: readonly string[] = [],
): string[] {
  const rank = (code: string) => {
    const index = axisOrder.indexOf(code);
    return index < 0 ? axisOrder.length : index;
  };
  return Object.entries(variant.attributes)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .sort(([a], [b]) => rank(a) - rank(b))
    .map(([, value]) => String(value));
}

/** «M · Negro»: los valores de los ejes; si no tiene ejes, su nombre o su SKU. */
export function variantShortLabel(
  variant: Pick<ProductVariantDTO, "attributes" | "name" | "sku">,
  axisOrder: readonly string[] = [],
): string {
  const values = variantAxisValues(variant, axisOrder);
  return values.length > 0 ? values.join(" · ") : variant.name || variant.sku;
}

/**
 * La píldora de una foto (lienzo: «⚪ S M L»): lo que comparten todas las
 * variantes que la usan va una vez delante y lo que cambia, en fila. «Blanco ·
 * S M L» en vez de «S · Blanco · M · Blanco · L · Blanco». Sin nada en común,
 * las etiquetas enteras.
 */
export function compactVariantMark(
  variants: readonly Pick<ProductVariantDTO, "attributes" | "name" | "sku">[],
  axisOrder: readonly string[] = [],
): string {
  if (variants.length === 0) return "";
  if (variants.length === 1) return variantShortLabel(variants[0], axisOrder);
  const rows = variants.map((variant) => variantAxisValues(variant, axisOrder));
  const width = Math.min(...rows.map((row) => row.length));
  const shared = new Set<number>();
  for (let index = 0; index < width; index += 1) {
    if (rows.every((row) => row[index] === rows[0][index])) shared.add(index);
  }
  if (width === 0 || shared.size === 0) {
    return variants.map((variant) => variantShortLabel(variant, axisOrder)).join(", ");
  }
  const common = [...shared].map((index) => rows[0][index]);
  const varying = rows.map((row) => row.filter((_, index) => !shared.has(index)).join(" "));
  // Lo que varía va unido (espacios de no separación): en un tile estrecho la
  // píldora corta en «Blanco ·» / «S M L», nunca dentro de la fila de tallas
  return [...common, varying.filter(Boolean).join("\u00a0")].filter(Boolean).join(" · ");
}

// ── «Usar en variante…» ──────────────────────────────────────────────────────

/** Qué pidió el dueño para cada variante en el panel. */
export type VariantChoice = "this" | "product" | "keep";

export type VariantAssignment = { variant_id: string; image_id: string | null };

/**
 * ¿Puede esta foto ser la principal de esa variante? Una general, de todas;
 * una propia, solo de su variante (la regla D3 del servidor).
 */
export function canUseImageForVariant(
  image: Pick<ProductImageDTO, "variant_id" | "status">,
  variantId: string,
): boolean {
  return image.status === "ready" && (image.variant_id === null || image.variant_id === variantId);
}

/**
 * Traduce lo marcado en el panel a las asignaciones que el servidor guarda de
 * una vez. Solo viaja lo que cambia:
 * - «this»: la variante pasa a usar esta foto;
 * - «product»: vuelve a la principal del producto. Va EXPLÍCITA cuando la
 *   variante tiene fotos propias: con el puntero en null usaría su primera
 *   propia, no la del producto;
 * - «keep» en una variante que hoy la tenía elegida: se suelta (null).
 */
export function variantAssignments(
  product: Pick<ProductDTO, "variants" | "images" | "primary_image_id">,
  imageId: string,
  choices: ReadonlyMap<string, VariantChoice>,
): VariantAssignment[] {
  const images = product.images ?? [];
  const productPrincipal = effectivePrimaryImage(images, product.primary_image_id);
  const out: VariantAssignment[] = [];
  for (const variant of product.variants) {
    // Una variante que el panel no nombra no se toca
    const choice = choices.get(variant.id);
    if (choice === undefined) continue;
    if (choice === "this") {
      if (variant.primary_image_id !== imageId) out.push({ variant_id: variant.id, image_id: imageId });
      continue;
    }
    if (choice === "product") {
      const target = backToProductTarget(images, variant.id, productPrincipal);
      if (variant.primary_image_id !== target) out.push({ variant_id: variant.id, image_id: target });
      continue;
    }
    if (variant.primary_image_id === imageId) out.push({ variant_id: variant.id, image_id: null });
  }
  return out;
}

/**
 * El puntero que deja a una variante usando la principal del producto: null
 * si no tiene fotos propias (cae sola a la del producto); la del producto,
 * explícita, si las tiene (con null usaría su primera propia).
 */
export function backToProductTarget(
  images: readonly Pick<ProductImageDTO, "id" | "variant_id" | "status">[],
  variantId: string,
  productPrincipal: Pick<ProductImageDTO, "id" | "variant_id" | "status"> | null,
): string | null {
  const hasOwn = images.some((image) => image.variant_id === variantId && image.status === "ready");
  return hasOwn && productPrincipal !== null && canUseImageForVariant(productPrincipal, variantId)
    ? productPrincipal.id
    : null;
}

/** «Ahora: …» de cada fila del panel, desde el punto de vista de la foto abierta. */
export function currentUseLabel(
  product: Pick<ProductDTO, "images" | "primary_image_id">,
  variant: Pick<ProductVariantDTO, "id" | "primary_image_id">,
  imageId: string,
): string {
  const { image, source } = effectiveVariantPrimary(product.images ?? [], variant, product.primary_image_id);
  if (image?.id === imageId) return "esta foto";
  if (source === "product") return "la del producto";
  if (source === "own") return "su foto propia";
  return image?.variant_id === variant.id ? "su foto propia" : "otra foto general";
}

/**
 * Atajos «Todo Negro / Todo Blanco»: el eje que agrupa variantes en menos
 * conjuntos (con al menos dos), normalmente el color. Sin ejes, no hay atajos.
 */
export function variantGroupShortcuts(
  variants: readonly Pick<ProductVariantDTO, "id" | "attributes">[],
): { label: string; variant_ids: string[] }[] {
  const byAxis = new Map<string, Map<string, string[]>>();
  for (const variant of variants) {
    for (const [axis, raw] of Object.entries(variant.attributes)) {
      if (raw === null || raw === undefined || raw === "") continue;
      const values = byAxis.get(axis) ?? new Map<string, string[]>();
      const value = String(raw);
      values.set(value, [...(values.get(value) ?? []), variant.id]);
      byAxis.set(axis, values);
    }
  }
  let best: Map<string, string[]> | null = null;
  for (const values of byAxis.values()) {
    if (values.size < 2 || values.size >= variants.length) continue;
    if (best === null || values.size < best.size) best = values;
  }
  if (best === null) return [];
  return [...best.entries()].map(([value, ids]) => ({ label: `Todo ${value}`, variant_ids: ids }));
}
