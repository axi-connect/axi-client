import { act, renderHook, waitFor } from "@testing-library/react";

import type { BriefingDTO } from "@/modules/cmo/domain/cmo";
import type { AxelNews } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { useAxelIsland } from "../use-axel-island";

const BRIEFING = {
  id: "b1",
  date_local: "2026-10-05",
  summary: "La semana cerró mejor que la anterior.",
  highlights: [
    { label: "Conversaciones", tone: "up", detail: "+18 %" },
    { label: "Leads sin responder", tone: "warn", detail: "7" },
    { label: "Por decidir", tone: "neutral", detail: "3" },
    { label: "Sobra", tone: "down", detail: "x" },
  ],
  proposal_ids: [],
  created_at: "2026-10-05T13:00:00.000Z",
} as unknown as BriefingDTO;

const news = (item: Partial<AxelNews> = {}): AxelNews => ({
  id: "briefing-b1",
  kind: "briefing",
  title: "Llegó tu informe de hoy",
  body: "3 propuestas por decidir",
  proposal_id: null,
  ...item,
});

type Input = Parameters<typeof useAxelIsland>[0];
const input = (over: Partial<Input> = {}): Input => ({
  news: [],
  takeNews: jest.fn(),
  briefing: BRIEFING,
  loadBriefing: jest.fn(() => Promise.resolve(BRIEFING)),
  liveQuestion: null,
  liveVisible: true,
  thinking: false,
  empty: false,
  onPick: jest.fn(),
  onWrite: jest.fn(),
  onOpenBoard: jest.fn(),
  onOpenProposal: jest.fn(),
  ...over,
});

describe("useAxelIsland", () => {
  it("una novedad llega como aviso con «Ver», y sale del store", () => {
    const takeNews = jest.fn();
    const { result } = renderHook(() => useAxelIsland(input({ news: [news()], takeNews })));
    expect(takeNews).toHaveBeenCalledWith("briefing-b1");
    expect(result.current.current).toMatchObject({ kind: "notice", title: "Llegó tu informe de hoy", glow: "ai" });
  });

  it("«Ver» del informe despliega el resumen: su frase, tres señales y se puede escuchar", () => {
    const onOpenBoard = jest.fn();
    const { result } = renderHook(() => useAxelIsland(input({ news: [news()], onOpenBoard })));
    const notice = result.current.current;
    if (notice?.kind !== "notice") throw new Error("sin aviso");
    act(() => {
      notice.action?.onSelect();
    });
    const summary = result.current.current;
    if (summary?.kind !== "summary") throw new Error("sin resumen");
    expect(summary.title).toBe("La semana cerró mejor que la anterior.");
    expect(summary.highlights).toHaveLength(3);
    expect(summary.speech).toContain("Conversaciones: +18 %.");
    summary.actions[0]?.onSelect();
    expect(onOpenBoard).toHaveBeenCalled();
  });

  it("si el informe aún no está, lo pide al tocar «Ver»", async () => {
    const loadBriefing = jest.fn(() => Promise.resolve(BRIEFING));
    const { result } = renderHook(() => useAxelIsland(input({ news: [news({ id: "briefing-otro" })], loadBriefing })));
    const notice = result.current.current;
    if (notice?.kind !== "notice") throw new Error("sin aviso");
    act(() => {
      notice.action?.onSelect();
    });
    await waitFor(() => {
      expect(result.current.current?.kind).toBe("summary");
    });
    expect(loadBriefing).toHaveBeenCalled();
  });

  it("«Ver» de una propuesta nueva la abre", () => {
    const onOpenProposal = jest.fn();
    const { result } = renderHook(() =>
      useAxelIsland(input({ news: [news({ id: "proposal-p1", kind: "proposal", proposal_id: "p1" })], onOpenProposal })),
    );
    const notice = result.current.current;
    if (notice?.kind !== "notice") throw new Error("sin aviso");
    act(() => {
      notice.action?.onSelect();
    });
    expect(onOpenProposal).toHaveBeenCalledWith("p1");
  });

  it("la pregunta viva sube solo si su burbuja no se ve, y nunca en el vacío", () => {
    const liveQuestion = {
      id: "m1",
      question: { question: "¿Lanzo la campaña?", options: [{ label: "Sí", hint: null }, { label: "No", hint: null }], allow_free_text: false },
    } as Input["liveQuestion"];
    const visible = renderHook(() => useAxelIsland(input({ liveQuestion, liveVisible: true })));
    expect(visible.result.current.current).toBeNull();
    const hidden = renderHook(() => useAxelIsland(input({ liveQuestion, liveVisible: false })));
    expect(hidden.result.current.current).toMatchObject({ kind: "question", title: "¿Lanzo la campaña?" });
    const empty = renderHook(() => useAxelIsland(input({ liveQuestion, liveVisible: false, empty: true })));
    expect(empty.result.current.current).toBeNull();
  });
});
