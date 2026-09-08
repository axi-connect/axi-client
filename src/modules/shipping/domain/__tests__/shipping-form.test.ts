import {
  rateToFormValues,
  toCreateRateDTO,
  toCreateZoneDTO,
  validateRate,
  validateZone,
} from "@/modules/shipping/domain/shipping-form";

describe("formulario de zona", () => {
  it("exige nombre y país de dos letras; fuera de Colombia la zona es todo el país", () => {
    expect(validateZone({ name: "", province_codes: [], country_code: "CO" }).name).toBeDefined();
    expect(validateZone({ name: "Eje", province_codes: [], country_code: "Colombia" }).country_code).toBeDefined();
    expect(validateZone({ name: "Eje Cafetero", province_codes: ["CO-CAL"], country_code: "co" })).toEqual({});
    expect(
      toCreateZoneDTO({ name: " Internacional ", province_codes: ["CO-CAL"], country_code: "us" }),
    ).toEqual({ name: "Internacional", country_code: "US", province_codes: [] });
  });
});

describe("formulario de tarifa", () => {
  it("convierte pesos a centavos, acepta 0 como gratis y rechaza un rango invertido", () => {
    expect(
      toCreateRateDTO({ name: "Envío estándar", price: "12.000", min_order: "", max_order: "199.999" }),
    ).toEqual({ name: "Envío estándar", price_cents: 1_200_000, min_order_cents: null, max_order_cents: 19_999_900 });
    expect(validateRate({ name: "Gratis", price: "0", min_order: "200.000", max_order: "" })).toEqual({});
    expect(validateRate({ name: "X", price: "", min_order: "", max_order: "" }).price).toBeDefined();
    expect(
      validateRate({ name: "X", price: "5.000", min_order: "200.000", max_order: "100.000" }).max_order,
    ).toMatch(/mayor o igual/);
    expect(validateRate({ name: "X", price: "abc", min_order: "", max_order: "" }).price).toBeDefined();
  });

  it("vuelve del DTO al formulario en pesos legibles", () => {
    expect(
      rateToFormValues({
        id: "r",
        name: "Envío estándar",
        kind: "flat",
        price_cents: 1_200_000,
        min_order_cents: null,
        max_order_cents: 19_999_900,
        position: 0,
        is_active: true,
        governed_by_connection_id: null,
      }),
    ).toEqual({ name: "Envío estándar", price: "12.000", min_order: "", max_order: "199.999" });
  });
});
