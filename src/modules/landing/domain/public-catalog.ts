/**
 * Catálogo público de precios, en TypeScript puro (Tanda A3 del plan de
 * alineación comercial 2026-09-05, D8).
 *
 * La landing dejó de tener cifras en el código: paquetes, tramos, módulos y la
 * promoción con su contador llegan de `GET /public/pricing` y aquí se
 * convierten en el modelo que pintan las tarjetas, el JSON-LD y el alta. Un
 * mismo número sale de un mismo sitio; si el catálogo no responde, el modelo
 * es `null` y la sección muestra «precios a consulta» en vez de una cifra
 * inventada.
 *
 * Dos ejes (D1): `precio = tarifa_paquete + tarifa_tramo`. El servidor guarda
 * CELDAS; aquí se reconstruye la tarifa de paquete como `celda − tramo` para
 * que el visitante pueda mover el tramo y ver las tres tarjetas recalcularse.
 */
import type { Schemas } from "@/core/api/types";

export type PublicPricingDto = Schemas["PublicPricingDto"];

/** Meses facturados en el anual: doce de servicio, once cobrados (D2). */
export const ANNUAL_PAID_MONTHS = 11;
export const MONTHS_PER_YEAR = 12;

export type CatalogVolume = {
  /** Código estable del tramo (`t2500`) o `max` para «a la medida». */
  id: string;
  label: string;
  conversations: number | null;
  /** Tarifa del tramo en pesos; `null` en «a la medida» o sin tarifa fijada. */
  feeCop: number | null;
};

/** Sentinela por encima del catálogo: sin cifra, a ventas. */
export const MAX_VOLUME_ID = "max";

export type CatalogPromotion = {
  code: string;
  name: string;
  /** Fracción: 0.4 = 40 %. */
  discount: number;
  rounding: "none" | "floor_900";
  scope: "packages" | "modules" | "all";
  slots: number | null;
  /** Cupos tomados a ojos del público: reservados a mano + reservadas + activas. */
  taken: number;
  startsAt: string;
  /** Instante EXCLUSIVO de cierre (ISO); `null` = sin fecha. */
  endsAt: string | null;
  indexation: "none" | "ipc_annual";
  indexationFirstYear: number | null;
  stacksWithAnnual: boolean;
};

export type PublicCatalog = {
  asOf: string;
  version: string;
  volumes: CatalogVolume[];
  defaultVolumeId: string;
  /** Tarifa de paquete por slug (`celda − tramo`), solo para paquetes con celdas de dos ejes. */
  packageFees: Record<string, number>;
  /** Precio mensual sin tramo (catálogo de un eje), por slug de paquete. */
  legacyPackageCop: Record<string, number>;
  /** Precio mensual por slug de módulo. */
  modulePrices: Record<string, number>;
  enterpriseFloorCop: number | null;
  promotion: CatalogPromotion | null;
};

const centsToCop = (cents: number): number => Math.round(cents / 100);

/**
 * Del contrato del API al modelo de la landing. Puro y total: cualquier
 * respuesta válida produce un catálogo, aunque sea uno sin celdas de dos ejes
 * (antes de la vigencia programada la landing sigue vendiendo el de un eje).
 */
export function catalogFromApi(dto: PublicPricingDto): PublicCatalog {
  const tierFee = new Map(dto.tiers.map((tier) => [tier.code, tier.fee_cents] as const));
  const volumes: CatalogVolume[] = dto.tiers.map((tier) => ({
    id: tier.code,
    label: tier.label,
    conversations: tier.conversations,
    feeCop: tier.fee_cents === null ? null : centsToCop(tier.fee_cents),
  }));
  const last = volumes[volumes.length - 1];
  volumes.push({
    id: MAX_VOLUME_ID,
    label: last ? `Más de ${last.label}` : "A la medida",
    conversations: null,
    feeCop: null,
  });

  const monthly = dto.prices.filter((price) => price.interval === "monthly");
  const packageFees: Record<string, number> = {};
  const legacyPackageCop: Record<string, number> = {};
  for (const pkg of dto.packages) {
    // La tarifa de paquete viene del servidor (billing_plan_fee) y solo cuenta
    // si el plan tiene celdas de tramo vigentes: sin ellas no hay dos ejes.
    const hasTierCells = monthly.some((price) => price.plan === pkg.public_slug && price.tier !== null);
    if (pkg.package_fee_cents !== null && hasTierCells) {
      packageFees[pkg.public_slug] = centsToCop(pkg.package_fee_cents);
    } else if (hasTierCells) {
      // Respaldo si el componente no viajó: celda − tramo sobre una celda vigente.
      const withTier = monthly.find(
        (price) =>
          price.plan === pkg.public_slug &&
          price.tier !== null &&
          (tierFee.get(price.tier) ?? null) !== null,
      );
      if (withTier && withTier.tier !== null) {
        packageFees[pkg.public_slug] =
          centsToCop(withTier.amount_cents) - centsToCop(tierFee.get(withTier.tier) as number);
      }
    }
    const legacy = monthly.find((price) => price.plan === pkg.public_slug && price.tier === null);
    if (legacy) legacyPackageCop[pkg.public_slug] = centsToCop(legacy.amount_cents);
  }

  const modulePrices: Record<string, number> = {};
  for (const mod of dto.modules) {
    const cell = monthly.find((price) => price.plan === mod.public_slug && price.tier === null);
    if (cell) modulePrices[mod.public_slug] = centsToCop(cell.amount_cents);
  }

  const enterprise = monthly.find((price) => price.plan === "enterprise" && price.tier === null);

  // El tramo por defecto es el más comprado, no el más barato: el segundo si existe.
  const priced = volumes.filter((volume) => volume.feeCop !== null);
  const defaultVolumeId = priced[1]?.id ?? priced[0]?.id ?? MAX_VOLUME_ID;

  return {
    asOf: dto.as_of,
    version: dto.version,
    volumes,
    defaultVolumeId,
    packageFees,
    legacyPackageCop,
    modulePrices,
    enterpriseFloorCop: enterprise ? centsToCop(enterprise.amount_cents) : null,
    promotion:
      dto.promotion === null
        ? null
        : {
            code: dto.promotion.code,
            name: dto.promotion.name,
            discount: dto.promotion.percent_bps / 10_000,
            rounding: dto.promotion.rounding,
            scope: dto.promotion.scope,
            slots: dto.promotion.slots,
            taken: dto.promotion.taken,
            startsAt: dto.promotion.starts_at,
            endsAt: dto.promotion.ends_at,
            indexation: dto.promotion.indexation_policy,
            indexationFirstYear: dto.promotion.indexation_first_year,
            stacksWithAnnual: dto.promotion.stacks_with_annual,
          },
  };
}

/* ───────────────────────────── volúmenes ───────────────────────────── */

export function volumeById(catalog: PublicCatalog, id: string): CatalogVolume {
  return (
    catalog.volumes.find((volume) => volume.id === id) ??
    catalog.volumes.find((volume) => volume.id === catalog.defaultVolumeId) ??
    catalog.volumes[0]
  );
}

export function isVolumeId(catalog: PublicCatalog | null, value: string): boolean {
  return catalog?.volumes.some((volume) => volume.id === value) ?? false;
}

/** ¿Hay eje de volumen publicado? Sin él la sección vende el catálogo de un eje. */
export function hasVolumeAxis(catalog: PublicCatalog): boolean {
  return (
    catalog.volumes.some((volume) => volume.feeCop !== null) &&
    Object.keys(catalog.packageFees).length > 0
  );
}

/* ───────────────────────────── precios ───────────────────────────── */

/**
 * Precio de LISTA mensual de un paquete a un tramo. `null` cuando no hay cifra
 * que dar: por encima del catálogo, sin tarifa de tramo, o paquete sin celda.
 * Si el paquete solo tiene precio de un eje (antes de la vigencia de dos
 * ejes), lo devuelve sea cual sea el tramo.
 */
export function planListCop(catalog: PublicCatalog, slug: string, volumeId: string): number | null {
  const fee = catalog.packageFees[slug];
  if (fee !== undefined) {
    const volume = volumeById(catalog, volumeId);
    return volume.feeCop === null ? null : fee + volume.feeCop;
  }
  return catalog.legacyPackageCop[slug] ?? null;
}

/**
 * Precio con descuento de promoción. `floor_900` redondea HACIA ABAJO al
 * «novecientos» inferior: todo el catálogo termina en .900 y redondear hacia
 * arriba entregaría un descuento MENOR al prometido. Misma regla que
 * `promotion_math.ts` del servidor: si divergen, el visitante ve un precio y
 * paga otro.
 */
export function discountedCop(listCop: number, promotion: CatalogPromotion): number {
  const discounted = listCop * (1 - promotion.discount);
  if (promotion.rounding === "none") return Math.round(discounted);
  return Math.max(900, Math.floor((discounted - 900) / 1000) * 1000 + 900);
}

/** ¿Sigue abierta? Fecha Y cupos, lo que ocurra primero. Con `now` inyectado. */
export function promotionOpen(catalog: PublicCatalog | null, now: Date): boolean {
  const promo = catalog?.promotion;
  if (!promo) return false;
  if (new Date(promo.startsAt).getTime() > now.getTime()) return false;
  if (promo.endsAt !== null && new Date(promo.endsAt).getTime() <= now.getTime()) return false;
  return promo.slots === null || promo.taken < promo.slots;
}

export function promotionAppliesTo(promotion: CatalogPromotion, kind: "packages" | "modules"): boolean {
  return promotion.scope === "all" || promotion.scope === kind;
}

/** Precio que ve hoy el visitante: el de promoción mientras esté abierta, el de lista después. */
export function planMonthlyCop(
  catalog: PublicCatalog,
  slug: string,
  volumeId: string,
  now: Date,
): number | null {
  const list = planListCop(catalog, slug, volumeId);
  if (list === null) return null;
  const promo = catalog.promotion;
  return promo && promotionOpen(catalog, now) && promotionAppliesTo(promo, "packages")
    ? discountedCop(list, promo)
    : list;
}

export function modulePriceCop(catalog: PublicCatalog, slug: string): number | null {
  return catalog.modulePrices[slug] ?? null;
}

export function annualTotalCop(monthlyCop: number): number {
  return monthlyCop * ANNUAL_PAID_MONTHS;
}

/* ───────────────────────────── promoción ───────────────────────────── */

export function promotionRemaining(promotion: CatalogPromotion): number | null {
  return promotion.slots === null ? null : Math.max(0, promotion.slots - promotion.taken);
}

/**
 * Último día INCLUIDO de la promoción en Bogotá, como `YYYY-MM-DD`. El API
 * manda el instante exclusivo de cierre (00:00 del día siguiente en Bogotá);
 * el contador y los textos hablan del día que se ve en el calendario.
 */
export function promotionLastDay(promotion: CatalogPromotion): string | null {
  if (promotion.endsAt === null) return null;
  const lastInstant = new Date(new Date(promotion.endsAt).getTime() - 1);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(lastInstant);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** «−40 %», derivado de la fracción para que titular y sello no puedan divergir. */
export function discountLabel(promotion: CatalogPromotion): string {
  return `−${Math.round(promotion.discount * 100)} %`;
}
