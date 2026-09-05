import {
  ANNUAL_PAID_MONTHS,
  MONTHS_PER_YEAR,
  annualTotalCop,
  discountedCop,
  hasVolumeAxis,
  isVolumeId,
  modulePriceCop,
  planListCop,
  planMonthlyCop,
  promotionLastDay,
  promotionOpen,
  promotionRemaining,
  volumeById,
} from "../public-catalog";
import {
  FIXTURE_CATALOG,
  FIXTURE_CATALOG_LEGACY,
  FIXTURE_CATALOG_NO_PROMO,
  FIXTURE_CATALOG_SOLD_OUT,
  FIXTURE_NOW,
} from "../testing/catalog.fixture";

const PRICED = FIXTURE_CATALOG.volumes.filter((volume) => volume.feeCop !== null);

describe("catalogFromApi", () => {
  it("reconstruye la tarifa de paquete como celda − tramo, igual para todos los tramos", () => {
    expect(FIXTURE_CATALOG.packageFees).toEqual({ esencial: 90_000, crecimiento: 200_000, escala: 400_000 });
    for (const volume of PRICED) {
      expect(planListCop(FIXTURE_CATALOG, "escala", volume.id)).toBe(400_000 + (volume.feeCop as number));
    }
  });

  it("añade el tramo «a la medida» sin cifra al final de la escalera", () => {
    const last = FIXTURE_CATALOG.volumes[FIXTURE_CATALOG.volumes.length - 1];
    expect(last).toMatchObject({ id: "max", label: "Más de 25.000", feeCop: null, conversations: null });
    expect(planListCop(FIXTURE_CATALOG, "escala", "max")).toBeNull();
  });

  it("abre por el tramo más comprado, no por el más barato", () => {
    expect(FIXTURE_CATALOG.defaultVolumeId).toBe("t1000");
    expect(isVolumeId(FIXTURE_CATALOG, "t2500")).toBe(true);
    expect(isVolumeId(FIXTURE_CATALOG, "9x9")).toBe(false);
    expect(isVolumeId(null, "t2500")).toBe(false);
  });

  it("lee módulos, piso de Enterprise y promoción con su contador", () => {
    expect(modulePriceCop(FIXTURE_CATALOG, "calls")).toBe(289_900);
    expect(modulePriceCop(FIXTURE_CATALOG, "inventado")).toBeNull();
    expect(FIXTURE_CATALOG.enterpriseFloorCop).toBe(2_900_000);
    expect(FIXTURE_CATALOG.promotion).toMatchObject({ discount: 0.4, slots: 20, taken: 8 });
  });

  it("antes de la vigencia de dos ejes vende el catálogo de un eje sin eje de volumen", () => {
    expect(hasVolumeAxis(FIXTURE_CATALOG_LEGACY)).toBe(false);
    expect(hasVolumeAxis(FIXTURE_CATALOG)).toBe(true);
    // El precio no depende del tramo: no hay tramos.
    expect(planListCop(FIXTURE_CATALOG_LEGACY, "crecimiento", "max")).toBe(449_900);
  });
});

describe("precio con promoción", () => {
  it("aplica el descuento al .900 inferior y nunca entrega menos descuento del prometido", () => {
    const promo = FIXTURE_CATALOG.promotion!;
    expect(discountedCop(189_900, promo)).toBe(113_900);
    expect(discountedCop(449_900, promo)).toBe(269_900);
    expect(discountedCop(2_899_900, promo)).toBe(1_739_900);
    for (const volume of PRICED) {
      const list = planListCop(FIXTURE_CATALOG, "esencial", volume.id) as number;
      const price = discountedCop(list, promo);
      expect(price % 1_000).toBe(900);
      expect(price).toBeLessThanOrEqual(list * (1 - promo.discount));
      expect(price).toBeLessThan(list);
    }
  });

  it("el precio que ve el visitante es el de promoción mientras esté abierta y el de lista después", () => {
    expect(planMonthlyCop(FIXTURE_CATALOG, "esencial", "t500", FIXTURE_NOW)).toBe(113_900);
    expect(planMonthlyCop(FIXTURE_CATALOG, "esencial", "t500", new Date("2027-02-01T00:00:00Z"))).toBe(189_900);
    expect(planMonthlyCop(FIXTURE_CATALOG_SOLD_OUT, "esencial", "t500", FIXTURE_NOW)).toBe(189_900);
    expect(planMonthlyCop(FIXTURE_CATALOG_NO_PROMO, "esencial", "t500", FIXTURE_NOW)).toBe(189_900);
  });

  it("la promoción cierra por cupos O por fecha, lo que ocurra primero (fin exclusivo)", () => {
    expect(promotionOpen(FIXTURE_CATALOG, FIXTURE_NOW)).toBe(true);
    expect(promotionOpen(FIXTURE_CATALOG_SOLD_OUT, FIXTURE_NOW)).toBe(false);
    expect(promotionOpen(FIXTURE_CATALOG, new Date("2027-01-01T04:59:59Z"))).toBe(true);
    expect(promotionOpen(FIXTURE_CATALOG, new Date("2027-01-01T05:00:00Z"))).toBe(false);
    expect(promotionOpen(null, FIXTURE_NOW)).toBe(false);
    expect(promotionRemaining(FIXTURE_CATALOG.promotion!)).toBe(12);
    expect(promotionRemaining(FIXTURE_CATALOG_SOLD_OUT.promotion!)).toBe(0);
  });

  it("el último día incluido se calcula en Bogotá: el cierre a las 05:00Z es el 31 de diciembre", () => {
    expect(promotionLastDay(FIXTURE_CATALOG.promotion!)).toBe("2026-12-31");
  });
});

describe("periodicidad", () => {
  it("el anual factura once meses y regala uno", () => {
    expect(ANNUAL_PAID_MONTHS).toBe(11);
    expect(MONTHS_PER_YEAR - ANNUAL_PAID_MONTHS).toBe(1);
    expect(annualTotalCop(113_900)).toBe(1_252_900);
  });

  it("un tramo desconocido cae al tramo por defecto en vez de romper la tarjeta", () => {
    expect(volumeById(FIXTURE_CATALOG, "inventado").id).toBe(FIXTURE_CATALOG.defaultVolumeId);
  });
});
