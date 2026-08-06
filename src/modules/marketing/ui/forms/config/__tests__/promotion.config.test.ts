import type { PromotionDTO } from "@/modules/marketing/domain/promotion";
import { PROMOTION_KIND_ORDER } from "@/modules/marketing/domain/enums";
import {
  defaultPromotionFormValues,
  promotionFormSchema,
  promotionToFormValues,
  toCreatePromotionDTO,
  type PromotionFormValues,
} from "../promotion.config";

function values(over: Partial<PromotionFormValues> = {}): PromotionFormValues {
  return { ...defaultPromotionFormValues, name: "Vuelve y ahorra", percent: 25, ...over };
}

describe("validación por tipo", () => {
  it("acepta el tipo con SU parámetro", () => {
    expect(promotionFormSchema.safeParse(values()).success).toBe(true);
    expect(
      promotionFormSchema.safeParse(
        values({ kind: "fixed_discount", percent: null, amount_cents: 1_500_000 }),
      ).success,
    ).toBe(true);
  });

  it("exige el parámetro que falta y lo señala en SU campo", () => {
    const result = promotionFormSchema.safeParse(values({ percent: null }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["percent"]);
    }
  });

  it("cada tipo pide su propio parámetro", () => {
    const missing: Record<(typeof PROMOTION_KIND_ORDER)[number], string> = {
      percent_discount: "percent",
      fixed_discount: "amount_cents",
      gift_product: "gift",
      free_shipping: "shipping_value_cents",
    };
    for (const kind of PROMOTION_KIND_ORDER) {
      const result = promotionFormSchema.safeParse(values({ kind, percent: null }));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.map((i) => i.path[0])).toContain(missing[kind]);
      }
    }
  });

  it("rechaza un código compartido demasiado corto pero permite dejarlo vacío", () => {
    expect(promotionFormSchema.safeParse(values({ shared_code: "AB" })).success).toBe(false);
    expect(promotionFormSchema.safeParse(values({ shared_code: "" })).success).toBe(true);
  });

  it("rechaza una vigencia que termina antes de empezar", () => {
    const result = promotionFormSchema.safeParse(
      values({ starts_at: "2026-09-01", ends_at: "2026-08-01" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "ends_at")).toBe(true);
    }
  });
});

describe("toCreatePromotionDTO", () => {
  it("manda SOLO el parámetro del tipo elegido y anula el resto", () => {
    // El backend rechaza con 422 si sobra cualquier otro: no basta con ocultarlo
    // en la UI, hay que limpiarlo al enviar.
    const dto = toCreatePromotionDTO(
      values({
        kind: "free_shipping",
        percent: 25,
        amount_cents: 999,
        shipping_value_cents: 1_200_000,
        gift: { variant_id: "v1", label: "Camiseta" },
      }),
    );
    expect(dto).toMatchObject({
      kind: "free_shipping",
      shipping_value_cents: 1_200_000,
      percent: null,
      amount_cents: null,
      gift_variant_id: null,
    });
  });

  it("normaliza el código compartido a mayúsculas y el vacío a null", () => {
    expect(toCreatePromotionDTO(values({ shared_code: " vuelve10 " })).shared_code).toBe(
      "VUELVE10",
    );
    expect(toCreatePromotionDTO(values({ shared_code: "  " })).shared_code).toBeNull();
  });

  it("convierte las fechas del input a ISO y el vacío a null", () => {
    const dto = toCreatePromotionDTO(values({ starts_at: "2026-08-10", ends_at: "" }));
    expect(dto.starts_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(dto.ends_at).toBeNull();
  });

  it("nace apagada: encenderla es una decisión aparte", () => {
    expect(toCreatePromotionDTO(values()).enabled).toBe(false);
  });

  it("recorta el nombre", () => {
    expect(toCreatePromotionDTO(values({ name: "  Promo  " })).name).toBe("Promo");
  });
});

describe("promotionToFormValues", () => {
  const promotion = {
    name: "Regalo",
    kind: "gift_product",
    percent: null,
    amount_cents: null,
    gift_variant_id: "v-9",
    shipping_value_cents: null,
    min_order_cents: null,
    shared_code: null,
    validity_hours: 24,
    starts_at: "2026-07-01T00:00:00.000Z",
    ends_at: null,
    max_redemptions_total: null,
    max_redemptions_per_contact: 1,
    enabled: true,
  } as PromotionDTO;

  it("no muestra el uuid del regalo cuando no hay nombre resuelto", () => {
    const form = promotionToFormValues(promotion, null);
    expect(form.gift?.variant_id).toBe("v-9");
    expect(form.gift?.label).not.toContain("v-9");
  });

  it("usa el nombre resuelto cuando lo hay", () => {
    expect(promotionToFormValues(promotion, "Camiseta · Talla M").gift?.label).toBe(
      "Camiseta · Talla M",
    );
  });

  it("pasa las fechas a formato de input y el código null a cadena vacía", () => {
    const form = promotionToFormValues(promotion, null);
    expect(form.starts_at).toBe("2026-07-01");
    expect(form.ends_at).toBe("");
    expect(form.shared_code).toBe("");
  });

  it("el resultado de editar vuelve a validar", () => {
    expect(promotionFormSchema.safeParse(promotionToFormValues(promotion, "X")).success).toBe(true);
  });
});
