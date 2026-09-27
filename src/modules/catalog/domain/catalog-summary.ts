import type { Schemas } from "@/core/api/types";

/**
 * El resumen del catálogo para el bento y la isla «Lo próximo» del listado
 * (catálogo premium F2, sobre el F1 del servidor). TS puro.
 */
export type CatalogSummaryDTO = Schemas["CatalogSummaryDto"];
export type EnrichmentStatsDTO = Schemas["EnrichmentStatsDto"];
export type ClassificationStatsDTO = Schemas["ClassificationStatsDto"];

export type CatalogNextUpTone = "destructive" | "warning" | "neutral";

export type CatalogNextUpItem = {
  key: "without_images" | "out_of_stock" | "uncategorized" | "enrichment_failed";
  count: number;
  title: string;
  detail: string;
  tone: CatalogNextUpTone;
  /** El listado filtrado con exactamente esos productos (mismo criterio que la cifra, servidor F1). */
  href: string;
  action: string;
};

const LIST = "/catalog/products";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/**
 * Lo que impide vender, en orden de lo que más le cuesta al agente: un
 * producto sin fotos no se puede enseñar por WhatsApp; uno agotado se ofrece y
 * se retira; sin categoría la búsqueda lo encuentra peor; sin búsqueda con IA
 * el agente usa la ficha tal cual (lo menos grave: sigue vendiéndose).
 */
export function catalogNextUpItems(summary: CatalogSummaryDTO): CatalogNextUpItem[] {
  const { without_images, out_of_stock, uncategorized, enrichment_failed } = summary.attention;
  const items: CatalogNextUpItem[] = [
    {
      key: "without_images",
      count: without_images,
      title: plural(without_images, "no tiene fotos", "no tienen fotos"),
      detail: "tu agente no podrá enviarlos por WhatsApp",
      tone: "warning",
      href: `${LIST}?has_images=false`,
      action: without_images === 1 ? "Ver el que no tiene fotos" : `Ver los ${without_images} sin fotos`,
    },
    {
      key: "out_of_stock",
      count: out_of_stock,
      title: plural(out_of_stock, "está agotado", "están agotados"),
      detail: "tu agente responde que no hay",
      tone: "destructive",
      href: `${LIST}?stock_state=out`,
      action: out_of_stock === 1 ? "Ver el agotado" : "Ver los agotados",
    },
    {
      key: "uncategorized",
      count: uncategorized,
      title: plural(uncategorized, "no tiene categoría", "no tienen categoría"),
      detail: "la clasificación no encontró una que aplique",
      tone: "warning",
      href: `${LIST}?uncategorized=true`,
      action: "Ver los sin categoría",
    },
    {
      key: "enrichment_failed",
      count: enrichment_failed,
      title: "sin búsqueda con IA",
      detail: "no se pudo generar · usa la ficha mientras tanto",
      tone: "neutral",
      href: `${LIST}?enrichment_status=failed`,
      action: "Ver cuáles",
    },
  ];
  return items.filter((item) => item.count > 0);
}

const productos = (count: number) => `${count.toLocaleString("es-CO")} ${plural(count, "producto", "productos")}`;

/** El titular de la isla: lo que dice la fila más grave, en una frase. */
export function catalogNextUpHeadline(items: CatalogNextUpItem[]): string {
  const top = items[0];
  if (top === undefined) return "Todo listo para vender";
  switch (top.key) {
    case "without_images":
      return `${productos(top.count)} que tu agente no puede mostrar`;
    case "out_of_stock":
      return `${productos(top.count)} ${plural(top.count, "agotado", "agotados")}`;
    case "uncategorized":
      return `${productos(top.count)} sin categoría`;
    case "enrichment_failed":
      return `${productos(top.count)} sin búsqueda con IA`;
  }
}

/** Ancho útil de una barra de progreso (0–100), sin porcentajes negativos ni pasarse. */
export function share(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
}

/**
 * Nombre del tipo de negocio con el que la plataforma siembra la taxonomía
 * (`enrichment/stats.vertical`). Espejo literal de los `label` de
 * `enrichment_vertical_schemas.ts` del servidor: no se inventan nombres.
 */
export const VERTICAL_LABELS: Record<EnrichmentStatsDTO["vertical"], string> = {
  fashion: "Moda y accesorios",
  food: "Restaurantes y comida",
  beauty: "Salud y belleza",
  home: "Hogar y decoración",
  tech: "Tecnología",
  generic: "Genérico",
};
