import {
  planListCop,
  planMonthlyCop,
  promotionAppliesTo,
  promotionOpen,
  type PublicCatalog,
} from "@/modules/landing/domain/public-catalog";
import { PRICE } from "@/modules/landing/ui/content/productos.content";

export interface EsencialPrice {
  /** Lo que paga hoy: el de fundador mientras la promoción siga abierta. */
  monthlyCop: number;
  /** El de lista, solo cuando difiere del de hoy (se pinta tachado). */
  listCop: number | null;
  /** La etiqueta del tramo tal como la publica el catálogo («1.000»). */
  volumeLabel: string;
}

/**
 * El precio de Esencial que enseña `/productos`, del catálogo público (plan
 * productos_tinta §4.6). El tramo se busca por conversaciones, no por código.
 * `null` cuando no hay nada honesto que mostrar: sin catálogo, sin tramo o sin
 * celda. Nunca una cifra de respaldo.
 */
export function esencialPrice(catalog: PublicCatalog | null, now: Date): EsencialPrice | null {
  if (!catalog) return null;
  const volume = catalog.volumes.find((v) => v.conversations === PRICE.conversations);
  if (!volume) return null;
  const list = planListCop(catalog, PRICE.planSlug, volume.id);
  const monthly = planMonthlyCop(catalog, PRICE.planSlug, volume.id, now);
  if (list === null || monthly === null) return null;
  const promo = catalog.promotion;
  const founder = promo !== null && promotionOpen(catalog, now) && promotionAppliesTo(promo, "packages") && monthly < list;
  return { monthlyCop: monthly, listCop: founder ? list : null, volumeLabel: volume.label };
}
