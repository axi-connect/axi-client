import type { ContactDataField } from "../contact-data";
import {
  businessProfileOf,
  hasBusinessProfile,
  isBusinessProfileField,
  safeHttpUrl,
} from "../business-profile";

function field(code: string, value: string | null, overrides: Partial<ContactDataField> = {}): ContactDataField {
  return {
    code,
    label: "",
    defined: false,
    storage: "custom",
    type: null,
    options: null,
    required: false,
    flow: null,
    value,
    state: "captured",
    protected: false,
    source: "system",
    captured_at: "2026-11-22T13:00:00.000Z",
    conversation_id: null,
    actor_user_id: null,
    canonical_from: null,
    from_web: false,
    raw_value: null,
    invalid_reason: null,
    attempts: 0,
    proposal: null,
    ...overrides,
  };
}

describe("business-profile", () => {
  it("arma las filas en orden, con texto legible y enlaces seguros; solo las que tienen dato", () => {
    const view = businessProfileOf([
      field("google_maps_url", "https://www.google.com/maps/place/?q=place_id:ChIJ123"),
      field("instagram", "https://instagram.com/almejatours/"),
      field("website", "https://www.almejatours.com/"),
      field("facebook", ""),
      field("whatsapp", "300 314 8451"),
      field("tiktok", "@almeja.viajes"),
      field("category", "Agencia de viajes"),
      field("original_name", "Agencia de viajes en Bogotá Almejatours | Vuelos"),
      field("company", "Kodecol", { defined: true }),
    ]);
    expect(view.web.map((row) => [row.key, row.display, row.href])).toEqual([
      ["website", "almejatours.com", "https://www.almejatours.com/"],
      ["instagram", "@almejatours", "https://instagram.com/almejatours/"],
      ["tiktok", "@almeja.viajes", "https://tiktok.com/@almeja.viajes"],
      ["whatsapp", "+57 300 314 8451", "https://wa.me/573003148451"],
    ]);
    expect(view.ficha.map((row) => [row.key, row.display, row.href])).toEqual([
      ["category", "Agencia de viajes", null],
      ["google_maps_url", "Abrir su ficha en Maps", "https://www.google.com/maps/place/?q=place_id:ChIJ123"],
    ]);
    expect(view.originalName).toBe("Agencia de viajes en Bogotá Almejatours | Vuelos");
    expect(view.capturedAt).toBe("2026-11-22T13:00:00.000Z");
    expect(hasBusinessProfile(view)).toBe(true);
  });

  it("un dato corregido o confirmado por el equipo se marca", () => {
    const view = businessProfileOf([field("instagram", "@almeja_oficial", { state: "corrected", source: "user" })]);
    expect(view.web[0]).toMatchObject({ display: "@almeja_oficial", corrected: true });
  });

  it("un campo de formulario con el mismo código no es del perfil: se queda en «Datos del cliente»", () => {
    expect(isBusinessProfileField({ code: "website", defined: true })).toBe(false);
    expect(isBusinessProfileField({ code: "website", defined: false })).toBe(true);
    expect(isBusinessProfileField({ code: "company", defined: false })).toBe(false);
    expect(hasBusinessProfile(businessProfileOf([field("website", "x.co", { defined: true })]))).toBe(false);
  });

  it("solo enlaces http/https: un javascript: no se vuelve enlace", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("almejatours.com")).toBe("https://almejatours.com/");
    const view = businessProfileOf([field("website", "javascript:alert(1)")]);
    expect(view.web[0]).toMatchObject({ href: null, display: "javascript:alert(1)" });
  });
});
