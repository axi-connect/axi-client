import {
  buildCredentials,
  PROVIDER_DESCRIPTORS,
  PROVIDER_STATUS_LABELS,
  providerStatus,
  type ProviderAccount,
} from "../prospecting-providers";

const BASE: ProviderAccount = {
  id: "p-1",
  provider: "millionverifier",
  label: "produccion",
  enabled: true,
  capabilities: ["verify_email"],
  priority: 10,
  config: {},
  daily_cap: null,
  monthly_cap: null,
  spent_today: 0,
  spent_cycle: 0,
  healthy: true,
  last_error: null,
  last_checked_at: null,
  token_last4: "AB12",
  credential_set_at: "2026-08-28T10:00:00.000Z",
};

describe("providerStatus", () => {
  it("activo cuando está encendido, sano y con llave", () => {
    expect(providerStatus(BASE)).toBe("active");
  });

  it("SIN LLAVE es distinto de APAGADO", () => {
    // Una cuenta puede existir con la credencial revocada, y eso no se ve
    // mirando el interruptor: el operador tiene que poder distinguirlo.
    expect(providerStatus({ ...BASE, token_last4: null })).toBe(
      "no_credential",
    );
    expect(providerStatus({ ...BASE, enabled: false })).toBe("disabled");
  });

  it("sin llave gana sobre apagado: es el problema más grave", () => {
    expect(providerStatus({ ...BASE, token_last4: null, enabled: false })).toBe(
      "no_credential",
    );
  });

  it("RUES no necesita llave para estar activo", () => {
    // Es una fuente pública: exigirle credencial la dejaría fuera para siempre.
    expect(
      providerStatus({ ...BASE, provider: "rues", token_last4: null }),
    ).toBe("active");
  });

  it("el tope diario alcanzado se ve, no se confunde con una caída", () => {
    expect(providerStatus({ ...BASE, daily_cap: 100, spent_today: 100 })).toBe(
      "capped_day",
    );
    expect(providerStatus({ ...BASE, daily_cap: 100, spent_today: 99 })).toBe(
      "active",
    );
  });

  it("EL MENSUAL SE DISTINGUE DEL DIARIO: el remedio no es el mismo", () => {
    // Uno se arregla mañana; el otro hay que subirlo o esperar al mes que
    // viene. Y es el que guarda el cupo gratuito de Places, que va por mes.
    expect(
      providerStatus({ ...BASE, monthly_cap: 5000, spent_cycle: 5000 }),
    ).toBe("capped_month");
    expect(
      providerStatus({ ...BASE, monthly_cap: 5000, spent_cycle: 4999 }),
    ).toBe("active");
  });

  it("sin tope no hay tope: no se inventa un límite", () => {
    expect(
      providerStatus({ ...BASE, spent_today: 99_999, spent_cycle: 99_999 }),
    ).toBe("active");
  });

  it("un proveedor enfermo se distingue de uno apagado a mano", () => {
    expect(providerStatus({ ...BASE, healthy: false })).toBe("unhealthy");
  });

  it("todo estado tiene etiqueta en español", () => {
    for (const status of Object.values(PROVIDER_STATUS_LABELS)) {
      expect(status.length).toBeGreaterThan(0);
    }
  });
});

describe("buildCredentials", () => {
  it("arma el payload desde los ids del formulario, sin un switch por proveedor", () => {
    expect(buildCredentials("api_key", { api_key: "LLAVE" })).toEqual({
      mode: "api_key",
      api_key: "LLAVE",
    });
    expect(
      buildCredentials("key_secret", { key_sid: "SK1", secret: "shh" }),
    ).toEqual({
      mode: "key_secret",
      key_sid: "SK1",
      secret: "shh",
    });
    expect(buildCredentials("none", {})).toEqual({ mode: "none" });
  });

  it("un campo que falta va vacío en vez de undefined: el backend lo rechaza claro", () => {
    expect(buildCredentials("key_secret", { key_sid: "SK1" })).toEqual({
      mode: "key_secret",
      key_sid: "SK1",
      secret: "",
    });
  });
});

describe("descriptores", () => {
  it("todo proveedor dice qué hacer ANTES de venir a pegar la llave", () => {
    for (const descriptor of Object.values(PROVIDER_DESCRIPTORS)) {
      expect(descriptor.prerequisites.length).toBeGreaterThan(0);
      expect(descriptor.tagline.length).toBeGreaterThan(0);
    }
  });

  it("los campos secretos están marcados: van en un input de tipo password", () => {
    const apollo = PROVIDER_DESCRIPTORS.apollo;
    expect(apollo.fields.every((field) => field.id.length > 0)).toBe(true);
    expect(apollo.fields.find((field) => field.id === "api_key")?.secret).toBe(
      true,
    );
  });

  it("el SID de Twilio NO es secreto, pero su secreto sí", () => {
    const twilio = PROVIDER_DESCRIPTORS.twilio_lookup;
    expect(twilio.fields.find((field) => field.id === "key_sid")?.secret).toBe(
      false,
    );
    expect(twilio.fields.find((field) => field.id === "secret")?.secret).toBe(
      true,
    );
  });

  it("RUES no pide ningún campo: es pública", () => {
    expect(PROVIDER_DESCRIPTORS.rues.fields).toEqual([]);
  });

  it("los proveedores con costo lo advierten antes de conectarlos", () => {
    // Apollo cobra 9 créditos si devuelve un móvil y Twilio cobra por consulta:
    // enterarse después de encenderlo es enterarse en la factura.
    expect(PROVIDER_DESCRIPTORS.apollo.note).toContain("9");
    expect(PROVIDER_DESCRIPTORS.twilio_lookup.note).toContain("0,008");
  });
});

describe("Cobertura del catálogo (regresión de F4)", () => {
  /**
   * F4 añadió cinco proveedores al backend y el panel se quedó con los cuatro
   * de F3. El síntoma era sordo: la fuente «no estaba disponible» y nada
   * señalaba a esta pantalla. El `Record<ProviderName, …>` ya lo impide en
   * compilación; esto lo afirma también en runtime, con el detalle de que un
   * descriptor a medias es tan inútil como no tenerlo.
   */
  it("todo proveedor tiene etiqueta, gancho y prerrequisitos", () => {
    for (const [name, descriptor] of Object.entries(PROVIDER_DESCRIPTORS)) {
      expect(descriptor.label.length).toBeGreaterThan(0);
      expect(descriptor.tagline.length).toBeGreaterThan(0);
      expect(descriptor.prerequisites.length).toBeGreaterThan(0);
      // Un campo sin `id` no se puede enviar: el id ES el nombre en el DTO.
      for (const field of descriptor.fields) {
        expect(field.id.length).toBeGreaterThan(0);
        expect(field.label.length).toBeGreaterThan(0);
      }
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("las fuentes gratis NO piden llave, y por eso no se marcan «sin llave»", () => {
    // Overpass y el extractor propio funcionan sin credencial. Antes de F4 la
    // excepción era una lista escrita a mano con «rues» dentro.
    for (const free of ["rues", "overpass", "site_extractor", "nominatim"] as const) {
      expect(PROVIDER_DESCRIPTORS[free].fields).toHaveLength(0);
      expect(
        providerStatus({
          ...BASE,
          provider: free,
          token_last4: null,
          enabled: true,
          healthy: true,
        }),
      ).toBe("active");
    }
  });

  it("las de pago sí: sin llave no están activas aunque el interruptor esté puesto", () => {
    for (const paid of ["google_places", "serper", "firecrawl"] as const) {
      expect(PROVIDER_DESCRIPTORS[paid].fields.length).toBeGreaterThan(0);
      expect(
        providerStatus({ ...BASE, provider: paid, token_last4: null, enabled: true }),
      ).toBe("no_credential");
    }
  });
});
