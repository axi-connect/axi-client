import type { HsmTemplateDTO, TemplateDTO } from "../template-catalog";
import {
  describeTemplateContent,
  HSM_STATUS_MAP,
  isUsableForMarketing,
  whyUnusable,
} from "../template-catalog";
import { HSM_APPROVAL_LABELS } from "../enums";

function hsm(over: Partial<HsmTemplateDTO> = {}): HsmTemplateDTO {
  return {
    id: "h1",
    channel_id: "ch1",
    name: "promo_agosto",
    language: "es",
    category: "marketing",
    body: "Hola {{1}}",
    components: [],
    approval_status: "approved",
    rejected_reason: null,
    quality_score: null,
    editable: true,
    edit_blocked_reason: null,
    edit_retry_at: null,
    external_id: null,
    updated_at: "2026-08-01T00:00:00.000Z",
    ...over,
  } as HsmTemplateDTO;
}

describe("qué HSM sirve para marketing", () => {
  it("solo la aprobada Y de categoría marketing", () => {
    expect(isUsableForMarketing(hsm())).toBe(true);
    expect(isUsableForMarketing(hsm({ approval_status: "pending" }))).toBe(false);
    // Una `utility` aprobada existe y se ve bien, pero Meta rechaza el envío
    // promocional: hay que filtrarla o el fallo aparece al lanzar la campaña.
    expect(isUsableForMarketing(hsm({ category: "utility" }))).toBe(false);
  });

  it("explica el motivo concreto por el que no sirve", () => {
    expect(whyUnusable(hsm())).toBeNull();
    expect(whyUnusable(hsm({ approval_status: "paused" }))).toContain(
      HSM_APPROVAL_LABELS.paused.toLowerCase(),
    );
    expect(whyUnusable(hsm({ category: "utility" }))).toContain("Marketing");
  });

  it("el semáforo cubre los cinco estados y solo `pending` es transitorio", () => {
    for (const status of ["approved", "pending", "rejected", "paused", "disabled"] as const) {
      expect(HSM_STATUS_MAP[status]).toBeDefined();
    }
    expect(HSM_STATUS_MAP.pending.transient).toBe(true);
    expect(HSM_STATUS_MAP.approved.transient).toBeUndefined();
  });
});

describe("describeTemplateContent", () => {
  const base = { id: "t1", name: "Promo", is_active: true } as TemplateDTO;

  it("cada tipo guarda su contenido en un campo distinto", () => {
    expect(
      describeTemplateContent({ ...base, kind: "text", body: "Hola {{first_name}}" }),
    ).toBe("Hola {{first_name}}");
    expect(
      describeTemplateContent({
        ...base,
        kind: "media",
        body: null,
        media: { filename: "catalogo.jpg", media_kind: "image" },
      } as TemplateDTO),
    ).toBe("catalogo.jpg");
    expect(
      describeTemplateContent({
        ...base,
        kind: "hsm",
        body: null,
        hsm_ref: { name: "promo_agosto", language: "es" },
      } as TemplateDTO),
    ).toBe("promo_agosto (es)");
  });

  it("no deja la celda vacía cuando falta el contenido", () => {
    expect(describeTemplateContent({ ...base, kind: "text", body: null })).toBe("Sin contenido");
    expect(
      describeTemplateContent({ ...base, kind: "media", body: null, media: null } as TemplateDTO),
    ).toBe("Sin archivo");
    expect(
      describeTemplateContent({ ...base, kind: "hsm", body: null, hsm_ref: null } as TemplateDTO),
    ).toBe("Sin plantilla de Meta enlazada");
  });

  it("una media sin nombre de archivo cae a su tipo", () => {
    expect(
      describeTemplateContent({
        ...base,
        kind: "media",
        body: null,
        media: { media_kind: "document" },
      } as TemplateDTO),
    ).toBe("Archivo document");
  });
});

import {
  formatTemplateCost,
  inspectTemplateVariables,
  isUsableAsOpening,
  SUGGESTED_OPENING_TEMPLATES,
  whyUnusableAsOpening,
} from "../template-catalog";

/** F2 — plantillas como APERTURA de un seguimiento del agente. */
describe("template-catalog — apertura (F2)", () => {
  const base = {
    id: "t1",
    channel_id: "ch",
    name: "seguimiento_v1",
    language: "es",
    body: "Hola {{1}}, te escribo por {{2}}.",
    components: [],
    approval_status: "approved" as const,
    rejected_reason: null,
    quality_score: null,
    editable: true,
    edit_blocked_reason: null,
    edit_retry_at: null,
    external_id: null,
    updated_at: "2026-09-14T00:00:00.000Z",
  };

  it("una utility aprobada SÍ abre (al revés que en promociones); la de autenticación no", () => {
    expect(isUsableAsOpening({ ...base, category: "utility" })).toBe(true);
    expect(isUsableAsOpening({ ...base, category: "marketing" })).toBe(true);
    expect(isUsableAsOpening({ ...base, category: "authentication" })).toBe(false);
    expect(isUsableAsOpening({ ...base, category: "utility", approval_status: "pending" })).toBe(false);
    expect(whyUnusableAsOpening({ ...base, category: "authentication" })).toContain("códigos");
  });

  it("espeja las reglas de variables de Meta que el backend aplica al alta", () => {
    expect(inspectTemplateVariables("Hola {{1}}, sobre {{2}}. ¿Seguimos?")).toEqual({ ok: true, count: 2 });
    expect(inspectTemplateVariables("Hola {{1}} y {{3}}")).toEqual({ ok: false, reason: "not_sequential" });
    expect(inspectTemplateVariables("{{1}}, hola")).toEqual({ ok: false, reason: "at_edges" });
    expect(inspectTemplateVariables("Hola {{1}} {{2}} saludos")).toEqual({ ok: false, reason: "adjacent" });
  });

  it("el costo se muestra en dólares con cuatro decimales, por categoría", () => {
    expect(formatTemplateCost("utility")).toBe("≈ US$0,0008");
    expect(formatTemplateCost("marketing")).toBe("≈ US$0,0200");
  });

  it("las tres sugeridas pasan las reglas de Meta y traen un ejemplo por variable", () => {
    for (const suggestion of SUGGESTED_OPENING_TEMPLATES) {
      const verdict = inspectTemplateVariables(suggestion.body);
      expect(verdict).toEqual({ ok: true, count: 2 });
      expect(suggestion.examples).toHaveLength(2);
      expect(/^[a-z0-9_]+$/.test(suggestion.name)).toBe(true);
    }
  });
});
