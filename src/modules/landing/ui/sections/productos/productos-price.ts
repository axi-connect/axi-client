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

/**
 * Cuánto menos cuesta Axi que un asesor, en un porcentaje entero y HACIA ABAJO
 * (nunca prometer un punto de más): con el asesor a $2.820.000 y Axi a
 * $155.900, 94 %. `share` es la fracción del costo del asesor que paga, para
 * dibujar las barras. `null` si no hay precio que comparar.
 */
export function savingsVsAdvisor(monthlyCop: number | null): { pct: number; share: number } | null {
  if (monthlyCop === null || monthlyCop <= 0 || monthlyCop >= PRICE.advisor.cop) return null;
  const share = monthlyCop / PRICE.advisor.cop;
  return { pct: Math.floor((1 - share) * 100), share };
}
