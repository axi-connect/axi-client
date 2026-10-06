import { FIXTURE_CATALOG, FIXTURE_CATALOG_NO_PROMO } from "@/modules/landing/domain/testing/catalog.fixture";
import { catalogFromApi } from "@/modules/landing/domain/public-catalog";
import { FIXTURE_PRICING_DTO } from "@/modules/landing/domain/testing/catalog.fixture";
import { esencialPrice } from "../productos-price";

/** Esencial a 1.000 en el fixture: paquete 90.000 + tramo 169.900. */
const LIST = 90_000 + 169_900;
const AFTER_ALL = new Date("2099-01-01T00:00:00Z");

describe("esencialPrice — el precio de /productos sale del catálogo", () => {
  it("sin promoción: el de lista, sin tachado, con la etiqueta del tramo del catálogo", () => {
    expect(esencialPrice(FIXTURE_CATALOG_NO_PROMO, AFTER_ALL)).toEqual({ monthlyCop: LIST, listCop: null, volumeLabel: "1.000" });
  });

  it("con la promoción de fundador abierta: el de hoy por debajo y el de lista para tachar", () => {
    const promo = FIXTURE_CATALOG.promotion!;
    const open = new Date(new Date(promo.startsAt).getTime() + 1000);
    const price = esencialPrice(FIXTURE_CATALOG, open);
    expect(price?.listCop).toBe(LIST);
    expect(price!.monthlyCop).toBeLessThan(LIST);
  });

  it("si el catálogo cambia el precio, la página cambia con él (no hay cifra en el código)", () => {
    const dto = {
      ...FIXTURE_PRICING_DTO,
      promotion: null,
      tiers: FIXTURE_PRICING_DTO.tiers.map((t) => (t.conversations === 1000 ? { ...t, fee_cents: 200_000 * 100 } : t)),
    };
    expect(esencialPrice(catalogFromApi(dto), AFTER_ALL)?.monthlyCop).toBe(90_000 + 200_000);
  });

  it("sin catálogo o sin el tramo de 1.000 no inventa nada", () => {
    expect(esencialPrice(null, AFTER_ALL)).toBeNull();
    const sinTramo = catalogFromApi({ ...FIXTURE_PRICING_DTO, tiers: FIXTURE_PRICING_DTO.tiers.filter((t) => t.conversations !== 1000) });
    expect(esencialPrice(sinTramo, AFTER_ALL)).toBeNull();
  });
});
