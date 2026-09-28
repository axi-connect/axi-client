import { HttpError } from "@/core/api/problem";
import type { HsmTemplateDTO } from "../template-catalog";
import {
  classifyHsmSubmitError,
  hsmNextUp,
  hsmQualityLabel,
  hsmStatusNote,
  namesLine,
  nextTemplateName,
} from "../meta-template-view";

const hsm = (over: Partial<HsmTemplateDTO> = {}): HsmTemplateDTO =>
  ({
    id: "h1",
    channel_id: "ch1",
    name: "promo",
    language: "es_CO",
    category: "marketing",
    body: "Hola {{1}}, novedades",
    components: [],
    approval_status: "approved",
    rejected_reason: null,
    quality_score: null,
    editable: true,
    edit_blocked_reason: null,
    edit_retry_at: null,
    external_id: null,
    updated_at: "2026-09-28T15:02:03.947Z",
    ...over,
  }) as HsmTemplateDTO;

const problem = (status: number, code: string, details?: Record<string, unknown>, detail?: string) =>
  new HttpError({ status, code, message: code, problem: { type: "t", title: "t", status, code, detail, details } });

describe("qué pasó al enviar (incidente 2026-09-28)", () => {
  it("409 con la fila aquí trae su id y su estado; sin fila, lo dijo Graph", () => {
    expect(classifyHsmSubmitError(problem(409, "channels/template_exists", { template_id: "h1", approval_status: "pending" }))).toEqual({
      kind: "exists_here",
      templateId: "h1",
      status: "pending",
    });
    expect(classifyHsmSubmitError(problem(409, "channels/template_exists", { graph_subcode: 2_388_024 }))).toEqual({
      kind: "exists_meta",
    });
  });

  it("502 de Meta conserva lo que dijo y el fbtrace_id", () => {
    expect(
      classifyHsmSubmitError(problem(502, "channels/template_sync_failed", { detail: "Invalid parameter", fbtrace_id: "Ax1" })),
    ).toEqual({ kind: "meta_rejected", detail: "Invalid parameter", reference: "Ax1" });
  });

  it("un 4xx nuestro es «corrígelo»; un 500 mudo, un 504 o la red es «no sabemos si llegó»", () => {
    expect(classifyHsmSubmitError(problem(422, "channels/template_draft_invalid", {}, "Las variables van en orden"))).toEqual({
      kind: "invalid",
      message: "Las variables van en orden",
    });
    expect(classifyHsmSubmitError(problem(500, "internal/unexpected"))).toEqual({ kind: "unknown" });
    expect(classifyHsmSubmitError(problem(504, "http/504"))).toEqual({ kind: "unknown" });
    expect(classifyHsmSubmitError(new TypeError("Failed to fetch"))).toEqual({ kind: "unknown" });
  });

  it("el nombre libre que se propone sube la versión", () => {
    expect(nextTemplateName("sesion_en_vivo_v1")).toBe("sesion_en_vivo_v2");
    expect(nextTemplateName("promo")).toBe("promo_v2");
    expect(nextTemplateName("x".repeat(120))).toHaveLength(120);
  });
});

describe("lo que la vista dice de cada plantilla", () => {
  it("el motivo en prosa va firmado por Meta; sin motivo, la frase de siempre", () => {
    expect(hsmStatusNote(hsm({ approval_status: "rejected", rejected_reason: "Your template has adjacent parameters" }))).toBe(
      "Meta: Your template has adjacent parameters",
    );
    // El enum ya está traducido a nuestra voz: firmarlo diría «Meta» dos veces.
    expect(hsmStatusNote(hsm({ approval_status: "rejected", rejected_reason: "INVALID_FORMAT" }))).toBe(
      "El formato no le vale a Meta: revisa variables, saltos y puntuación",
    );
    expect(hsmStatusNote(hsm({ approval_status: "rejected" }))).toMatch(/^Corrige el texto/);
  });

  it("la calidad en español, y nada cuando es verde o desconocida", () => {
    expect(hsmQualityLabel("YELLOW")).toBe("media");
    expect(hsmQualityLabel("RED")).toBe("baja");
    expect(hsmQualityLabel("GREEN")).toBeNull();
    expect(hsmQualityLabel("UNKNOWN")).toBeNull();
    expect(hsmQualityLabel(null)).toBeNull();
  });

  it("lo próximo: rechazadas, en revisión y aprobadas con la calidad en baja", () => {
    const next = hsmNextUp([
      hsm({ id: "a", approval_status: "rejected" }),
      hsm({ id: "b", approval_status: "pending" }),
      hsm({ id: "c", quality_score: "YELLOW" }),
      hsm({ id: "d", approval_status: "paused", quality_score: "RED" }),
      hsm({ id: "e" }),
    ]);
    expect(next.rejected.map((t) => t.id)).toEqual(["a"]);
    expect(next.pending.map((t) => t.id)).toEqual(["b"]);
    // La pausada ya no «está por pausarse»: su estado lo dice.
    expect(next.lowQuality.map((t) => t.id)).toEqual(["c"]);
  });

  it("los nombres se resumen a partir del tercero", () => {
    expect(namesLine([hsm({ name: "a" })])).toBe("a");
    expect(namesLine([hsm({ name: "a" }), hsm({ name: "b" })])).toBe("a y b");
    expect(namesLine([hsm({ name: "a" }), hsm({ name: "b" }), hsm({ name: "c" }), hsm({ name: "d" })])).toBe("a, b y 2 más");
  });
});
