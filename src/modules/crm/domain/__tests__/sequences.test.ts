import {
  lastStepAt,
  offsetLabel,
  SEQUENCE_TEMPLATES,
  toUpsertDTO,
  validateSequence,
  type DraftStep,
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
  it("las tres son válidas tal cual: son el punto de partida, no un borrador roto", () => {
    for (const template of SEQUENCE_TEMPLATES) {
      expect(validateSequence({ name: template.name, steps: template.steps })).toEqual([]);
    }
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
