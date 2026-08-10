import type { AudiencePreviewDTO } from "../campaign";
import {
  blockerForStep,
  EMPTY_DRAFT,
  defaultScheduleSlot,
  isScheduleInThePast,
  readAudienceEstimate,
  scheduledAtISO,
  toCreateCampaignDTO,
  toUpdateCampaignDTO,
  WIZARD_STEPS,
  type CampaignDraft,
} from "../campaign-draft";

function draft(over: Partial<CampaignDraft> = {}): CampaignDraft {
  return { ...EMPTY_DRAFT, name: "Black Friday", segmentId: "s1", ...over };
}

describe("blockerForStep", () => {
  it("dice QUÉ falta, no solo que falta algo", () => {
    expect(blockerForStep("audiencia", draft({ name: "ab" }))).toContain("3 caracteres");
    expect(blockerForStep("audiencia", draft({ segmentId: null }))).toContain("segmento");
    expect(blockerForStep("contenido", draft())).toContain("plantilla");
  });

  it("deja pasar la audiencia mínima válida", () => {
    expect(blockerForStep("audiencia", draft())).toBeNull();
    // "Todos los contactos" y "filtros a medida" no exigen segmento.
    expect(blockerForStep("audiencia", draft({ audienceMode: "all", segmentId: null }))).toBeNull();
    expect(
      blockerForStep("audiencia", draft({ audienceMode: "filters", segmentId: null })),
    ).toBeNull();
  });

  it("acepta cualquiera de las dos fuentes de contenido", () => {
    expect(blockerForStep("contenido", draft({ templateId: "t1" }))).toBeNull();
    expect(blockerForStep("contenido", draft({ hsmChannelTemplateId: "h1" }))).toBeNull();
  });

  it("exige día y hora juntos, o ninguno", () => {
    expect(blockerForStep("programacion", draft())).toBeNull();
    expect(blockerForStep("programacion", draft({ scheduledDate: "2026-08-08" }))).toContain("hora");
    expect(blockerForStep("programacion", draft({ scheduledTime: "09:00" }))).toContain("día");
    expect(
      blockerForStep("programacion", draft({ scheduledDate: "2026-08-08", scheduledTime: "09:00" })),
    ).toBeNull();
  });

  it("cubre los cuatro pasos declarados", () => {
    for (const step of WIZARD_STEPS) {
      expect(() => blockerForStep(step, draft())).not.toThrow();
    }
  });
});

describe("programación", () => {
  it("compone fecha y hora locales en ISO", () => {
    const iso = scheduledAtISO(draft({ scheduledDate: "2026-08-08", scheduledTime: "09:00" }));
    expect(iso).toMatch(/^2026-08-08T/);
  });

  it("sin fecha completa, la campaña sale de inmediato", () => {
    expect(scheduledAtISO(draft())).toBeNull();
    expect(scheduledAtISO(draft({ scheduledDate: "2026-08-08" }))).toBeNull();
  });

  it("detecta una fecha ya pasada: el backend la lanzaría al instante", () => {
    const now = new Date("2026-08-06T12:00:00.000Z");
    expect(
      isScheduleInThePast(draft({ scheduledDate: "2026-08-01", scheduledTime: "09:00" }), now),
    ).toBe(true);
    expect(
      isScheduleInThePast(draft({ scheduledDate: "2026-09-01", scheduledTime: "09:00" }), now),
    ).toBe(false);
    expect(isScheduleInThePast(draft(), now)).toBe(false);
  });

  it("el hueco por defecto siempre cae en el futuro y en horario decente", () => {
    // Media tarde: dos horas más, en punto, del mismo día.
    expect(defaultScheduleSlot(new Date(2026, 7, 6, 13, 42))).toEqual({
      date: "2026-08-06",
      time: "15:00",
    });
    // De noche no se programa nada: se salta a la mañana siguiente.
    expect(defaultScheduleSlot(new Date(2026, 7, 6, 22, 10))).toEqual({
      date: "2026-08-07",
      time: "09:00",
    });
    // Madrugada: el hueco es esa misma mañana, no la del día siguiente.
    expect(defaultScheduleSlot(new Date(2026, 7, 6, 3, 5))).toEqual({
      date: "2026-08-06",
      time: "09:00",
    });
    // Fin de mes: la suma de horas tiene que rodar el mes, no romperlo.
    expect(defaultScheduleSlot(new Date(2026, 7, 31, 23, 30))).toEqual({
      date: "2026-09-01",
      time: "09:00",
    });
  });
});

describe("payloads", () => {
  it("segmento y filtros son EXCLUYENTES: nunca viajan los dos", () => {
    const conSegmento = toUpdateCampaignDTO(
      draft({ audienceMode: "segment", segmentId: "s1", filters: { city: "Bogotá" } }),
    );
    expect(conSegmento.segment_id).toBe("s1");
    expect(conSegmento.audience_filters).toBeNull();

    const conFiltros = toUpdateCampaignDTO(
      draft({ audienceMode: "filters", segmentId: "s1", filters: { city: "Bogotá" } }),
    );
    expect(conFiltros.segment_id).toBeNull();
    expect(conFiltros.audience_filters).toEqual({ city: "Bogotá" });
  });

  it("«todos los contactos» manda ambos en null", () => {
    const dto = toUpdateCampaignDTO(draft({ audienceMode: "all" }));
    expect(dto.segment_id).toBeNull();
    expect(dto.audience_filters).toBeNull();
  });

  it("el alta solo lleva nombre, descripción y audiencia", () => {
    expect(Object.keys(toCreateCampaignDTO(draft())).sort()).toEqual([
      "audience_filters",
      "description",
      "name",
      "segment_id",
    ]);
  });

  it("recorta el nombre y convierte una descripción vacía en null", () => {
    const dto = toCreateCampaignDTO(draft({ name: "  Promo  ", description: "   " }));
    expect(dto.name).toBe("Promo");
    expect(dto.description).toBeNull();
  });
});

describe("readAudienceEstimate", () => {
  function preview(over: Partial<AudiencePreviewDTO> = {}): AudiencePreviewDTO {
    return { total: 1200, sample_size: 1000, sample_opted_out: 167, ...over } as AudiencePreviewDTO;
  }

  it("proyecta las bajas de la muestra al total", () => {
    // 167/1000 sobre 1200 ≈ 200 bajas → 1000 alcanzables.
    const estimate = readAudienceEstimate(preview());
    expect(estimate.estimatedOptedOut).toBe(200);
    expect(estimate.estimatedReach).toBe(1000);
    expect(estimate.exact).toBe(false);
  });

  it("marca EXACTO cuando la muestra cubrió a todos", () => {
    const estimate = readAudienceEstimate(preview({ total: 500, sample_size: 500, sample_opted_out: 50 }));
    expect(estimate.estimatedOptedOut).toBe(50);
    expect(estimate.exact).toBe(true);
  });

  it("una audiencia vacía no divide por cero", () => {
    const estimate = readAudienceEstimate(preview({ total: 0, sample_size: 0, sample_opted_out: 0 }));
    expect(estimate).toEqual({
      total: 0,
      estimatedOptedOut: 0,
      estimatedReach: 0,
      sampleSize: 0,
      exact: true,
    });
  });

  it("la proyección nunca supera el total ni deja alcance negativo", () => {
    const estimate = readAudienceEstimate(
      preview({ total: 100, sample_size: 10, sample_opted_out: 10 }),
    );
    expect(estimate.estimatedOptedOut).toBe(100);
    expect(estimate.estimatedReach).toBe(0);
  });
});
