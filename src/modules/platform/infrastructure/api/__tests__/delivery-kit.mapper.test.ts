import { buildKitView } from "@/modules/welcome-kit/domain/kit-view";
import { kitDataFromPreview } from "../delivery-kit.mapper";
import type { WelcomeKitPreviewWire } from "../delivery.dto";

const KIT: WelcomeKitPreviewWire = {
  kit_version: 1,
  business_name: "Panadería La Espiga",
  owner_first_name: "Andrés",
  owner_name: "Andrés Gómez",
  login_email: "hola@laespiga.co",
  panel_url: "https://app.axi-connect.co",
  password_reset_url: "https://app.axi-connect.co/auth/olvide-contrasena",
  agent: { name: "Sofía", tone: "cercano", tone_label: "Cercano" },
  team_hours: "7:00 a. m. – 7:00 p. m.",
  payment_methods: [
    { kind: "nequi", label: "Nequi" },
    { kind: "bitcoin", label: "Bitcoin" },
  ],
  payment_methods_joined: "Nequi",
  catalog: { product_count: 48 },
  trial: {
    starts_at: "2026-09-24T05:00:00Z",
    ends_at: "2026-10-02T04:59:59Z",
    timezone: "America/Bogota",
    start_date: "2026-09-24",
    day7_date: "2026-10-01",
    range_label: "24 sep → 1 oct",
    day7_label: "jue 1 oct",
    conversations: 75,
  },
  session: { date: "2026-09-24", date_label: "jue 24 sep" },
  calls: {
    day2: { day: "day2", at: "2026-09-28T15:00:00Z", date_label: "lun 28 sep", time_label: "10:00 a. m.", duration_min: 10, kind: "llamada", title: "Llamada" },
    day5: { day: "day5", at: "2026-09-29T15:00:00Z", date_label: "mar 29 sep", time_label: "10:00 a. m.", duration_min: 15, kind: "reunión", title: "Reunión" },
  },
  digest: { time: "07:30", time_label: "7:30 a. m." },
  advisor: { name: "Camila Restrepo", first_name: "Camila", whatsapp_e164: "+573004821937", whatsapp_display: "+57 300 482 1937", whatsapp_url: "https://wa.me/573004821937" },
  plan: {
    name: "Crecimiento",
    volume_tier_label: "1.000 conversaciones",
    interval: "monthly",
    amount_cents: 22_190_000,
    list_amount_cents: 36_990_000,
    currency: "COP",
    price_label: "$ 221.900",
    list_price_label: "$ 369.900",
    promotion_name: "Programa Fundadores",
    valid_until: null,
  },
  pays_with: [],
};

describe("kitDataFromPreview", () => {
  it("pasa el kit_data del servidor a los datos que pinta el kit", () => {
    const data = kitDataFromPreview(KIT);
    expect(data).toMatchObject({
      businessName: "Panadería La Espiga",
      agentName: "Sofía",
      agentTone: "Cercano",
      paymentMethods: ["nequi"],
      catalog: { productCount: 48 },
      advisor: { fullName: "Camila Restrepo", whatsappE164: "+573004821937", digestTime: "07:30" },
      trial: { startDate: "2026-09-24", conversations: 75 },
      plan: { name: "Crecimiento", monthlyPriceCop: 221_900, listPriceCop: 369_900, conversationsPerMonth: 1000 },
    });
    // Y el kit lo sabe pintar.
    expect(() => buildKitView(data)).not.toThrow();
  });

  it("sin plan ni agente no rompe", () => {
    const data = kitDataFromPreview({ ...KIT, plan: null, agent: { name: null, tone: null, tone_label: null } });
    expect(data.plan).toEqual({ name: "", monthlyPriceCop: 0, listPriceCop: 0, conversationsPerMonth: 0 });
    expect(data.agentName).toBe("");
  });
});
