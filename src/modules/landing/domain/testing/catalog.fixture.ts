import { catalogFromApi, type PublicPricingDto } from "../public-catalog";

/**
 * Catálogo de ejemplo con la forma EXACTA del API (`GET /public/pricing`),
 * con los componentes de la casa (G7): paquete en millares, tramo en .900.
 * Los tests de la landing y del alta se derivan de aquí, no de constantes en
 * el código de producción — que ya no las tiene.
 */
const PACKAGE_FEES = { esencial: 90_000, crecimiento: 200_000, escala: 400_000 } as const;
const TIERS = [
  { code: "t500", conversations: 500, label: "500", fee: 99_900 },
  { code: "t1000", conversations: 1_000, label: "1.000", fee: 169_900 },
  { code: "t2500", conversations: 2_500, label: "2.500", fee: 359_900 },
  { code: "t5000", conversations: 5_000, label: "5.000", fee: 649_900 },
  { code: "t10000", conversations: 10_000, label: "10.000", fee: 1_149_900 },
  { code: "t25000", conversations: 25_000, label: "25.000", fee: 2_499_900 },
] as const;
const MODULES = { calls: 289_900, leads: 169_900, crm: 129_900, scheduling: 89_900 } as const;

const plan = (slug: string, name: string, packageFeeCop: number | null = null) => ({
  public_slug: slug,
  name,
  description: null,
  package_fee_cents: packageFeeCop === null ? null : packageFeeCop * 100,
  capabilities: ["core"],
  commercial_units: [],
});

export const FIXTURE_PRICING_DTO: PublicPricingDto = {
  as_of: "2026-09-20T12:00:00.000Z",
  currency: "COP",
  version: "fixture-v1",
  // Tanda B: el servidor publica el tramo por defecto (el mismo que deriva `catalogFromApi`) y la última promo cerrada.
  default_tier: "t1000",
  promotion_closed: null,
  tiers: TIERS.map((tier) => ({
    code: tier.code,
    conversations: tier.conversations,
    label: tier.label,
    fee_cents: tier.fee * 100,
  })),
  packages: [
    plan("esencial", "Esencial", PACKAGE_FEES.esencial),
    plan("crecimiento", "Crecimiento", PACKAGE_FEES.crecimiento),
    plan("escala", "Escala", PACKAGE_FEES.escala),
    plan("enterprise", "Enterprise"),
  ],
  modules: [
    plan("calls", "Llamadas con IA"),
    plan("leads", "Captación de leads"),
    plan("crm", "CRM con IA"),
    plan("scheduling", "Agenda y reservas"),
  ],
  prices: [
    ...Object.entries(PACKAGE_FEES).flatMap(([slug, fee]) =>
      TIERS.flatMap((tier) => [
        { plan: slug, tier: tier.code, interval: "monthly" as const, amount_cents: (fee + tier.fee) * 100, currency: "COP" },
        { plan: slug, tier: tier.code, interval: "annual" as const, amount_cents: (fee + tier.fee) * 11 * 100, currency: "COP" },
      ]),
    ),
    ...Object.entries(MODULES).map(([slug, cop]) => ({
      plan: slug,
      tier: null,
      interval: "monthly" as const,
      amount_cents: cop * 100,
      currency: "COP",
    })),
    { plan: "enterprise", tier: null, interval: "monthly", amount_cents: 2_900_000 * 100, currency: "COP" },
  ],
  promotion: {
    code: "founders_2026",
    name: "Programa Fundadores",
    percent_bps: 4_000,
    rounding: "floor_900",
    scope: "all",
    slots: 20,
    taken: 8,
    starts_at: "2026-08-04T05:00:00.000Z",
    ends_at: "2027-01-01T05:00:00.000Z",
    stacks_with_annual: true,
    indexation_policy: "ipc_annual",
    indexation_first_year: 2028,
  },
};

export const FIXTURE_CATALOG = catalogFromApi(FIXTURE_PRICING_DTO);

/** El mismo catálogo con la promoción agotada. */
export const FIXTURE_CATALOG_SOLD_OUT = catalogFromApi({
  ...FIXTURE_PRICING_DTO,
  promotion: { ...FIXTURE_PRICING_DTO.promotion!, taken: 20 },
});

/** Sin promoción abierta. */
export const FIXTURE_CATALOG_NO_PROMO = catalogFromApi({ ...FIXTURE_PRICING_DTO, promotion: null });

/** Antes de la vigencia de dos ejes: solo filas legado de un eje. */
export const FIXTURE_CATALOG_LEGACY = catalogFromApi({
  ...FIXTURE_PRICING_DTO,
  tiers: [],
  prices: [
    { plan: "esencial", tier: null, interval: "monthly", amount_cents: 189_900 * 100, currency: "COP" },
    { plan: "crecimiento", tier: null, interval: "monthly", amount_cents: 449_900 * 100, currency: "COP" },
    { plan: "escala", tier: null, interval: "monthly", amount_cents: 899_900 * 100, currency: "COP" },
    ...FIXTURE_PRICING_DTO.prices.filter((price) => price.tier === null),
  ],
});

/** Reloj congelado dentro de la promoción: los tests no caducan solos el 1 de enero. */
export const FIXTURE_NOW = new Date("2026-09-20T12:00:00.000Z");
