import type { AutomationDTO } from "@/modules/marketing/domain/automation";
import {
  automationFormSchema,
  automationToFormValues,
  defaultAutomationFormValues,
  NO_PROMOTION,
  toCreateAutomationDTO,
  toUpdateAutomationDTO,
  type AutomationFormValues,
} from "../automation.config";

function values(over: Partial<AutomationFormValues> = {}): AutomationFormValues {
  return {
    ...defaultAutomationFormValues("cart_abandoned"),
    name: "Carrito con cupón",
    message_template: "Hola {{first_name}}, dejaste {{product}} en el carrito",
    ...over,
  };
}

describe("validación", () => {
  it("acepta una regla mínima válida", () => {
    expect(automationFormSchema.safeParse(values()).success).toBe(true);
  });

  it("rechaza una demora por debajo del barrido de 5 minutos", () => {
    const result = automationFormSchema.safeParse(values({ delay_minutes: 2 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("5 minutos");
    }
  });

  it("rechaza variables que el backend no conoce, señalando el mensaje", () => {
    const result = automationFormSchema.safeParse(
      values({ message_template: "Hola {{first_name}} y {{inventada}}" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "message_template");
      expect(issue?.message).toContain("{{inventada}}");
    }
  });

  it("rechaza un rango de score cruzado", () => {
    const result = automationFormSchema.safeParse(values({ min_score: 80, max_score: 20 }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "max_score")).toBe(true);
    }
  });

  it("acepta un rango de score abierto por un extremo", () => {
    expect(automationFormSchema.safeParse(values({ min_score: 50, max_score: null })).success).toBe(
      true,
    );
  });
});

describe("toCreateAutomationDTO", () => {
  it("nace SIEMPRE apagada", () => {
    expect(toCreateAutomationDTO(values({})).enabled).toBe(false);
  });

  it("no manda condiciones vacías: el backend valida con .strict()", () => {
    expect(toCreateAutomationDTO(values()).conditions).toEqual({});
  });

  it("un booleano en false no es una condición, es no filtrar", () => {
    expect(toCreateAutomationDTO(values({ has_active_cart: false })).conditions).toEqual({});
    expect(toCreateAutomationDTO(values({ has_active_cart: true })).conditions).toEqual({
      has_active_cart: true,
    });
  });

  it("include_pending solo viaja en cart_abandoned", () => {
    expect(
      toCreateAutomationDTO(values({ include_pending: true })).conditions,
    ).toEqual({ include_pending: true });
    expect(
      toCreateAutomationDTO(
        values({ trigger_type: "conversation_inactive", include_pending: true }),
      ).conditions,
    ).toEqual({});
  });

  it("traduce «sin promoción» a null", () => {
    expect(toCreateAutomationDTO(values({ promotion_id: NO_PROMOTION })).promotion_id).toBeNull();
    expect(toCreateAutomationDTO(values({ promotion_id: "p1" })).promotion_id).toBe("p1");
  });

  it("la plantilla de Meta solo viaja en el disparador que la necesita", () => {
    // Un texto heredado de otra edición no debe colarse en un disparador que
    // escribe dentro de la ventana de 24 h.
    expect(
      toCreateAutomationDTO(values({ hsm_template_name: "recuperacion_deal" }))
        .hsm_template_name,
    ).toBeNull();
    expect(
      toCreateAutomationDTO(
        values({ trigger_type: "deal_stalled", hsm_template_name: "recuperacion_deal" }),
      ).hsm_template_name,
    ).toBe("recuperacion_deal");
  });

  it("recorta el nombre y el mensaje", () => {
    const dto = toCreateAutomationDTO(values({ name: "  Regla  ", message_template: "  Hola mundo largo  " }));
    expect(dto.name).toBe("Regla");
    expect(dto.message_template).toBe("Hola mundo largo");
  });
});

describe("toUpdateAutomationDTO", () => {
  it("NO manda enabled: guardar un cambio de texto no puede apagar una regla activa", () => {
    expect(toUpdateAutomationDTO(values())).not.toHaveProperty("enabled");
  });
});

describe("automationToFormValues", () => {
  const automation = {
    id: "a1",
    name: "Carrito con cupón",
    trigger_type: "cart_abandoned",
    delay_minutes: 15,
    priority: 2,
    conditions: { min_cart_total_cents: 5_000_000, lifecycle_stage_in: ["lead"] },
    promotion: { id: "p1", name: "Vuelve y ahorra", kind: "percent_discount" },
    message_template: "Hola {{first_name}}",
    hsm_template_name: null,
    hsm_template_language: null,
    attribution_window_hours: 168,
    enabled: true,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
  } as AutomationDTO;

  it("desanida las condiciones opacas del DTO", () => {
    const form = automationToFormValues(automation);
    expect(form.min_cart_total_cents).toBe(5_000_000);
    expect(form.lifecycle_stage_in).toEqual(["lead"]);
    expect(form.has_active_cart).toBe(false);
  });

  it("toma el id de la promoción embebida", () => {
    expect(automationToFormValues(automation).promotion_id).toBe("p1");
    expect(
      automationToFormValues({ ...automation, promotion: null }).promotion_id,
    ).toBe(NO_PROMOTION);
  });

  it("el ciclo editar→guardar no pierde ni inventa condiciones", () => {
    const roundTrip = toCreateAutomationDTO(automationToFormValues(automation));
    expect(roundTrip.conditions).toEqual({
      min_cart_total_cents: 5_000_000,
      lifecycle_stage_in: ["lead"],
    });
  });

  it("lo que sale de editar vuelve a validar", () => {
    expect(automationFormSchema.safeParse(automationToFormValues(automation)).success).toBe(true);
  });

  it("un conditions corrupto no rompe la edición", () => {
    const form = automationToFormValues({
      ...automation,
      conditions: "basura" as unknown as AutomationDTO["conditions"],
    });
    expect(form.lifecycle_stage_in).toEqual([]);
    expect(automationFormSchema.safeParse(form).success).toBe(true);
  });
});
