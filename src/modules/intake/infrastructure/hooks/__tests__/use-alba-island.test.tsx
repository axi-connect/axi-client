import { act, renderHook } from "@testing-library/react";

import type { IntakeField, IntakeProgress, IntakeSessionView } from "@/modules/intake/domain/intake";
import { useAlbaIsland } from "../use-alba-island";

const progress = (over: Partial<IntakeProgress> = {}): IntakeProgress => ({
  topics: [
    {
      code: "negocio",
      title: "Tu negocio",
      required: 1,
      resolved: 0,
      pending_confirmation: 0,
      captured: 0,
      answered: 0,
      skipped: 0,
      open: 1,
      total: 1,
      deferred: false,
      status: "in_progress",
    },
  ],
  percent: 0,
  next_topic: "negocio",
  next_field: null,
  has_pending_required: true,
  has_pending_confirmation: false,
  essential: { confirmed: 0, total: 1, complete: false },
  pending_review: 0,
  next_ask: null,
  ...over,
});

const session = (over: Partial<IntakeSessionView> = {}): IntakeSessionView => ({
  status: "in_progress",
  assistant_name: "Alba",
  company_name: "Hagogi",
  invite_name: null,
  estimated_minutes: 0,
  turns_left: 10,
  voice_enabled: true,
  messages: [],
  topics: [],
  progress: progress(),
  closing: null,
  summary: null,
  resume: null,
  ...over,
});

const FIELD: IntakeField = {
  code: "horario",
  label: "Horario",
  kind: "weekly_hours",
  required: true,
  help: null,
  options: null,
  value: [],
  display: "Lunes a sábado, 9 a 18",
  source: "derived",
  needs_confirmation: true,
  skipped: null,
};

const QUESTION = {
  id: "m2",
  body: "",
  question: { question: "¿Atienden en un local?", options: [{ label: "Sí", hint: null }, { label: "No", hint: null }], allow_free_text: true, why: null },
};

type Input = Parameters<typeof useAlbaIsland>[0];
const handlers = () => ({
  onPick: jest.fn(),
  onWrite: jest.fn(),
  onConfirm: jest.fn(),
  onLater: jest.fn(),
  onShowLive: jest.fn(),
  onOpenFinalReview: jest.fn(),
});
const input = (over: Partial<Input> = {}): Input => ({
  active: true,
  session: session(),
  liveQuestion: null,
  reviewField: null,
  liveVisible: true,
  thinking: false,
  listening: false,
  voiceProblem: null,
  review: { line: () => "Lo vi en su web. ¿Es así?", origin: () => "Lo vi en su web" },
  ...handlers(),
  ...over,
});

describe("useAlbaIsland", () => {
  it("D1: la pregunta viva sube a la isla SOLO cuando su burbuja no se ve", () => {
    const { result, rerender } = renderHook((props: Input) => useAlbaIsland(props), {
      initialProps: input({ liveQuestion: QUESTION, liveVisible: true }),
    });
    expect(result.current.current).toBeNull();
    const onPick = jest.fn();
    rerender(input({ liveQuestion: QUESTION, liveVisible: false, onPick }));
    const item = result.current.current;
    expect(item?.kind).toBe("question");
    if (item?.kind !== "question") throw new Error("sin pregunta");
    expect(item.actions.map((action) => action.label)).toEqual(["Sí", "No", "Escribir"]);
    item.actions[0]?.onSelect();
    expect(onPick).toHaveBeenCalledWith("Sí");
  });

  it("la tarjeta de revisión manda sobre la pregunta del chat, con el dato y su origen", () => {
    const onConfirm = jest.fn();
    const { result } = renderHook(() =>
      useAlbaIsland(input({ liveQuestion: QUESTION, reviewField: FIELD, liveVisible: false, onConfirm })),
    );
    const item = result.current.current;
    if (item?.kind !== "question") throw new Error("sin pregunta");
    expect(item.datum).toEqual({ label: "Horario", value: "Lunes a sábado, 9 a 18", origin: "Lo vi en su web" });
    item.actions.find((action) => action.label === "Así es")?.onSelect();
    expect(onConfirm).toHaveBeenCalledWith(FIELD);
  });

  it("pensando, la isla no repite la pregunta (trabaja)", () => {
    const { result } = renderHook(() => useAlbaIsland(input({ liveQuestion: QUESTION, liveVisible: false, thinking: true })));
    expect(result.current.current).toBeNull();
  });

  it("al cerrar un tema avisa; al cargar no confunde lo ya cerrado con algo nuevo", () => {
    const closed = progress({
      topics: [{ ...progress().topics[0]!, status: "done", open: 0, answered: 1 }],
    });
    const { result, rerender } = renderHook((props: Input) => useAlbaIsland(props), {
      initialProps: input({ active: false }),
    });
    rerender(input({ session: session({ progress: closed }) }));
    expect(result.current.current).toBeNull();

    const reopened = progress();
    rerender(input({ session: session({ progress: reopened }) }));
    rerender(input({ session: session({ progress: closed }) }));
    expect(result.current.current).toMatchObject({ kind: "notice", title: "Tema listo", body: "Tu negocio · 1 de 1" });
  });

  it("ya está lo esencial: un aviso con «Revisar» que abre la revisión final", () => {
    const onOpenFinalReview = jest.fn();
    const { result } = renderHook(() =>
      useAlbaIsland(
        input({
          session: session({ progress: progress({ essential: { confirmed: 1, total: 1, complete: true } }) }),
          onOpenFinalReview,
        }),
      ),
    );
    const item = result.current.current;
    if (item?.kind !== "notice") throw new Error("sin aviso");
    expect(item.title).toBe("Ya está lo esencial");
    act(() => {
      item.action?.onSelect();
    });
    expect(onOpenFinalReview).toHaveBeenCalled();
  });

  it("el micrófono avisa con su motivo y su salida, y el aviso se va cuando vuelve", () => {
    const { result, rerender } = renderHook((props: Input) => useAlbaIsland(props), {
      initialProps: input({ voiceProblem: "denied" }),
    });
    expect(result.current.current).toMatchObject({ kind: "notice", id: "mic", glow: "warning", title: "El micrófono está bloqueado" });
    rerender(input({ voiceProblem: null }));
    expect(result.current.current).toBeNull();
  });

  it("al volver dice qué falta, una vez", () => {
    const { result } = renderHook(() =>
      useAlbaIsland(input({ session: session({ resume: { missing_topics: ["A", "B"], pending_review: 1 } }) })),
    );
    expect(result.current.current).toMatchObject({
      title: "Seguimos donde quedaste",
      body: "Faltan 2 temas y 1 dato por revisar",
    });
  });
});
