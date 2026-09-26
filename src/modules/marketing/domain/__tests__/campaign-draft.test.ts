import type { AudiencePreviewDTO, CampaignDTO } from "../campaign";
import {
  blockerForStep,
  campaignEditHref,
  EMPTY_DRAFT,
  fromCampaignDTO,
  resumeStep,
  toDuplicateCampaignDTO,
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

  it("no deja pasar con un hueco de la plantilla de Meta sin decidir", () => {
    // Meta rechaza el envío ENTERO si sobra o falta un parámetro, así que esto
    // no es un detalle estético: es la diferencia entre llegar y no llegar.
    const pending = draft({
      hsmChannelTemplateId: "h1",
      hsmParamMapping: [
        { index: 1, source: "contact_first_name" },
        { index: 2, source: "static:" },
      ],
    });
    expect(blockerForStep("contenido", pending)).toBe("Falta decir qué va en {{2}}");

    const ready = draft({
      hsmChannelTemplateId: "h1",
      hsmParamMapping: [
        { index: 1, source: "contact_first_name" },
        { index: 2, source: "static:30%" },
      ],
    });
    expect(blockerForStep("contenido", ready)).toBeNull();
  });

  it("el mapeo viaja al servidor, y viaja null si no hay plantilla de Meta", () => {
    const mapping = [{ index: 1, source: "contact_first_name" }];
    expect(
      toUpdateCampaignDTO(draft({ hsmChannelTemplateId: "h1", hsmParamMapping: mapping })),
    ).toMatchObject({ hsm_channel_template_id: "h1", hsm_param_mapping: mapping });
    // Un mapeo huérfano es un 422 en el servidor, y con razón.
    expect(
      toUpdateCampaignDTO(draft({ hsmChannelTemplateId: null, hsmParamMapping: mapping })),
    ).toMatchObject({ hsm_param_mapping: null });
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

describe("retomar y duplicar", () => {
  function saved(over: Partial<CampaignDTO> = {}): CampaignDTO {
    return {
      id: "c9",
      name: "Black Friday",
      description: null,
      status: "draft",
      segment_id: null,
      audience_filters: { lifecycle_stage: ["customer"] },
      template: { id: "t1", name: "Promo", kind: "text" },
      hsm_channel_template_id: "h1",
      hsm_param_mapping: [{ index: 1, source: "contact_first_name" }, { basura: true }],
      scheduled_at: null,
      created_at: "2026-09-20T10:00:00.000Z",
      updated_at: "2026-09-20T10:00:00.000Z",
      ...over,
    } as CampaignDTO;
  }

  it("reconstruye el borrador desde lo guardado, descartando un mapeo corrupto", () => {
    const back = fromCampaignDTO(saved());
    expect(back.audienceMode).toBe("filters");
    expect(back.filters).toEqual({ lifecycle_stage: ["customer"] });
    expect(back.templateId).toBe("t1");
    expect(back.hsmParamMapping).toEqual([{ index: 1, source: "contact_first_name" }]);
    expect(back.scheduledDate).toBe("");
  });

  it("deduce el modo de audiencia: segmento antes que filtros, y si no hay nada, todos", () => {
    expect(fromCampaignDTO(saved({ segment_id: "s1" })).audienceMode).toBe("segment");
    expect(fromCampaignDTO(saved({ audience_filters: null })).audienceMode).toBe("all");
  });

  it("devuelve la fecha programada en hora local, como la escribió el usuario", () => {
    const at = new Date(2099, 0, 5, 9, 30);
    const back = fromCampaignDTO(saved({ scheduled_at: at.toISOString() }));
    expect(back.scheduledDate).toBe("2099-01-05");
    expect(back.scheduledTime).toBe("09:30");
  });

  it("retoma en el primer paso que falta; completo, en la revisión", () => {
    expect(resumeStep(fromCampaignDTO(saved()))).toBe("revision");
    expect(resumeStep(fromCampaignDTO(saved({ template: null, hsm_channel_template_id: null })))).toBe("contenido");
    expect(resumeStep(fromCampaignDTO(saved({ name: "" })))).toBe("audiencia");
  });

  it("duplicar no copia la fecha y el nombre cabe en los 80 del servidor", () => {
    const copy = toDuplicateCampaignDTO(saved({ name: "x".repeat(80), scheduled_at: "2099-01-01T00:00:00.000Z" }));
    expect(copy.name).toHaveLength(80);
    expect(copy.name.startsWith("Copia de ")).toBe(true);
    expect(copy.scheduled_at ?? null).toBeNull();
    expect(copy.template_id).toBe("t1");
  });

  it("el enlace de edición escapa el id", () => {
    expect(campaignEditHref("a b")).toBe("/marketing/campaigns/new?campaign=a%20b");
  });
});
