import {
  REACH_LEVELS,
  channelVerdict,
  decisionMakerEvidence,
  mapLeadToRow,
  opensWhatsappCold,
  primaryEmailVerification,
  readablePhone,
  waySourceLabel,
  type ChannelSubject,
  type LeadDTO,
} from "../lead";

/** Un negocio descubierto en un mapa: sin permiso propio de WhatsApp. */
const PUBLIC: ChannelSubject = {
  allowed_channels: ["email", "manual"],
  legal_basis: "public_business_data",
  email: "info@casalumbre.example",
  phone: "+573105550142",
};

describe("WhatsApp según la política del negocio", () => {
  it("frío APAGADO (o sin dato de la política): WhatsApp sigue bloqueado, como siempre", () => {
    for (const lead of [PUBLIC, { ...PUBLIC, whatsapp_cold_controlled: false }]) {
      expect(opensWhatsappCold(lead)).toBe(false);
      const verdict = channelVerdict(lead, "whatsapp");
      expect(verdict.state).toBe("blocked");
      expect(verdict.reason).toContain("suspenda tu número");
    }
  });

  it("frío ENCENDIDO: WhatsApp se puede usar, y dice con qué frenos", () => {
    const lead = { ...PUBLIC, whatsapp_cold_controlled: true };
    expect(opensWhatsappCold(lead)).toBe(true);
    const verdict = channelVerdict(lead, "whatsapp");
    expect(verdict.state).toBe("usable");
    expect(verdict.reason).toContain("plantilla aprobada");
    expect(verdict.reason).toContain("tope del día");
  });

  it("frío encendido pero sin teléfono: falta el dato, no el permiso", () => {
    const verdict = channelVerdict({ ...PUBLIC, phone: null, whatsapp_cold_controlled: true }, "whatsapp");
    expect(verdict.state).toBe("no_data");
  });

  it("frío encendido y el teléfono principal es un FIJO: falta el celular, no se afirma WhatsApp", () => {
    const verdict = channelVerdict({ ...PUBLIC, phone: "+576015550188", whatsapp_cold_controlled: true }, "whatsapp");
    expect(verdict.state).toBe("no_data");
    expect(verdict.reason).toContain("solo sale a celulares");
    // Con o sin espacios, un celular colombiano sí.
    for (const phone of ["+573105550142", "+57 310 555 0142", "3105550142"]) {
      expect(channelVerdict({ ...PUBLIC, phone, whatsapp_cold_controlled: true }, "whatsapp").state).toBe("usable");
    }
  });

  it("quien dio permiso no es frío: manda el permiso, con la política como esté", () => {
    const consented: ChannelSubject = {
      ...PUBLIC,
      allowed_channels: ["whatsapp", "email", "manual"],
      whatsapp_cold_controlled: true,
    };
    expect(opensWhatsappCold(consented)).toBe(false);
    expect(channelVerdict(consented, "whatsapp")).toEqual({ state: "usable", reason: null });
  });

  it("el frío es solo de WhatsApp: el correo y lo manual no cambian", () => {
    const lead = { ...PUBLIC, allowed_channels: ["manual"] as const, whatsapp_cold_controlled: true };
    expect(channelVerdict(lead, "email").state).toBe("blocked");
    expect(channelVerdict(lead, "manual").state).toBe("usable");
  });
});

describe("quién decide: hecho o pista", () => {
  it("un hecho del registro se cuenta como tal", () => {
    expect(decisionMakerEvidence({ level: "fact", confirmed_by: "source", provider: "rues" })).toBe(
      "Según el registro mercantil",
    );
  });

  it("una pista del sitio dice dónde aparece, no que sea cierto", () => {
    expect(
      decisionMakerEvidence({ level: "hypothesis", confirmed_by: null, provider: "site_extractor" }),
    ).toBe("Aparece en su sitio web");
  });

  it("confirmada por una persona, lo dice", () => {
    expect(
      decisionMakerEvidence({ level: "fact", confirmed_by: "person", provider: "site_extractor" }),
    ).toBe("Salió de su sitio web y lo confirmó tu equipo");
    expect(decisionMakerEvidence({ level: "fact", confirmed_by: "person", provider: null })).toBe(
      "Lo confirmó tu equipo",
    );
  });
});

describe("correos y teléfonos", () => {
  it("la verificación que existe hoy es la del correo principal", () => {
    const signals = (outcome: string) => ({
      checks: [{ key: "email_deliverable", axis: "contactability", outcome, evidence: "x" }],
    });
    expect(primaryEmailVerification(signals("pass"))).toBe("verified");
    expect(primaryEmailVerification(signals("fail"))).toBe("undeliverable");
    // Sin medir, o dudoso: no se afirma nada.
    expect(primaryEmailVerification(signals("unknown"))).toBeNull();
    expect(primaryEmailVerification(signals("warn"))).toBeNull();
    expect(primaryEmailVerification(null)).toBeNull();
  });

  it("los teléfonos colombianos se leen agrupados; lo demás, tal cual", () => {
    expect(readablePhone("+573105550142")).toBe("+57 310 555 0142");
    expect(readablePhone("+576015550188")).toBe("+57 601 555 0188");
    expect(readablePhone("+34911222333")).toBe("+34911222333");
  });

  it("la fuente se dice desde el negocio, y sin fuente no se inventa", () => {
    expect(waySourceLabel({ source: "site_extractor" })).toBe("Su sitio web");
    expect(waySourceLabel({ source: "site_extractor", whatsapp: true })).toBe("Enlace de WhatsApp en su sitio");
    expect(waySourceLabel({ source: "google_places", whatsapp: true })).toBe("Google Maps");
    expect(waySourceLabel({ source: "rues" })).toBe("Registro mercantil");
    expect(waySourceLabel({ source: null })).toBeNull();
  });

  it("cada nivel de alcance tiene nombre y explicación", () => {
    for (const level of ["direct", "role", "unconfirmed", "business", "hard"] as const) {
      expect(REACH_LEVELS[level].label.length).toBeGreaterThan(0);
      expect(REACH_LEVELS[level].hint.length).toBeGreaterThan(0);
    }
    expect(REACH_LEVELS.unconfirmed.tone).toBe("warning");
  });
});

describe("mapLeadToRow — quién decide y alcance en la fila", () => {
  const lead = {
    id: "l-1",
    source: "google_places",
    kind: "business",
    display_name: "Hotel Boutique Casa Lumbre",
    legal_name: null,
    email: null,
    phone: null,
    quality_status: "unverified",
    quality_score: 0,
    quality_signals: null,
    legal_basis: "public_business_data",
    allowed_channels: ["email", "manual"],
    data_present: [],
    data_count: 0,
    status: "new",
    city: null,
    created_at: "2026-11-23T15:00:00.000Z",
    last_enriched_at: null,
    title: null,
    buying_role: null,
    parent: null,
  } as unknown as LeadDTO;

  it("pasa el nombre, el cargo y el NIVEL (la celda pinta «Por confirmar» con una pista)", () => {
    const row = mapLeadToRow({
      ...lead,
      decision_maker: {
        person_id: "p-1",
        name: "Julián Cárdenas Mora",
        title: null,
        role: "decides",
        level: "hypothesis",
        confirmed_by: null,
        provider: "site_extractor",
        evidence_url: null,
      },
      reach: { level: "unconfirmed", channels: { whatsapp: false, email: true, call: false } },
    });
    expect(row).toMatchObject({
      decider_name: "Julián Cárdenas Mora",
      decider_title: null,
      decider_level: "hypothesis",
      reach_level: "unconfirmed",
      reach_whatsapp: false,
      reach_email: true,
      reach_call: false,
    });
  });

  it("sin quien decide, la fila lo dice con null (la celda pinta «Sin identificar»)", () => {
    const row = mapLeadToRow({ ...lead, decision_maker: null, reach: null });
    expect(row.decider_name).toBeNull();
    expect(row.decider_level).toBeNull();
    expect(row.reach_level).toBeNull();
  });
});
