import {
  describeDelivery,
  describeShippingLine,
  externalChargeDelta,
  type OrderDTO,
} from "@/modules/orders/domain/order";

const delivery = (over: Partial<OrderDTO["delivery"]>): OrderDTO["delivery"] => ({
  method: null,
  address: null,
  pickup_branch_label: null,
  pickup_branch_address: null,
  ...over,
});

describe("total cobrado vs local", () => {
  it("coincide con ±1 y difiere con el signo de lo que cobró el proveedor", () => {
    expect(externalChargeDelta({ total_cents: 29_984_000, external_total_cents: null })).toBeNull();
    expect(externalChargeDelta({ total_cents: 29_984_000, external_total_cents: 29_984_001 })).toEqual({
      aligned: true,
      diff_cents: 1,
    });
    expect(externalChargeDelta({ total_cents: 10_790_000, external_total_cents: 11_430_000 })).toEqual({
      aligned: false,
      diff_cents: 640_000,
    });
  });
});

describe("entrega", () => {
  it("domicilio: quién, dónde y ciudad · departamento", () => {
    expect(
      describeDelivery({
        delivery: delivery({
          method: "shipping",
          address: {
            address1: "Cra 43A # 5-15",
            address2: "apto 802",
            city: "Medellín",
            province_code: "CO-ANT",
            country_code: "CO",
            name: "Laura Gómez",
            phone: "3004128877",
          },
        }),
      }),
    ).toEqual({
      title: "Envío a domicilio",
      lines: ["Laura Gómez · 3004128877", "Cra 43A # 5-15, apto 802", "Medellín · ANT"],
    });
  });

  it("recogida, dirección anonimizada y sin entrega", () => {
    expect(
      describeDelivery({
        delivery: delivery({
          method: "pickup",
          pickup_branch_label: "Chapinero",
          pickup_branch_address: "Cra 13 # 55-10, Bogotá",
        }),
      }),
    ).toEqual({ title: "Recoge en tienda", lines: ["Chapinero", "Cra 13 # 55-10, Bogotá"] });
    expect(
      describeDelivery({
        delivery: delivery({
          method: "shipping",
          address: { redacted_at: "2026-09-07T00:00:00Z" } as unknown as NonNullable<
            OrderDTO["delivery"]["address"]
          >,
        }),
      })?.lines,
    ).toEqual(["Dirección anonimizada a petición del cliente"]);
    expect(describeDelivery({ delivery: delivery({}) })).toBeNull();
  });

  it("la fila de envío nombra tarifa y ciudad", () => {
    expect(
      describeShippingLine({
        shipping_label: "Envío estándar",
        delivery: delivery({
          method: "shipping",
          address: { address1: "x", city: "Medellín", province_code: "CO-ANT", country_code: "CO" },
        }),
      }),
    ).toBe("Envío estándar · Medellín");
    expect(describeShippingLine({ shipping_label: null, delivery: delivery({}) })).toBeNull();
  });
});
