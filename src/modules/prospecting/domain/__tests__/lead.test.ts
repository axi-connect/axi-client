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
  dataCompleteness,
  readSocials,
  PROVIDER_LABELS,
  ATTRIBUTE_LABELS,
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
  domain: null,
  country: "CO",
  city: "Bogotá",
  address: null,
  latitude: null,
  longitude: null,
  tax_id: null,
  socials: null,
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
  last_enriched_at: null,
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

  // La bandeja cierra su chip de «buscando datos» comparando ESTE campo, y el
  // backend lo mueve aunque la pasada no encuentre nada (C-D3 de F4c). Sin él,
  // una búsqueda sin hallazgos deja la fila girando hasta rendirse en silencio.
  it("lleva la marca del último INTENTO, no solo la de los hallazgos", () => {
    const stamp = "2026-08-31T15:04:00.000Z";
    expect(
      mapLeadToRow({ ...BASE, last_enriched_at: stamp }).enriched_at,
    ).toBe(stamp);
    expect(mapLeadToRow(BASE).enriched_at).toBeNull();
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

describe("readSocials", () => {
  it("devuelve las redes conocidas como enlaces", () => {
    expect(
      readSocials({
        instagram: "https://instagram.com/kokoa_co",
        facebook: "https://facebook.com/kokoaandco",
      }),
    ).toEqual([
      { network: "instagram", url: "https://instagram.com/kokoa_co" },
      { network: "facebook", url: "https://facebook.com/kokoaandco" },
    ]);
  });

  it("IGNORA una red fuera de la lista: lo que se pinta como enlace se decide aquí", () => {
    expect(readSocials({ myspace: "https://myspace.com/kokoa" })).toEqual([]);
  });

  it.each([
    ["null", null],
    ["vacío", {}],
    ["una cadena", "instagram.com/kokoa"],
    ["un valor vacío dentro", { instagram: "   " }],
  ])("no revienta con %s", (_caso, value) => {
    expect(readSocials(value)).toEqual([]);
  });
});

describe("dataCompleteness", () => {
  const row = (over: Partial<ReturnType<typeof mapLeadToRow>> = {}) =>
    mapLeadToRow({ ...BASE, ...over } as LeadDTO);

  it("cuenta los datos que se conocen, no la calidad", () => {
    // Este lead está VERIFICADO y aun así solo tiene dos de los cinco datos.
    // Son dos ejes distintos y por eso se cuentan aparte.
    expect(dataCompleteness(row())).toEqual({ filled: 2, total: 5 });
  });

  it("un lead con todo llega a cinco", () => {
    const full = mapLeadToRow({
      ...BASE,
      address: "Cl. 84A #8-75",
      website: "https://kokoa.co",
      socials: { instagram: "https://instagram.com/kokoa_co" },
    } as LeadDTO);
    expect(dataCompleteness(full)).toEqual({ filled: 5, total: 5 });
  });

  it("un lead de mapa recién descubierto no tiene ninguno", () => {
    const bare = mapLeadToRow({
      ...BASE,
      email: null,
      phone: null,
    } as LeadDTO);
    expect(dataCompleteness(bare)).toEqual({ filled: 0, total: 5 });
  });
});

describe("mapLeadToRow — lo que no se puede caer", () => {
  it("SIGUE distinguiendo tener el dato de poder usarlo", () => {
    // Si al añadir dirección y redes alguien reescribe esta función desde el
    // DTO nuevo, `has_email`/`has_phone` se caen y la columna «Puedo contactar
    // por» vuelve a pintar el correo en verde para leads sin correo.
    const row = mapLeadToRow({ ...BASE, email: null } as LeadDTO);
    expect(row.has_email).toBe(false);
    expect(row.has_phone).toBe(true);
    expect(row.allows_email).toBe(true);
  });

  it("aplana los datos nuevos como booleanos, sin arrastrar el valor", () => {
    const row = mapLeadToRow({
      ...BASE,
      address: "Cl. 84A #8-75",
      socials: { instagram: "https://instagram.com/kokoa_co" },
    } as LeadDTO);
    expect(row.has_address).toBe(true);
    expect(row.has_socials).toBe(true);
    expect(row.has_website).toBe(false);
    expect(Object.values(row)).not.toContain("Cl. 84A #8-75");
  });
});

describe("etiquetas de procedencia", () => {
  it("traduce a quien completó el dato, no solo a quien trajo el lead", () => {
    expect(PROVIDER_LABELS.nominatim).toBe("OpenStreetMap");
    expect(PROVIDER_LABELS.site_extractor).toBe("Su sitio web");
    expect(PROVIDER_LABELS.rues).toBe("RUES");
  });

  it("traduce las claves crudas de attributes", () => {
    expect(ATTRIBUTE_LABELS.social_instagram).toBe("Instagram");
    expect(ATTRIBUTE_LABELS.address).toBe("Dirección");
  });
});
