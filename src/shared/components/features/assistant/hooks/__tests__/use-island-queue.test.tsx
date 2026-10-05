import { act, renderHook } from "@testing-library/react";

import type { AssistantIslandItem, AssistantIslandQuestion } from "../../types";
import { ISLAND_NOTICE_MS, useIslandQueue } from "../use-island-queue";

const notice = (id: string, withAction = false): AssistantIslandItem => ({
  kind: "notice",
  id,
  glow: "ai",
  title: id,
  action: withAction ? { id: "ver", label: "Ver", onSelect: jest.fn() } : undefined,
});
const summary = (id: string): AssistantIslandItem => ({ kind: "summary", id, eyebrow: "", title: id, actions: [] });
const question: AssistantIslandQuestion = { kind: "question", id: "q", eyebrow: "", title: "¿?", actions: [] };

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("useIslandQueue", () => {
  it("la pregunta manda sobre el aviso, y el aviso sobre el resumen", () => {
    const { result, rerender } = renderHook((props: { q: AssistantIslandQuestion | null }) => useIslandQueue({ question: props.q }), {
      initialProps: { q: null as AssistantIslandQuestion | null },
    });
    act(() => {
      result.current.push(summary("informe"));
      result.current.push(notice("aviso", true));
    });
    expect(result.current.current?.id).toBe("aviso");
    rerender({ q: question });
    expect(result.current.current?.id).toBe("q");
    rerender({ q: null });
    expect(result.current.current?.id).toBe("aviso");
    act(() => {
      result.current.dismiss("aviso");
    });
    expect(result.current.current?.id).toBe("informe");
  });

  it("plegar deja el punto y desplegar lo devuelve", () => {
    const { result } = renderHook(() => useIslandQueue());
    act(() => {
      result.current.push(notice("a", true));
    });
    act(() => {
      result.current.fold();
    });
    expect(result.current.current).toBeNull();
    expect(result.current.pending).toBe(1);
    act(() => {
      result.current.expand();
    });
    expect(result.current.current?.id).toBe("a");
    expect(result.current.pending).toBe(0);
  });

  it("la pregunta plegada no vuelve sola, pero una pregunta NUEVA sí se despliega", () => {
    const { result, rerender } = renderHook((props: { q: AssistantIslandQuestion }) => useIslandQueue({ question: props.q }), {
      initialProps: { q: question },
    });
    act(() => {
      result.current.fold();
    });
    expect(result.current.current).toBeNull();
    expect(result.current.pending).toBe(1);
    rerender({ q: { ...question, id: "q2" } });
    expect(result.current.current?.id).toBe("q2");
  });

  it("un aviso sin botón se va solo (descartado, no al punto); con botón no; un solo timer, solo mientras está abierto", () => {
    const { result } = renderHook(() => useIslandQueue());
    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      result.current.push(notice("listo"));
    });
    expect(jest.getTimerCount()).toBe(1);
    act(() => {
      jest.advanceTimersByTime(ISLAND_NOTICE_MS);
    });
    expect(result.current.current).toBeNull();
    // Ya se vio: no se acumula en el punto («6 pendientes» de cosas leídas).
    expect(result.current.pending).toBe(0);
    expect(jest.getTimerCount()).toBe(0);

    act(() => {
      result.current.push(notice("con-boton", true));
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it("mientras trabaja o dicta, el plazo del aviso no corre", () => {
    const { result, rerender } = renderHook((props: { paused: boolean }) => useIslandQueue({ paused: props.paused }), {
      initialProps: { paused: true },
    });
    act(() => {
      result.current.push(notice("listo"));
    });
    expect(jest.getTimerCount()).toBe(0);
    rerender({ paused: false });
    expect(jest.getTimerCount()).toBe(1);
  });

  it("empujar el mismo id reemplaza, no duplica", () => {
    const { result } = renderHook(() => useIslandQueue());
    act(() => {
      result.current.push(notice("a", true));
      result.current.fold();
      result.current.push(notice("a", true));
    });
    expect(result.current.current?.id).toBe("a");
    expect(result.current.pending).toBe(0);
  });

  it("desmontar limpia el timer", () => {
    const { result, unmount } = renderHook(() => useIslandQueue());
    act(() => {
      result.current.push(notice("listo"));
    });
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
