import {
  lastStepAt,
  messageTemplateOf,
  offsetLabel,
  smsSegments,
  SEQUENCE_TEMPLATES,
  toDraftStep,
  toUpsertDTO,
  validateSequence,
  type DraftStep,
  type SequenceStepDTO,
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
      validateSequence({ name: "X Y", steps: [step({ offset_hours: 9000 })] }),
    ).toContainEqual({ index: 0, message: "La espera va entre 0 h y 365 días" });
  });

  it("más de doce pasos no cabe (P3b-2: un toque al mes durante un año)", () => {
    const many = Array.from({ length: 13 }, (_, i) => step({ offset_hours: i * 24 }));
    expect(validateSequence({ name: "Goteo", steps: many })).toContainEqual({
      index: null,
      message: "Máximo 12 pasos: un toque al mes durante un año",
    });
  });
});

describe("sequences — plantillas de partida", () => {
  it("todas son válidas tal cual: son el punto de partida, no un borrador roto", () => {
    for (const template of SEQUENCE_TEMPLATES.filter((candidate) => candidate.key !== "relationship")) {
      expect(validateSequence({ name: template.name, steps: template.steps })).toEqual([]);
    }
  });

  it("«Reactivación de fríos» llama con el marco de Reactivación", () => {
    const template = SEQUENCE_TEMPLATES.find((candidate) => candidate.key === "reactivation");
    const callSteps = template?.steps.filter((step) => step.task_channel !== "message") ?? [];
    expect(callSteps.length).toBeGreaterThan(0);
    for (const step of callSteps) expect(step.call_type).toBe("reactivation");
  });

  it("P3b-2 · la de relación NO se guarda sin completar sus corchetes: sin casos ni datos inventados", () => {
    const relationship = SEQUENCE_TEMPLATES.find((template) => template.key === "relationship");
    expect(relationship?.steps).toHaveLength(12);
    const problems = validateSequence({ name: relationship?.name ?? "", steps: relationship?.steps ?? [] });
    // Lo único que falta es lo que solo el negocio sabe; y solo en correo y SMS.
    expect(new Set(problems.map((problem) => problem.message))).toEqual(
      new Set(["Completa el texto entre corchetes antes de guardar"]),
    );
    const flagged = new Set(problems.map((problem) => problem.index));
    relationship?.steps.forEach((step, index) => {
      expect(flagged.has(index)).toBe(step.task_channel === "email" || step.task_channel === "sms");
    });
    // Ningún toque repite objetivo: copiar y pegar no le manda tres veces lo mismo.
    const objectives = relationship?.steps.map((step) => step.objective) ?? [];
    expect(new Set(objectives).size).toBe(objectives.length);
    // Un toque al mes: 30, 60… 360 días.
    expect(relationship?.steps.map((step) => step.offset_hours / 24)).toEqual(
      Array.from({ length: 12 }, (_, i) => (i + 1) * 30),
    );
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
      next_sequence_id: null,
      steps: [step(), step({ offset_hours: 48, task_channel: "call" })],
    });
    expect(dto.name).toBe("Post-captación");
    // P3b-2: null VIAJA (ausente, el servidor borraría el encadenado).
    expect(dto).toHaveProperty("next_sequence_id", null);
    expect(dto.description).toBeNull();
    expect(dto.stop_on_conversion).toBe(false);
    expect(dto.steps.map((s) => [s.offset_hours, s.task_channel])).toEqual([
      [0, "message"],
      [48, "call"],
    ]);
  });
});

describe("offsetLabel — la pista de relación se cuenta en meses (P3b-2)", () => {
  it("«+2 meses» desde 60 días exactos; lo demás, en días", () => {
    expect(offsetLabel(60 * 24)).toBe("+2 meses");
    expect(offsetLabel(330 * 24)).toBe("+11 meses");
    expect(offsetLabel(45 * 24)).toBe("+45 días");
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
    next_sequence_id: null,
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

  it("correo, SMS y tarea manual no llevan marco de llamada (P3a)", () => {
    const dto = toUpsertDTO(
      input([
        { offset_hours: 0, task_channel: "email", objective: "Presentarse", subject: "Hola", body: "Texto" },
        { offset_hours: 24, task_channel: "sms", objective: "Recordar", body: "Hola" },
        { offset_hours: 48, task_channel: "manual", objective: "Revisar LinkedIn" },
      ] as Parameters<typeof toUpsertDTO>[0]["steps"]),
    );
    for (const entry of dto.steps) expect(entry).not.toHaveProperty("call_type");
  });
});


/**
 * Hotfix «guardar no borra»: lo que el editor no muestra (la plantilla de
 * WhatsApp del paso; diseño, imagen y botón del correo) va opaco en el
 * borrador y vuelve en el PUT. Datos ficticios (tenant «Norte Studio»).
 */
describe("sequences — guardar no borra lo que el editor no muestra", () => {
  const OPENING = {
    channel_template_id: "0193a000-0000-7000-8000-000000000001",
    channel_id: "0193a000-0000-7000-8000-0000000000c1",
    name: "norte_studio_apertura",
    language: "es",
    params: ["company_name"],
    topic: null,
    header_image: { id: "nicho:estudios", personalize: true },
  };
  const OPENING_INPUT = {
    channel_template_id: OPENING.channel_template_id,
    params: OPENING.params,
    topic: null,
    header_image: OPENING.header_image,
  };
  const BRAND_MAIL = {
    subject: "Una idea para {{business_name}}",
    body: "Hola {{first_name}}: te cuento cómo lo hacemos en Norte Studio.",
    design: "brand" as const,
    header_image: { id: "nicho:estudios", personalize: true },
    cta: { label: "Quiero verlo", target: "whatsapp" as const },
  };
  const stored = (over: Partial<SequenceStepDTO>): SequenceStepDTO => ({
    id: "0193a000-0000-7000-8000-000000000051",
    position: 1,
    offset_hours: 0,
    task_channel: "message",
    call_type: null,
    objective: "Presentarnos y preguntar qué necesita",
    opening_template: null,
    message_template: null,
    ...over,
  });
  const WHATSAPP = stored({ opening_template: OPENING });
  const MAIL = stored({
    position: 2,
    offset_hours: 48,
    task_channel: "email",
    objective: "Contarle la idea con un caso real",
    message_template: BRAND_MAIL,
  });
  const save = (steps: DraftStep[]) =>
    toUpsertDTO({
      name: "Estudios de diseño",
      description: "",
      stop_on_reply: true,
      stop_on_conversion: true,
      is_active: true,
      next_sequence_id: null,
      steps,
    }).steps;

  it("cargar y guardar sin cambios devuelve lo que se cargó", () => {
    const [whatsapp, mail] = save([toDraftStep(WHATSAPP), toDraftStep(MAIL)]);
    expect(whatsapp.opening_template).toEqual(OPENING_INPUT);
    expect(whatsapp.message_template).toBeNull();
    expect(mail.opening_template).toBeNull();
    expect(mail.message_template).toEqual(BRAND_MAIL);
  });

  it("un correo «marca» sin imagen ni botón guarda sus null tal cual", () => {
    const bare = { subject: "Hola", body: "Texto", design: "brand" as const, header_image: null, cta: null };
    const [mail] = save([toDraftStep({ ...MAIL, message_template: bare })]);
    expect(mail.message_template).toEqual(bare);
  });

  it("editar asunto o cuerpo conserva diseño, imagen y botón", () => {
    const draft = { ...toDraftStep(MAIL), subject: "Otro asunto", body: "Otro texto" };
    expect(save([draft])[0].message_template).toEqual({ ...BRAND_MAIL, subject: "Otro asunto", body: "Otro texto" });
  });

  it("un paso SIN nada oculto lo dice con null explícito, no con un campo ausente", () => {
    const plain = stored({ task_channel: "email", message_template: { subject: "Hola", body: "Texto" } });
    const [mail, whatsapp] = save([toDraftStep(plain), toDraftStep(stored({ offset_hours: 24 }))]);
    expect(mail.message_template).toEqual({ subject: "Hola", body: "Texto", design: null, header_image: null, cta: null });
    expect(mail).toHaveProperty("opening_template", null);
    expect(whatsapp).toHaveProperty("opening_template", null);
    expect(whatsapp).toHaveProperty("message_template", null);
  });

  it("un paso nuevo y los de las plantillas nacen sin plantilla ni diseño", () => {
    const [fresh] = save([step()]);
    expect(fresh.opening_template).toBeNull();
    expect(fresh.message_template).toBeNull();
    const radar = SEQUENCE_TEMPLATES.find((template) => template.key === "radar_b2b");
    for (const entry of save([...(radar?.steps ?? [])])) {
      expect(entry.opening_template).toBeNull();
      if (entry.task_channel === "email") expect(entry.message_template).toMatchObject({ design: null, header_image: null, cta: null });
    }
  });

  it("cambiar el MEDIO no arrastra lo que ya no aplica: la plantilla es solo de «Mensaje»", () => {
    const toMail: DraftStep = { ...toDraftStep(WHATSAPP), task_channel: "email", subject: "Hola", body: "Texto" };
    const [mail] = save([toMail]);
    expect(mail.opening_template).toBeNull();
    expect(mail.message_template).toEqual({ subject: "Hola", body: "Texto", design: null, header_image: null, cta: null });
    for (const medium of ["call", "call_then_message", "sms", "manual"] as const) {
      const [moved] = save([{ ...toDraftStep(WHATSAPP), task_channel: medium, body: "Hola" }]);
      expect(moved.opening_template).toBeNull();
    }
  });

  it("cambiar el MEDIO no arrastra lo que ya no aplica: diseño, imagen y botón son solo del correo", () => {
    const [sms] = save([{ ...toDraftStep(MAIL), task_channel: "sms" }]);
    expect(sms.message_template).toEqual({ subject: null, body: BRAND_MAIL.body });
    const [manual] = save([{ ...toDraftStep(MAIL), task_channel: "manual" }]);
    expect(manual.message_template).toEqual({ subject: null, body: BRAND_MAIL.body });
    const [whatsapp] = save([{ ...toDraftStep(MAIL), task_channel: "message" }]);
    expect(whatsapp.message_template).toBeNull();
    expect(whatsapp.opening_template).toBeNull();
  });

  it("cambiar el medio y devolverlo antes de guardar no pierde nada", () => {
    const moved: DraftStep = { ...toDraftStep(WHATSAPP), task_channel: "call" };
    expect(save([{ ...moved, task_channel: "message" }])[0].opening_template).toEqual(OPENING_INPUT);
    const mail: DraftStep = { ...toDraftStep(MAIL), task_channel: "sms" };
    expect(save([{ ...mail, task_channel: "email" }])[0].message_template).toEqual(BRAND_MAIL);
  });

  it("reordenar o quitar pasos: cada uno se lleva lo suyo, nunca lo del vecino", () => {
    const other = stored({
      position: 3,
      offset_hours: 120,
      objective: "Proponer una cita concreta esta semana",
      opening_template: { ...OPENING, channel_template_id: "0193a000-0000-7000-8000-000000000002", header_image: undefined },
    });
    const drafts = [toDraftStep(WHATSAPP), toDraftStep(MAIL), toDraftStep(other)];
    const reordered = save([{ ...drafts[2], offset_hours: 0 }, drafts[1], { ...drafts[0], offset_hours: 120 }]);
    expect(reordered.map((entry) => entry.opening_template?.channel_template_id ?? null)).toEqual([
      "0193a000-0000-7000-8000-000000000002",
      null,
      OPENING.channel_template_id,
    ]);
    expect(reordered[0].opening_template?.header_image).toBeNull();
    expect(reordered[1].message_template).toEqual(BRAND_MAIL);
    const removed = save(drafts.filter((_, index) => index !== 0));
    expect(removed[0].opening_template).toBeNull();
    expect(removed[0].message_template).toEqual(BRAND_MAIL);
    expect(removed[1].opening_template?.channel_template_id).toBe("0193a000-0000-7000-8000-000000000002");
  });
});
