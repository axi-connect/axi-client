import {
  CADENCE_CHANNELS,
  CADENCE_CHANNEL_LABELS,
  EXHAUSTED_ACTIONS,
  EXHAUSTED_ACTION_LABELS,
  STAGE_KINDS,
  STAGE_KIND_HINTS,
  STAGE_KIND_LABELS,
  STAGE_KIND_ORDER,
  cadenceSummary,
  daysInStageLabel,
  autoAdvanceAfterKindChange,
  autoAdvanceHint,
  journeyExplainerText,
  readJourneySwitches,
  isRevertibleMove,
  journeyRuleLabel,
  lifecycleSourceLabel,
  moverLabel,
  stageDeadline,
  waitLabel,
  waitOptionLabel,
  type JourneyStageDTO,
} from "@/modules/crm/domain/journey";

function stage(over: Partial<JourneyStageDTO> = {}): Pick<JourneyStageDTO, "cadence" | "rotting_days"> {
  return {
    cadence: { max_attempts: 4, wait_hours: 48, channel: "message", exhausted_action: "mark_lost" },
    rotting_days: 10,
    ...over,
  };
}

describe("catálogo de kinds", () => {
  it("todo kind tiene label y frase: un kind nuevo del servidor rompe aquí, no en pantalla", () => {
    for (const kind of STAGE_KINDS) {
      expect(STAGE_KIND_LABELS[kind]).toBeTruthy();
      expect(STAGE_KIND_HINTS[kind]).toBeTruthy();
    }
  });

  it("el orden semántico cubre todos los kinds menos «Personalizada», sin repetir", () => {
    expect(new Set(STAGE_KIND_ORDER).size).toBe(STAGE_KIND_ORDER.length);
    expect([...STAGE_KIND_ORDER].sort()).toEqual(
      STAGE_KINDS.filter((kind) => kind !== "custom").sort(),
    );
  });

  it("Ganado y Perdido no son kinds: son el estado de la oportunidad", () => {
    expect(STAGE_KINDS).not.toContain("won");
    expect(STAGE_KINDS).not.toContain("lost");
  });

  it("Personalizada apaga «Se mueve sola» y volver a un tipo lo enciende: ida y vuelta", () => {
    expect(autoAdvanceAfterKindChange("proposal", "custom", true)).toBe(false);
    expect(autoAdvanceAfterKindChange("custom", "proposal", false)).toBe(true);
    // Entre dos tipos con reglas manda lo que el negocio había decidido.
    expect(autoAdvanceAfterKindChange("proposal", "meeting", false)).toBe(false);
    expect(autoAdvanceAfterKindChange("proposal", "meeting", true)).toBe(true);
  });

  it("canales y acciones al agotarse tienen label", () => {
    for (const channel of CADENCE_CHANNELS) expect(CADENCE_CHANNEL_LABELS[channel]).toBeTruthy();
    for (const action of EXHAUSTED_ACTIONS) expect(EXHAUSTED_ACTION_LABELS[action]).toBeTruthy();
  });
});

describe("cadenceSummary", () => {
  it("la línea completa: intentos · espera · canal · máximo · luego", () => {
    expect(cadenceSummary(stage())).toBe(
      "4 intentos · cada 2 días · mensaje · máx. 10 días · al agotarse: marcar perdida",
    );
  });

  it("horas cuando la espera no llega al día", () => {
    expect(
      cadenceSummary(
        stage({
          cadence: { max_attempts: 1, wait_hours: 4, channel: "call_then_message", exhausted_action: "hand_to_human" },
          rotting_days: null,
        }),
      ),
    ).toBe("1 intento · cada 4 h · llamada y luego mensaje · al agotarse: pasar a una persona");
  });

  it("sin cadencia dice «Sin cadencia» y conserva el tiempo máximo", () => {
    expect(cadenceSummary(stage({ cadence: null }))).toBe("Sin cadencia · máx. 10 días");
    expect(cadenceSummary(stage({ cadence: null, rotting_days: null }))).toBe("Sin cadencia");
    expect(cadenceSummary(stage({ cadence: null, rotting_days: 1 }))).toBe("Sin cadencia · máx. 1 día");
  });
});

describe("formato de esperas", () => {
  it("24 h es «cada día»; 36 h no es múltiplo y se queda en horas", () => {
    expect(waitLabel(24)).toBe("cada día");
    expect(waitLabel(36)).toBe("cada 36 h");
    expect(waitLabel(168)).toBe("cada 7 días");
  });

  it("las opciones del selector", () => {
    expect(waitOptionLabel(1)).toBe("1 h");
    expect(waitOptionLabel(24)).toBe("1 día");
    expect(waitOptionLabel(72)).toBe("3 días");
  });
});

describe("la ficha del contacto", () => {
  it("cuánto lleva en la etapa", () => {
    expect(daysInStageLabel(0)).toBe("hoy");
    expect(daysInStageLabel(1)).toBe("1 día");
    expect(daysInStageLabel(6)).toBe("6 días");
  });

  it("el vencimiento suma los días al ingreso; sin máximo no hay vencimiento", () => {
    expect(stageDeadline("2026-09-23T10:00:00.000Z", 10)?.toISOString()).toBe("2026-10-03T10:00:00.000Z");
    expect(stageDeadline("2026-09-23T10:00:00.000Z", null)).toBeNull();
    expect(stageDeadline("no-es-fecha", 3)).toBeNull();
  });

  it("quién la movió, en la voz de la ficha", () => {
    expect(moverLabel({ actor_type: "ai_agent", actor_name: "Sofía" })).toBe("el agente Sofía");
    expect(moverLabel({ actor_type: "ai_agent", actor_name: null })).toBe("el agente IA");
    expect(moverLabel({ actor_type: "system", actor_name: null })).toBe("una regla");
    expect(moverLabel({ actor_type: "user", actor_name: "Ana" })).toBe("Ana");
    expect(moverLabel({ actor_type: "user", actor_name: null })).toBe("una persona");
  });

  it("el evento que cambió el ciclo de vida se traduce; uno desconocido calla", () => {
    expect(lifecycleSourceLabel("order.created")).toBe("pedido creado");
    expect(lifecycleSourceLabel("something.else")).toBeNull();
    expect(lifecycleSourceLabel(null)).toBeNull();
  });

  it("«Deshacer» se ofrece salvo pago verificado, etapa borrada o veto explícito del servidor", () => {
    expect(isRevertibleMove({ rule_code: null })).toBe(true);
    expect(isRevertibleMove({ rule_code: "appointment_booked" })).toBe(true);
    expect(isRevertibleMove({ rule_code: "paid" })).toBe(false);
    expect(isRevertibleMove({ rule_code: "stage_deleted" })).toBe(false);
    expect(isRevertibleMove({ rule_code: null, revertible: false })).toBe(false);
    // Si el servidor lo afirma, manda él aunque la regla diga lo contrario.
    expect(isRevertibleMove({ rule_code: "paid", revertible: true })).toBe(true);
  });

  it("las reglas se cuentan en español y un código desconocido no se rompe", () => {
    expect(journeyRuleLabel("first_reply")).toBe("primera respuesta del cliente");
    expect(journeyRuleLabel("appointment_booked")).toBe("cita agendada");
    expect(journeyRuleLabel("something_new")).toBe("something new");
    expect(journeyRuleLabel(null)).toBeNull();
  });
});

describe("interruptores del recorrido (Q8)", () => {
  const off = { rules: false, ai: false };
  const all = { rules: true, ai: true };

  it("sin el campo o con valores no booleanos, apagado", () => {
    expect(readJourneySwitches(undefined)).toEqual(off);
    expect(readJourneySwitches({})).toEqual(off);
    expect(readJourneySwitches({ switches: { rules_enabled: true, ai_stage_moves_enabled: false } })).toEqual({ rules: true, ai: false });
  });

  it("el explicador no promete lo apagado", () => {
    const none = journeyExplainerText(off);
    expect(`${none.lead} ${none.tail}`).toMatch(/avance automático está apagado/);
    expect(`${none.lead} ${none.tail}`).not.toMatch(/agente/);
    const rulesOnly = journeyExplainerText({ rules: true, ai: false });
    expect(rulesOnly.emphasis).toBeNull();
    expect(rulesOnly.tail).toMatch(/El agente no mueve etapas/);
    const aiOnly = journeyExplainerText({ rules: false, ai: true });
    expect(aiOnly.lead).toMatch(/apagado/);
    expect(aiOnly.emphasis).toMatch(/agente sí puede/);
    expect(journeyExplainerText(all).emphasis).toBe("El agente también puede moverla por su criterio.");
  });

  it("la pista de «Se mueve sola» por etapa", () => {
    const on = { stage_kind: "proposal" as const, auto_advance: true };
    const manual = { stage_kind: "proposal" as const, auto_advance: false };
    expect(autoAdvanceHint({ stage_kind: "custom", auto_advance: false }, all)).toMatch(/personalizada/);
    expect(autoAdvanceHint(on, all)).toBe("Sus eventos la mueven; el agente también puede.");
    expect(autoAdvanceHint(on, { rules: true, ai: false })).toBe("Sus eventos la mueven.");
    expect(autoAdvanceHint(on, off)).toBe("El avance automático está apagado para tu negocio; hoy solo una persona la mueve.");
    expect(autoAdvanceHint(on, { rules: false, ai: true })).toMatch(/solo una persona o el agente/);
    expect(autoAdvanceHint(manual, off)).toBe("Apagado: solo una persona la mueve.");
    expect(autoAdvanceHint(manual, all)).toBe("Apagado: solo una persona o el agente la mueven.");
  });
});
