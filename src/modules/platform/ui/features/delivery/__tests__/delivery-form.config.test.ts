import type { DeliveryContextWire, OfferCatalogWire } from "../../../../infrastructure/api/delivery.dto";
import {
  deliveryFormSchema,
  formValuesFromContext,
  parseStoredDeliveryDraft,
  PREVIEW_ADVISOR_PLACEHOLDER,
  serializeDeliveryDraft,
  toDeliveryDraft,
  toPreviewDraft,
  type DeliveryFormValues,
} from "../delivery-form.config";

const BOGOTA = "America/Bogota";

const CATALOG: OfferCatalogWire = {
  currency: "COP",
  default_tier: "t1000",
  packages: [
    { code: "esencial", name: "Esencial", description: null },
    { code: "crecimiento", name: "Crecimiento", description: null },
  ],
  modules: [],
  tiers: [
    { code: "t500", label: "500", conversations: 500 },
    { code: "t1000", label: "1.000", conversations: 1000 },
  ],
  promotion: { code: "fundadores", name: "Programa Fundadores", percent_bps: 4000, ends_at: null },
};

function context(overrides: Partial<DeliveryContextWire> = {}): DeliveryContextWire {
  return {
    tenant: { id: "t-1", name: "Panadería La Espiga", timezone: BOGOTA, status: "trial", trial_ends_at: "2026-09-27T04:59:59Z" },
    owner: { user_id: "u-1", name: "Andrés Gómez", email: "hola@laespiga.co", status: "invited" },
    agent: { name: "Sofía", tone: "cercano" },
    offer: null,
    trial: {
      status: "trial",
      trial_ends_at: "2026-09-27T04:59:59Z",
      restart_preview: { starts_at: "2026-09-24T05:00:00Z", ends_at: "2026-10-02T04:59:59Z", timezone: BOGOTA },
    },
    suggested: {
      session_date: "2026-09-24",
      call_day2: { at: "2026-09-28T15:00:00Z", warning: "El día 2 cae en fin de semana; propuse el lunes." },
      call_day5: { at: "2026-09-29T15:00:00Z", warning: null },
      digest_time: "07:30",
    },
    advisor_suggestion: { name: "Camila Restrepo", whatsapp_e164: "+573004821937", email: "camila@axi-connect.co" },
    latest_delivery: null,
    blockers: [],
    ...overrides,
  };
}

describe("formValuesFromContext", () => {
  it("sin oferta guardada: primer paquete, tramo y promoción del catálogo; citas en hora de Bogotá", () => {
    const values = formValuesFromContext(context(), CATALOG);
    expect(values.offer).toEqual({
      package_code: "esencial",
      volume_tier_code: "t1000",
      promotion_code: "fundadores",
      billing_period: "monthly",
    });
    expect(values.call_day2_at).toBe("2026-09-28T10:00");
    expect(values.call_day5_at).toBe("2026-09-29T10:00");
    expect(values.advisor.name).toBe("Camila Restrepo");
    expect(values.restart_trial).toBe(true);
  });

  it("con oferta guardada: la retoma (paquete por nombre, sin promoción si no la tenía)", () => {
    const values = formValuesFromContext(
      context({
        offer: {
          plan_name: "Crecimiento",
          volume_tier_label: "500",
          list_amount_cents: 1,
          amount_cents: 1,
          promotion_name: null,
          currency: "COP",
          valid_until: "2026-10-09T00:00:00Z",
          kind: "package",
          plan_codes: ["growth_v2"],
          volume_tier_code: "t500",
          billing_period: "annual",
          promotion_code: null,
          quoted_at: null,
        },
      }),
      CATALOG,
    );
    expect(values.offer).toEqual({
      package_code: "crecimiento",
      volume_tier_code: "t500",
      promotion_code: "",
      billing_period: "annual",
    });
  });
});

describe("toDeliveryDraft", () => {
  const base = formValuesFromContext(context(), CATALOG);

  it("arma el DeliveryDraftDto: ISO con offset, teléfono compacto, copia normalizada", () => {
    const draft = toDeliveryDraft(
      {
        ...base,
        offer: { ...base.offer, promotion_code: "" },
        advisor: { name: " Camila Restrepo ", whatsapp_e164: "+57 300 482 1937", email: "camila@axi-connect.co" },
        cc: ["Gestion@Axi-Connect.co"],
      },
      BOGOTA,
    );
    expect(draft).toEqual({
      offer: { package_code: "esencial", volume_tier_code: "t1000", billing_period: "monthly" },
      restart_trial: true,
      session_date: "2026-09-24",
      call_day2_at: "2026-09-28T10:00:00-05:00",
      call_day5_at: "2026-09-29T10:00:00-05:00",
      digest_time: "07:30",
      advisor: { name: "Camila Restrepo", whatsapp_e164: "+573004821937", email: "camila@axi-connect.co" },
      cc: ["gestion@axi-connect.co"],
      confirm_trial_shortening: false,
    });
  });

  it("null si falta el paquete o una cita está a medio escribir", () => {
    expect(toDeliveryDraft({ ...base, offer: { ...base.offer, package_code: "" } }, BOGOTA)).toBeNull();
    expect(toDeliveryDraft({ ...base, call_day5_at: "2026-09-29" }, BOGOTA)).toBeNull();
  });

  it("la vista previa usa la firma sugerida mientras la escrita no es válida, y descarta copias inválidas", () => {
    const values: DeliveryFormValues = { ...base, advisor: { name: "C", whatsapp_e164: "300", email: "" }, cc: ["a@x.co", "roto"] };
    const draft = toPreviewDraft(values, BOGOTA, PREVIEW_ADVISOR_PLACEHOLDER);
    expect(draft?.advisor).toEqual(PREVIEW_ADVISOR_PLACEHOLDER);
    expect(draft?.cc).toEqual(["a@x.co"]);
  });
});

describe("validación local", () => {
  const base = formValuesFromContext(context(), CATALOG);

  it("el WhatsApp admite espacios pero exige el indicativo", () => {
    const ok = deliveryFormSchema.safeParse({ ...base, advisor: { ...base.advisor, whatsapp_e164: "+57 300 482 1937" } });
    expect(ok.success).toBe(true);
    const bad = deliveryFormSchema.safeParse({ ...base, advisor: { ...base.advisor, whatsapp_e164: "3004821937" } });
    expect(bad.success).toBe(false);
  });
});

describe("borrador en este navegador", () => {
  const values = formValuesFromContext(context(), CATALOG);

  it("ida y vuelta", () => {
    const raw = serializeDeliveryDraft(values, new Date("2026-09-24T20:00:00Z"));
    expect(parseStoredDeliveryDraft(raw)).toEqual({ saved_at: "2026-09-24T20:00:00.000Z", values });
  });

  it("un borrador a medias (firma sin terminar) se conserva", () => {
    const raw = serializeDeliveryDraft({ ...values, advisor: { name: "", whatsapp_e164: "", email: "" } }, new Date());
    expect(parseStoredDeliveryDraft(raw)?.values.advisor.name).toBe("");
  });

  it.each([null, "", "{roto", JSON.stringify({ version: 2, saved_at: "x", values: {} }), JSON.stringify({ version: 1 })])(
    "ignora lo que no es un borrador válido (%s)",
    (raw) => {
      expect(parseStoredDeliveryDraft(raw)).toBeNull();
    },
  );
});
