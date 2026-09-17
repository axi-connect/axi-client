import {
  countCaptured,
  handoffNote,
  isEditableInline,
  isStructuredList,
  pendingConfirmations,
  progressLabel,
  sourceLabel,
  toListItems,
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
      total: 1,
      deferred: topic.deferred ?? false,
      status: topic.status,
    })),
    percent,
    next_topic: null,
    has_pending_required: false,
    has_pending_confirmation: false,
  };
}

describe("countCaptured", () => {
  it("cuenta los campos con valor, no los temas", () => {
    const topics: IntakeTopicView[] = [
      {
        code: "t1",
        title: "T1",
        fields: [field({ code: "a", value: "x" }), field({ code: "b" })],
      },
      { code: "t2", title: "T2", fields: [field({ code: "c", value: 3 })] },
    ];
    expect(countCaptured(topics)).toEqual({ filled: 2, total: 3 });
  });
});

describe("pendingConfirmations", () => {
  it("devuelve solo lo deducido de la web que sigue sin confirmar", () => {
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
    ];
    expect(pendingConfirmations(topics).map((row) => row.code)).toEqual(["a"]);
  });
});

describe("progressLabel", () => {
  /**
   * Es copy, no un porcentaje: quien contesta no está midiendo su rendimiento,
   * le está haciendo un favor a su negocio entre dos cosas.
   */
  it("anima en vez de auditar", () => {
    expect(progressLabel(progress([{ status: "done" }, { status: "done" }], 100))).toBe(
      "Ya está todo",
    );
    expect(progressLabel(progress([{ status: "pending" }, { status: "pending" }], 0))).toBe(
      "Empezamos",
    );
    expect(progressLabel(progress([{ status: "done" }, { status: "pending" }], 50))).toBe(
      "Queda uno",
    );
  });

  it("un tema aplazado no cuenta como pendiente", () => {
    const label = progressLabel(
      progress([{ status: "done" }, { status: "pending", deferred: true }], 100),
    );
    expect(label).toBe("Ya está todo");
  });

  it("con varios pendientes dice cuántos", () => {
    expect(
      progressLabel(
        progress([{ status: "done" }, { status: "pending" }, { status: "pending" }], 33),
      ),
    ).toBe("Quedan 2");
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
