/**
 * La lámina de planes de `/overview` (decisión D4 del plan): las cifras salen del catálogo público en vivo
 * (`GET /public/pricing`, el mismo cargador de la landing), nunca escritas aquí. Así un enlace compartido no queda
 * con un precio viejo y la presentación dice lo mismo que /precios.
 */
import {
  discountLabel,
  planListCop,
  planMonthlyCop,
  promotionOpen,
  volumeById,
  type PublicCatalog,
} from "@/modules/landing/public";

export const PLAN_SLUGS = ["esencial", "crecimiento", "escala"] as const;
export type PlanSlug = (typeof PLAN_SLUGS)[number];

/** El copy de cada tarjeta; la cifra la pone el catálogo. Crecimiento es el ancla (método comercial 06 §4). */
const PLAN_COPY: Readonly<Record<PlanSlug, { name: string; line: string }>> = {
  esencial: { name: "Esencial", line: "El negocio que ya vende por chat y quiere ordenarlo y medirlo." },
  crecimiento: { name: "Crecimiento", line: "El negocio que ya escala y necesita captación, llamadas y medición." },
  escala: { name: "Escala", line: "Operación con varios equipos y volumen alto de conversación." },
};
export const ANCHOR_PLAN: PlanSlug = "crecimiento";

export type PlanCard = {
  readonly slug: PlanSlug;
  readonly name: string;
  readonly line: string;
  /** Lo que paga hoy (con la promoción si está abierta). */
  readonly monthlyCop: number;
  /** Precio de lista, solo si es distinto del de hoy (para tacharlo). */
  readonly listCop: number | null;
  readonly anchor: boolean;
};

export type PlansView = {
  readonly cards: readonly PlanCard[];
  /** «1.000 conversaciones», el tramo por defecto del catálogo. */
  readonly volumeLabel: string | null;
  /** «−40 % de fundador» o «−25 % Black Friday» mientras la promoción esté abierta. */
  readonly promotion: string | null;
  /** Fecha del catálogo (ISO), para el «precio en vivo al …». */
  readonly asOf: string;
};

/** `null` si el catálogo no responde o no tiene los tres planes: la lámina dice «precios a consulta». */
export function plansFromCatalog(catalog: PublicCatalog | null, now: Date): PlansView | null {
  if (!catalog) return null;
  const volumeId = catalog.defaultVolumeId;
  const open = promotionOpen(catalog, now);
  const cards: PlanCard[] = [];
  for (const slug of PLAN_SLUGS) {
    const monthly = planMonthlyCop(catalog, slug, volumeId, now);
    const list = planListCop(catalog, slug, volumeId);
    if (monthly === null || list === null) return null;
    cards.push({ slug, ...PLAN_COPY[slug], monthlyCop: monthly, listCop: list !== monthly ? list : null, anchor: slug === ANCHOR_PLAN });
  }
  const volume = catalog.volumes.length ? volumeById(catalog, volumeId) : null;
  return {
    cards,
    volumeLabel: volume?.conversations ? `${volume.label} conversaciones` : null,
    promotion:
      open && catalog.promotion
        ? `${discountLabel(catalog.promotion)} ${catalog.promotion.slots === null ? catalog.promotion.name : "de fundador"}`
        : null,
    asOf: catalog.asOf,
  };
}
