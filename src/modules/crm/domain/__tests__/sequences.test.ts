import {
  lastStepAt,
  messageTemplateOf,
  offsetLabel,
  smsSegments,
  SEQUENCE_TEMPLATES,
  toUpsertDTO,
  validateSequence,
  type DraftStep,
  sequenceStory,
  enrollmentDisplayStatus,
} from "../sequences";

const NOW = new Date("2026-09-15T14:00:00.000Z");

function step(over: Partial<DraftStep> = {}): DraftStep {
  return {
    offset_hours: 0,
    task_channel: "message",
    objective: "Presentarnos y preguntar qué necesita",
    ...over,
  };
}

describe("sequences — cómo se lee una espera", () => {
  it("traduce horas a lo que el operador piensa", () => {
    expect(offsetLabel(0)).toBe("Al inscribir");
    expect(offsetLabel(6)).toBe("+6 h");
    expect(offsetLabel(24)).toBe("+1 día");
    expect(offsetLabel(120)).toBe("+5 días");
  });

  it("dice cuándo recibiría el último paso quien se inscriba ahora", () => {
    const at = lastStepAt([{ offset_hours: 0 }, { offset_hours: 120 }], NOW);
    expect(at?.toISOString()).toBe("2026-09-20T14:00:00.000Z");
    expect(lastStepAt([], NOW)).toBeNull();
  });
});

describe("sequences — qué impide guardar", () => {
  it("una secuencia con nombre y un paso válido pasa", () => {
    expect(validateSequence({ name: "Post-captación", steps: [step()] })).toEqual([]);
  });

  it("señala el PASO concreto, no «hay un error»", () => {
    const problems = validateSequence({
      name: "Post-captación",
      steps: [step(), step({ offset_hours: 48, objective: "corto" })],
    });
    expect(problems).toEqual([
      { index: 1, message: "El objetivo es demasiado corto para que el agente lo cumpla" },
    ]);
  });

  it("las esperas tienen que CRECER: si no, dos pasos caen a la vez", () => {
    // Se miden desde la inscripción, así que un paso que no espera más que el
    // anterior le manda dos mensajes seguidos al cliente.
    const problems = validateSequence({
      name: "Post-captación",
      steps: [step({ offset_hours: 48 }), step({ offset_hours: 48 })],
    });
    expect(problems).toEqual([{ index: 1, message: "Este paso debe esperar más que el anterior" }]);
  });

  it("rechaza sin nombre, sin pasos y con esperas imposibles", () => {
    expect(validateSequence({ name: " ", steps: [] })).toEqual([
      { index: null, message: "Ponle un nombre a la secuencia" },
      { index: null, message: "Una secuencia necesita al menos un paso" },
    ]);
    expect(
      validateSequence({ name: "X Y", steps: [step({ offset_hours: 5000 })] }),
    ).toContainEqual({ index: 0, message: "La espera va entre 0 h y 90 días" });
  });

  it("más de ocho pasos ya no es un seguimiento", () => {
    const many = Array.from({ length: 9 }, (_, i) => step({ offset_hours: i * 24 }));
    expect(validateSequence({ name: "Goteo", steps: many })).toContainEqual({
      index: null,
      message: "Máximo 8 pasos: más que eso es una campaña de goteo",
    });
  });
});

describe("sequences — plantillas de partida", () => {
  it("todas son válidas tal cual: son el punto de partida, no un borrador roto", () => {
    for (const template of SEQUENCE_TEMPLATES) {
      expect(validateSequence({ name: template.name, steps: template.steps })).toEqual([]);
    }
  });

  it("«Reactivación de fríos» llama con el marco de Reactivación", () => {
    const template = SEQUENCE_TEMPLATES.find((candidate) => candidate.key === "reactivation");
    const callSteps = template?.steps.filter((step) => step.task_channel !== "message") ?? [];
    expect(callSteps.length).toBeGreaterThan(0);
    for (const step of callSteps) expect(step.call_type).toBe("reactivation");
  });
});

describe("sequences — lo que viaja al backend", () => {
  it("el ORDEN de la lista es la posición; las esperas van tal cual", () => {
    const dto = toUpsertDTO({
      name: "  Post-captación  ",
      description: "  ",
      stop_on_reply: true,
      stop_on_conversion: false,
      is_active: true,
      steps: [step(), step({ offset_hours: 48, task_channel: "call" })],
    });
    expect(dto.name).toBe("Post-captación");
    expect(dto.description).toBeNull();
    expect(dto.stop_on_conversion).toBe(false);
    expect(dto.steps.map((s) => [s.offset_hours, s.task_channel])).toEqual([
      [0, "message"],
      [48, "call"],
    ]);
  });
});

describe("sequenceStory — la secuencia desde el contacto", () => {
  const from = new Date("2026-09-28T09:00:00"); // lunes
  const step = (offset_hours: number, task_channel: "message" | "call" = "message", objective = "x") => ({ offset_hours, task_channel, objective });

  it("cuenta los pasos y el tramo, ordenados por día, con la fecha de quien entra hoy", () => {
    const story = sequenceStory({ steps: [step(72, "call", "Agendar"), step(0, "message", " Bienvenida "), step(168)], stop_on_reply: true }, from);
    expect(story?.headline).toBe("3 pasos en 7 días. Si responde en cualquiera, se detiene y el agente conversa.");
    expect(story?.days.map((day) => [day.channel, day.objective])).toEqual([
      ["message", "Bienvenida"],
      ["call", "Agendar"],
      ["message", "x"],
    ]);
    expect(story?.days[0].when).toMatch(/lun/);
    expect(story?.days[1].when).toMatch(/jue/);
  });

  it("sin parar al responder lo dice; un paso en singular; sin pasos no hay historia", () => {
    expect(sequenceStory({ steps: [step(4)], stop_on_reply: false }, from)?.headline).toBe("Un paso. Sigue aunque responda.");
    expect(sequenceStory({ steps: [], stop_on_reply: true }, from)).toBeNull();
  });
});

describe("sequences — correo, SMS y tarea manual (P3a)", () => {
  it("el correo exige asunto y texto; el SMS, texto y como mucho 600 caracteres", () => {
    const email = validateSequence({
      name: "Radar",
      steps: [step({ task_channel: "email", subject: "", body: "" })],
    });
    expect(email.map((problem) => problem.message)).toEqual([
      "El correo necesita un asunto",
      "El correo necesita un texto",
    ]);
    const sms = validateSequence({ name: "Radar", steps: [step({ task_channel: "sms", body: "x".repeat(601) })] });
    expect(sms[0]?.message).toMatch(/600 caracteres/);
  });

  it("el texto viaja solo donde aplica, y el asunto solo en el correo", () => {
    expect(messageTemplateOf(step({ task_channel: "email", subject: " Hola ", body: " Texto " }))).toEqual({
      subject: "Hola",
      body: "Texto",
    });
    expect(messageTemplateOf(step({ task_channel: "sms", subject: "ignorado", body: "Hola" }))).toEqual({
      subject: null,
      body: "Hola",
    });
    // La manual sin texto sugerido no manda nada; un mensaje nunca lleva texto propio.
    expect(messageTemplateOf(step({ task_channel: "manual", body: "" }))).toBeNull();
    expect(messageTemplateOf(step({ task_channel: "message", body: "no" }))).toBeNull();
  });

  it("la plantilla Radar B2B son 8 toques en 14 días y mezcla canales", () => {
    const radar = SEQUENCE_TEMPLATES.find((template) => template.key === "radar_b2b");
    expect(radar?.steps).toHaveLength(8);
    expect(radar?.steps.at(-1)?.offset_hours).toBe(14 * 24);
    expect(new Set(radar?.steps.map((entry) => entry.task_channel))).toEqual(
      new Set(["email", "manual", "call", "sms"]),
    );
  });

  it("cuenta los segmentos de SMS como Twilio: 160 sin tildes, 70 con ellas", () => {
    expect(smsSegments("")).toBe(0);
    expect(smsSegments("a".repeat(160))).toBe(1);
    expect(smsSegments("a".repeat(161))).toBe(2);
    expect(smsSegments("á".repeat(70))).toBe(1);
    expect(smsSegments("á".repeat(71))).toBe(2);
  });
});

describe("sequences — «ahora no» (P3b)", () => {
  it("una activa dormida se enseña como «Dormida»; lo demás, como viene", () => {
    expect(enrollmentDisplayStatus({ status: "active", snoozed_until: "2026-11-14T15:00:00Z" })).toBe("snoozed");
    expect(enrollmentDisplayStatus({ status: "active", snoozed_until: null })).toBe("active");
    // Cerrada no hay nada que despertar, aunque quedara la fecha.
    expect(enrollmentDisplayStatus({ status: "stopped", snoozed_until: "2026-11-14T15:00:00Z" })).toBe("stopped");
  });
});

describe("sequences — marco de la llamada de cada paso (plan de modos §7)", () => {
  const input = (steps: Parameters<typeof toUpsertDTO>[0]["steps"]) => ({
    name: "Cobro suave",
    description: "",
    stop_on_reply: true,
    stop_on_conversion: true,
    is_active: false,
    steps,
  });

  it("un paso que llama lleva su marco (o el de siempre); uno de mensajes, ninguno", () => {
    const dto = toUpsertDTO(
      input([
        { offset_hours: 0, task_channel: "message", objective: "Recordar la propuesta por WhatsApp", call_type: "sales_followup" },
        { offset_hours: 48, task_channel: "call", objective: "Llamar para retomar la propuesta", call_type: "sales_followup" },
        { offset_hours: 96, task_channel: "call_then_message", objective: "Último intento antes de pasarlo al equipo" },
      ]),
    );
    expect(dto.steps[0]).not.toHaveProperty("call_type");
    expect(dto.steps[1]).toMatchObject({ call_type: "sales_followup" });
    expect(dto.steps[2]).toMatchObject({ call_type: "followup" });
  });
});

