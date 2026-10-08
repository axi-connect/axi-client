import { effectiveVariantPrimary } from "./product-gallery";
import { enrichmentDisplayState, type ProductDTO } from "./product";
import type { ProductTypeDTO } from "./product-type";

/**
 * «Para que tu agente lo venda»: lo que le falta a UNA ficha (catálogo premium
 * F3, canvas tablero 4). Se deriva del producto y de su tipo, sin llamadas
 * nuevas: el `ProductDto` del detalle ya trae fotos, variantes con stock y el
 * enriquecimiento. TS puro.
 */

export type ReadinessTone = "destructive" | "warning" | "neutral";

export type ReadinessItem = {
  key: "inactive" | "no_photos" | "out_of_stock" | "missing_attributes" | "variants_without_photos" | "enrichment";
  title: string;
  detail: string;
  tone: ReadinessTone;
  /** Ancla de la sección de la ficha que lo resuelve. */
  href: `#${string}`;
  action: string;
};

export type ProductReadiness = {
  items: ReadinessItem[];
  /** Lo que ya está bien, en una línea («4 fotos · búsqueda con IA lista»). */
  ready: string[];
};

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

function variantName(variant: ProductDTO["variants"][number]): string {
  return variant.name ?? variant.sku;
}

/**
 * En orden de lo que más le cuesta al agente: inactivo no se ofrece; sin fotos
 * no se puede enseñar; agotado se ofrece y se retira; un atributo requerido
 * vacío le quita con qué recomendar; una variante sin fotos propias usa las del
 * producto (se vende igual); sin búsqueda con IA usa la ficha tal cual.
 */
export function productReadiness(product: ProductDTO, productType: ProductTypeDTO | null): ProductReadiness {
  const items: ReadinessItem[] = [];
  const ready: string[] = [];
  const images = product.images ?? [];
  // Plan catalog_images_gallery: cuenta toda la galería (un catálogo puede
  // tener fotos solo por variante) y una variante está cubierta si tiene
  // principal propia o elegida, no solo si subió fotos suyas
  const productPhotos = images.filter((image) => image.status !== "failed");
  const activeVariants = product.variants.filter((variant) => variant.is_active);
  // F5: en un espejo, lo que manda la tienda se resuelve allá; la fila lo dice y su acción solo lleva a verlo.
  const locked = new Set(product.locked_fields ?? []);
  const governed = product.governed_by_connection_id !== null && product.governed_by_connection_id !== undefined;

  if (!product.is_active) {
    items.push({
      key: "inactive",
      title: "Está inactivo",
      detail: locked.has("status") ? "se activa en tu tienda conectada" : "tu agente no lo ofrece hasta que lo actives",
      tone: "warning",
      href: "#ficha",
      action: locked.has("status") ? "Ver el estado" : "Activar",
    });
  }

  if (productPhotos.length === 0) {
    items.push({
      key: "no_photos",
      title: "No tiene fotos",
      detail: locked.has("images") ? "súbelas en tu tienda conectada" : "tu agente no podrá enviarlo por WhatsApp",
      tone: "warning",
      href: "#fotos",
      action: locked.has("images") ? "Ver las fotos" : "Subir fotos",
    });
  } else {
    ready.push(`${productPhotos.length} ${plural(productPhotos.length, "foto", "fotos")}`);
  }

  if (product.kind === "product") {
    const out = activeVariants.filter((variant) => variant.stock?.available === false);
    if (activeVariants.length > 0 && out.length === activeVariants.length) {
      items.push({
        key: "out_of_stock",
        title: "Está agotado",
        detail: locked.has("stock") ? "el stock lo manda tu tienda conectada" : "tu agente responde que no hay",
        tone: "destructive",
        href: "#variantes",
        action: locked.has("stock") ? "Ver el stock" : "Ajustar el stock",
      });
    } else if (out.length > 0) {
      items.push({
        key: "out_of_stock",
        title: out.length === 1 ? `${variantName(out[0])} está agotada` : `${out.length} variantes agotadas`,
        detail: locked.has("stock") ? "el stock lo manda tu tienda · ofrece las demás" : "tu agente ofrece las demás",
        tone: "warning",
        href: "#variantes",
        action: locked.has("stock") ? "Ver el stock" : "Ajustar el stock",
      });
    } else if (activeVariants.length > 0) {
      ready.push(activeVariants.length === 1 ? "con stock" : `las ${activeVariants.length} variantes tienen stock`);
    }
  }

  const required = (productType?.attributes ?? []).filter(
    (attribute) => attribute.scope === "product" && attribute.is_required,
  );
  const filled = new Set(
    product.attribute_values.filter((value) => value.value !== null && value.value !== "").map((value) => value.code),
  );
  const missing = required.filter((attribute) => !filled.has(attribute.code));
  if (missing.length > 0) {
    const label = missing[0].label.toLowerCase();
    items.push({
      key: "missing_attributes",
      title: missing.length === 1 ? `Falta ${articleFor(label)} ${label}` : `Faltan ${missing.length} atributos requeridos`,
      detail:
        missing.length === 1
          ? "atributo requerido · tu agente lo usa para recomendar"
          : missing.map((attribute) => attribute.label).join(", "),
      tone: "warning",
      href: "#atributos",
      // Los atributos de un espejo no se editan (el servidor lo rechaza): solo se ven.
      action: governed
        ? "Ver los atributos"
        : missing.length === 1
          ? `Completar ${articleFor(label)} ${label}`
          : "Completar los atributos",
    });
  }

  if (productPhotos.length > 0 && activeVariants.length > 1) {
    const without = activeVariants.filter(
      (variant) => effectiveVariantPrimary(images, variant, product.primary_image_id).source === "product",
    );
    if (without.length > 0) {
      items.push({
        key: "variants_without_photos",
        title:
          without.length === 1 ? `${variantName(without[0])} no tiene foto propia` : `${without.length} variantes sin foto propia`,
        detail: locked.has("images") ? "se suben en tu tienda conectada" : "tu agente enviará las del producto",
        tone: "neutral",
        href: "#fotos",
        action: locked.has("images")
          ? "Ver las fotos"
          : without.length === 1
            ? `Elegir la foto de ${variantName(without[0])}`
            : "Elegir fotos por variante",
      });
    }
  }

  const enrichment = enrichmentDisplayState(product.enrichment);
  if (enrichment === "ready" || enrichment === "edited") {
    ready.push("búsqueda con IA lista");
  } else if (enrichment === "failed" || enrichment === "none") {
    items.push({
      key: "enrichment",
      title: "Sin búsqueda con IA",
      detail: enrichment === "failed" ? "no se pudo generar · usa la ficha mientras tanto" : "aún no se ha generado",
      tone: "neutral",
      href: "#busqueda-ia",
      action: enrichment === "failed" ? "Intentar de nuevo" : "Generar con IA",
    });
  }

  return { items, ready };
}

/** Artículo de un atributo en minúsculas («el tipo de piel», «la talla»). Heurística corta y sin sorpresas. */
function articleFor(label: string): "el" | "la" {
  const first = label.split(" ")[0] ?? "";
  return /(a|ión|dad|tud)$/.test(first) && !/^(día|mapa|tema|sistema|idioma|clima|problema)$/.test(first) ? "la" : "el";
}

export function readinessHeadline(readiness: ProductReadiness): string {
  const count = readiness.items.length;
  if (count === 0) return "Lista para que tu agente la venda";
  return count === 1 ? "Le falta una cosa a esta ficha" : `Le faltan ${count} cosas a esta ficha`;
}
