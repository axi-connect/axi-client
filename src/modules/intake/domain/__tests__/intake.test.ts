import {
  currentTopic,
  draftOf,
  fichaCounts,
  handoffNote,
  isEditableInline,
  isStructuredList,
  reviewQueue,
  skipLabel,
  sourceLabel,
  toListItems,
  topicState,
  valueFromDraft,
  type IntakeProgress,
  type IntakeTopicView,
} from "../intake";

function field(overrides: Partial<IntakeTopicView["fields"][number]> = {}) {
  return {
    code: "a",
    label: "A",
    kind: "text" as const,
    required: false,
    help: null,
    options: null,
    value: null,
    display: null,
    source: null,
    needs_confirmation: false,
    skipped: null,
    ...overrides,
  };
}

function progress(
  topics: { status: IntakeProgress["topics"][number]["status"]; deferred?: boolean }[],
  percent: number,
): IntakeProgress {
  return {
    topics: topics.map((topic, index) => ({
      code: `t${String(index)}`,
      title: `Tema ${String(index)}`,
      required: 1,
      resolved: topic.status === "done" ? 1 : 0,
      pending_confirmation: 0,
      captured: 0,
      answered: 0,
      skipped: 0,
      open: 0,
      total: 1,
      deferred: topic.deferred ?? false,
      status: topic.status,
    })),
    percent,
    next_topic: null,
    next_field: null,
    has_pending_required: false,
    has_pending_confirmation: false,
    essential: { confirmed: 2, total: 5, complete: false },
    pending_review: 1,
    next_ask: null,
  };
}

describe("fichaCounts", () => {
  /**
   * Informe de la entrevista, rec. 9 y 10: lo esencial cuenta solo lo
   * confirmado (lo da el servidor), y «no aplica» no se mezcla con «no lo sé».
   */
  it("separa lo confirmado, lo por revisar, lo por definir y lo que no aplica", () => {
    const topics: IntakeTopicView[] = [
      {
        code: "t1",
        title: "T1",
        fields: [
          field({ code: "a", value: "x", source: "derived", needs_confirmation: true }),
          field({ code: "b", skipped: { reason: "no_sabe", source: "chat", note: null } }),
          field({ code: "c", skipped: { reason: "no_aplica", source: "ficha", note: null } }),
          field({ code: "d", skipped: { reason: "luego", source: "chat", note: null } }),
        ],
      },
    ];
    expect(fichaCounts(topics, progress([{ status: "in_progress" }], 0))).toEqual({
      confirmed: 2,
      total: 5,
      review: 1,
      undefined: 1,
      notApplicable: 1,
    });
  });
});

describe("reviewQueue", () => {
  it("devuelve lo encontrado o propuesto que sigue sin confirmar, en el orden del guion", () => {
    const topics: IntakeTopicView[] = [
      {
        code: "t1",
        title: "T1",
        fields: [
          field({ code: "a", value: "x", source: "derived", needs_confirmation: true }),
          field({ code: "b", value: "y", source: "stated" }),
          field({ code: "c", value: "z", source: "known" }),
        ],
      },
      { code: "t2", title: "T2", fields: [field({ code: "d", value: ["e"], source: "proposed", needs_confirmation: true })] },
    ];
    expect(reviewQueue(topics).map((row) => row.code)).toEqual(["a", "d"]);
  });
});

describe("topicState / currentTopic", () => {
  /** Rec. 10 y 17: el estado en palabras, y lo precargado no parece terminado. */
  it("dice el estado de cada tema en palabras", () => {
    const base = progress([{ status: "done" }], 100).topics[0];
    if (base === undefined) throw new Error("sin tema");
    expect(topicState({ ...base, status: "done" })).toEqual({ label: "Confirmado", tone: "done" });
    expect(topicState({ ...base, status: "in_progress", pending_confirmation: 2 }).label).toBe(
      "Pendiente de confirmar · 2 datos",
    );
    expect(topicState({ ...base, status: "in_progress", answered: 1, total: 3 }).label).toBe("En curso · 1 de 3");
    expect(topicState({ ...base, status: "pending" })).toEqual({ label: "Sin empezar", tone: "waiting" });
    expect(topicState({ ...base, status: "deferred", deferred: true }).tone).toBe("deferred");
  });

  it("el tema de ahora es el que está en curso, o el que Alba preguntará", () => {
    const p = progress([{ status: "done" }, { status: "pending" }, { status: "in_progress" }], 33);
    expect(currentTopic(p)?.code).toBe("t2");
    const next = { ...progress([{ status: "done" }, { status: "pending" }], 50), next_ask: { topic: "t1", field: "x" } };
    expect(currentTopic(next)?.code).toBe("t1");
  });
});

describe("skipLabel", () => {
  it("«Por definir» y «Para después», sin reproche", () => {
    expect(skipLabel({ reason: "no_sabe", source: "chat", note: null })).toBe("Por definir");
    expect(skipLabel({ reason: "luego", source: "chat", note: null })).toBe("Para después");
    expect(skipLabel({ reason: "no_aplica", source: "niche", note: null })).toBe("No aplica a tu tipo de negocio");
  });
});

describe("draftOf / valueFromDraft", () => {
  it("ida y vuelta entre el valor y el texto editable", () => {
    expect(draftOf({ value: ["a", "b"] })).toBe("a, b");
    expect(draftOf({ value: true })).toBe("sí");
    expect(valueFromDraft({ kind: "list" }, " a , b ,")).toEqual(["a", "b"]);
    expect(valueFromDraft({ kind: "boolean" }, "Sí")).toBe(true);
    expect(valueFromDraft({ kind: "text" }, "   ")).toBeNull();
  });
});

describe("sourceLabel", () => {
  it("solo etiqueta lo que aporta: lo que dijo la persona no lleva sello", () => {
    expect(sourceLabel("stated")).toBeNull();
    expect(sourceLabel(null)).toBeNull();
    expect(sourceLabel("known")).toBe("Ya lo teníamos");
    expect(sourceLabel("derived")).toBe("Lo vi en su web");
    expect(sourceLabel("proposed")).toBe("Propuesto para tu tipo de negocio");
  });
});

describe("isEditableInline", () => {
  /**
   * Los que faltan se recogen igual —hablando— pero no tienen un control
   * decente que quepa en una fila. Inventar aquí un editor de horarios sería
   * reconstruir el panel dentro de la pantalla que vino a sustituirlo.
   */
  it("deja fuera los tipos sin control de una línea", () => {
    expect(isEditableInline("text")).toBe(true);
    expect(isEditableInline("choice")).toBe(true);
    expect(isEditableInline("weekly_hours")).toBe(false);
    expect(isEditableInline("faq_list")).toBe(false);
  });
});

describe("isStructuredList / toListItems / handoffNote", () => {
  it("solo las listas se corrigen elemento a elemento", () => {
    expect(isStructuredList("list")).toBe(true);
    expect(isStructuredList("multi_choice")).toBe(true);
    expect(isStructuredList("long_text")).toBe(false);
    expect(isStructuredList("choice")).toBe(false);
  });

  it("lee una lista de textos y descarta lo que no lo es", () => {
    expect(toListItems(["Consulta", " Pago ", "", 7, null])).toEqual([
      "Consulta",
      "Pago",
      "7",
    ]);
    expect(toListItems("Consulta, Pago")).toEqual([]);
    expect(toListItems(null)).toEqual([]);
  });

  it("el `help` del guion gana sobre la regla por defecto", () => {
    expect(handoffNote("list", "Tu propio aviso")).toBe("Tu propio aviso");
    expect(handoffNote("list", null)).toContain("Solo se añade lo que falte");
    expect(handoffNote("list", "   ")).toContain("Solo se añade lo que falte");
    expect(handoffNote("long_text", null)).toBe("");
  });
});
