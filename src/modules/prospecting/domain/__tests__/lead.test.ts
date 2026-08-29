import {
  LEGAL_BASIS_LABELS,
  QUALITY_STATUS_MAP,
  canDiscard,
  canPromote,
  leadDisplayName,
  mapLeadToRow,
  readQualityAxes,
  rowAllowedChannels,
  channelVerdict,
  type LeadDTO,
} from "../lead";

const BASE: LeadDTO = {
  id: "l-1",
  source: "meta_lead_ads",
  external_id: "leadgen-1",
  kind: "person",
  display_name: "Sazón de la Abuela",
  legal_name: null,
  email: "marcela@sazon.co",
  phone: "+573104482290",
  website: null,
  city: "Bogotá",
  category: null,
  quality_score: 92,
  quality_status: "verified",
  quality_signals: {
    axes: { contactability: 25, identity: 23, fit: 22, provenance: 22 },
  },
  legal_basis: "consent_form",
  allowed_channels: ["whatsapp", "email", "manual"],
  status: "new",
  contact_id: null,
  source_ref: null,
  attributes: null,
  promoted_at: null,
  created_at: "2026-08-28T10:00:00.000Z",
};

describe("channelVerdict", () => {
  it("con permiso y con el dato, el canal es usable", () => {
    expect(channelVerdict(BASE, "whatsapp")).toEqual({ state: "usable", reason: null });
  });

  it("lo que la base legal no permite queda BLOQUEADO, y dice por qué", () => {
    const publico = { ...BASE, legal_basis: "public_business_data" as const, allowed_channels: ["email", "manual"] as const };
    const veredicto = channelVerdict(publico, "whatsapp");
    expect(veredicto.state).toBe("blocked");
    expect(veredicto.reason).toContain("suspenda tu número");
  });

  it("PERMITIDO PERO SIN EL DATO no es lo mismo que prohibido", () => {
    // El bug que se vio en la primera prueba real: la bandeja pintaba el correo
    // en verde para leads descubiertos en un mapa, que casi nunca traen correo.
    // La columna se llama «Puedo contactar por» y estaba respondiendo a otra
    // pregunta: si la LEY lo permite, no si hay a dónde escribir.
    const sinCorreo = { ...BASE, email: null };
    const veredicto = channelVerdict(sinCorreo, "email");
    expect(veredicto.state).toBe("no_data");
    expect(veredicto.reason).toContain("Enriquece el lead");
  });

  it("y el remedio que sugiere es distinto en cada caso", () => {
    // Es la razón de que sean tres estados y no dos: lo bloqueado por la ley no
    // se arregla, y lo que falta por no tener el dato se enriquece.
    const sinTelefono = { ...BASE, phone: null };
    expect(channelVerdict(sinTelefono, "whatsapp").reason).toContain("Enriquece");

    const publico = { ...BASE, legal_basis: "public_business_data" as const, allowed_channels: ["email", "manual"] as const };
    expect(channelVerdict(publico, "whatsapp").reason).not.toContain("Enriquece");
  });

  it("«a mano» nunca depende de un dato: siempre hay alguien que puede llamar", () => {
    const pelado = { ...BASE, email: null, phone: null };
    expect(channelVerdict(pelado, "manual").state).toBe("usable");
  });

  it("sin saber de dónde salió, solo queda el trabajo manual", () => {
    const desconocido = { ...BASE, legal_basis: "unknown" as const, allowed_channels: ["manual"] as const };
    expect(channelVerdict(desconocido, "email").reason).toContain(
      "No sabemos de dónde salió",
    );
    expect(channelVerdict(desconocido, "manual").state).toBe("usable");
  });
});

describe("canPromote / canDiscard", () => {
  it.each(["new", "enriching", "qualified"] as const)(
    "%s se puede promover",
    (status) => {
      expect(canPromote({ status })).toBe(true);
    },
  );

  it.each(["promoted", "discarded", "suppressed", "rejected"] as const)(
    "%s NO se puede promover",
    (status) => {
      expect(canPromote({ status })).toBe(false);
    },
  );

  it("un lead ya promovido no se descarta: ya es un contacto", () => {
    expect(canDiscard({ status: "promoted" })).toBe(false);
  });
});

describe("leadDisplayName", () => {
  it("cae en cascada hasta encontrar algo con qué nombrarlo", () => {
    expect(leadDisplayName(BASE)).toBe("Sazón de la Abuela");
    expect(leadDisplayName({ ...BASE, display_name: null })).toBe(
      "marcela@sazon.co",
    );
    expect(leadDisplayName({ ...BASE, display_name: null, email: null })).toBe(
      "+573104482290",
    );
    expect(
      leadDisplayName({
        display_name: null,
        legal_name: null,
        email: null,
        phone: null,
      }),
    ).toBe("Sin nombre");
  });
});

describe("readQualityAxes", () => {
  it("un lead sin medir devuelve los cuatro ejes en cero, no un vacío", () => {
    // La UI del detalle tiene que poder pintar la estructura antes de que F2
    // mida nada, sin fingir datos que nadie calculó.
    const axes = readQualityAxes(null);
    expect(axes).toHaveLength(4);
    expect(axes.every((axis) => axis.score === 0)).toBe(true);
  });

  it("acota valores fuera de rango en vez de pintar barras rotas", () => {
    const axes = readQualityAxes({
      axes: { contactability: 999, identity: -5 },
    });
    expect(axes[0].score).toBe(25);
    expect(axes[1].score).toBe(0);
  });
});

describe("mapLeadToRow", () => {
  it("aplana los permisos a booleanos que la tabla puede indexar", () => {
    const row = mapLeadToRow(BASE);
    expect(row.allows_whatsapp).toBe(true);
    expect(rowAllowedChannels(row)).toEqual(["whatsapp", "email", "manual"]);
  });

  it("conserva los DOS ejes por separado", () => {
    const row = mapLeadToRow({
      ...BASE,
      quality_status: "verified",
      legal_basis: "public_business_data",
      allowed_channels: ["email", "manual"],
    });
    // El caso que enseña la regla: dato verificado, WhatsApp negado.
    expect(row.quality_status).toBe("verified");
    expect(row.allows_whatsapp).toBe(false);
  });

  it("arma la línea de contacto sin separadores sueltos", () => {
    expect(mapLeadToRow({ ...BASE, email: null }).contact_line).toBe(
      "+573104482290",
    );
    expect(
      mapLeadToRow({ ...BASE, email: null, phone: null }).contact_line,
    ).toBe("");
  });
});

describe("etiquetas", () => {
  it("toda base legal tiene una etiqueta en español", () => {
    expect(
      Object.values(LEGAL_BASIS_LABELS).every((label) => label.length > 0),
    ).toBe(true);
  });

  it("el semáforo de calidad cubre todos los estados del backend", () => {
    for (const status of [
      "unverified",
      "verified",
      "risky",
      "invalid",
      "suppressed",
    ]) {
      expect(QUALITY_STATUS_MAP[status]).toBeDefined();
    }
  });
});
