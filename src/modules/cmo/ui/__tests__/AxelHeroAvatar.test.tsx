import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Ref } from "react";

import { GESTURE_MS, PROUD_MS } from "@/modules/cmo/domain/axel-mood";
import { useCmoStore, type UiMessage } from "@/modules/cmo/infrastructure/stores/cmo.store";
import { AxelHeroAvatar } from "../components/AxelHeroAvatar";

/**
 * El hero es el único avatar vivo de la vista y el que paga el streaming: lo que
 * se protege aquí es que NO se re-renderice por delta (el presupuesto §6 del
 * plan), que el humor salga del store y que el gesto sea finito y con cooldown.
 */

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  sendMessage: jest.fn(),
  listThreads: jest.fn(),
  createThread: jest.fn(),
  getTranscript: jest.fn(),
  listProposals: jest.fn(),
  getProposal: jest.fn(),
  approveProposal: jest.fn(),
  rejectProposal: jest.fn(),
  getCmoSettings: jest.fn(),
  getLatestBriefing: jest.fn(),
}));

let reduced = false;
jest.mock("framer-motion", () => ({ useReducedMotion: () => reduced }));

// La cara real es geometría probada aparte; aquí un doble que CUENTA renders y
// que sí entrega el `ref` (React 19 lo pasa como prop): sin él, los hooks de
// vida y mirada verían `null` y no programarían nada — un falso verde.
const faceRenders = jest.fn();
jest.mock("../components/AxelAvatar", () => ({
  AxelAvatar: (props: {
    expression: string;
    gesture: string | null;
    accessory: string;
    ref: Ref<SVGSVGElement>;
  }) => {
    faceRenders(props);
    return <svg ref={props.ref} data-testid="face" data-expression={props.expression} data-acc={props.accessory} />;
  },
}));

function message(over: Partial<UiMessage>): UiMessage {
  return {
    id: "m1",
    role: "axel",
    body: "Listo.",
    created_at: "2026-09-15T14:00:00.000Z",
    tool_calls: null,
    proposal_id: null,
    question: null,
    ...over,
  };
}

const initial = useCmoStore.getState();

beforeEach(() => {
  reduced = false;
  faceRenders.mockClear();
  useCmoStore.setState(
    { ...initial, thread: { id: "t1", messages: [], thinking: false }, live: null, blocker: null, unseen: 0 },
    true,
  );
  window.localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

const live = (text: string) => ({ turn_id: "turn-1", iteration: 0, text, steps: [], seq: 1 });

describe("AxelHeroAvatar", () => {
  it("es un botón para saludar, en reposo, con la cara neutra", () => {
    render(<AxelHeroAvatar ownerTyping={false} />);
    const button = screen.getByRole("button", { name: "Saludar a Axel" });
    expect(button.dataset.mood).toBe("idle");
    expect(screen.getByTestId("face").dataset.expression).toBe("neutral");
  });

  it("deriva el humor del store: pensando → hablando → reposo", () => {
    render(<AxelHeroAvatar ownerTyping={false} />);
    act(() => {
      useCmoStore.setState({ thread: { id: "t1", messages: [], thinking: true }, live: live("") });
    });
    expect(screen.getByRole("button").dataset.mood).toBe("thinking");
    act(() => {
      useCmoStore.setState({ live: live("Encontré") });
    });
    expect(screen.getByRole("button").dataset.mood).toBe("speaking");
    act(() => {
      useCmoStore.setState({ thread: { id: "t1", messages: [], thinking: false }, live: null });
    });
    expect(screen.getByRole("button").dataset.mood).toBe("idle");
  });

  it("NO se re-renderiza por los deltas del streaming", () => {
    render(<AxelHeroAvatar ownerTyping={false} />);
    act(() => {
      useCmoStore.setState({ thread: { id: "t1", messages: [], thinking: true }, live: live("a") });
    });
    const before = faceRenders.mock.calls.length;
    act(() => {
      for (let i = 0; i < 30; i++) {
        const current = useCmoStore.getState().live;
        if (current !== null) useCmoStore.setState({ live: { ...current, text: `${current.text}a`, seq: i + 2 } });
      }
    });
    expect(faceRenders.mock.calls.length).toBe(before);
  });

  it("escucha mientras el dueño escribe y se disculpa si el envío falló", () => {
    const { rerender } = render(<AxelHeroAvatar ownerTyping />);
    expect(screen.getByRole("button").dataset.mood).toBe("listening");
    rerender(<AxelHeroAvatar ownerTyping={false} />);
    act(() => {
      useCmoStore.setState({
        thread: { id: "t1", messages: [message({ id: "o1", role: "owner", failed: "Sin red" })], thinking: false },
      });
    });
    expect(screen.getByRole("button").dataset.mood).toBe("sorry");
  });

  it("celebra SOLO una propuesta nueva, seis segundos, y luego vuelve", () => {
    // Un hilo recargado con una propuesta vieja al final no es noticia.
    useCmoStore.setState({
      thread: { id: "t1", messages: [message({ id: "old", proposal_id: "p-old" })], thinking: false },
    });
    render(<AxelHeroAvatar ownerTyping={false} />);
    expect(screen.getByRole("button").dataset.mood).toBe("idle");

    act(() => {
      useCmoStore.setState({
        thread: {
          id: "t1",
          messages: [message({ id: "old", proposal_id: "p-old" }), message({ id: "new", proposal_id: "p-new" })],
          thinking: false,
        },
      });
    });
    expect(screen.getByRole("button").dataset.mood).toBe("proud");
    expect(screen.getByRole("button").dataset.gesture).toBe("nod");
    act(() => {
      jest.advanceTimersByTime(PROUD_MS + 10);
    });
    expect(screen.getByRole("button").dataset.mood).toBe("idle");
    expect(screen.getByRole("button").dataset.gesture).toBeUndefined();
  });

  it("al tocar guiña, ignora el segundo toque inmediato y al tercero seguido saluda", () => {
    render(<AxelHeroAvatar ownerTyping={false} />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(button.dataset.gesture).toBe("wink");
    fireEvent.click(button);
    expect(button.dataset.gesture).toBe("wink");
    act(() => {
      jest.advanceTimersByTime(GESTURE_MS.wink + 300);
    });
    expect(button.dataset.gesture).toBeUndefined();
    fireEvent.click(button);
    act(() => {
      jest.advanceTimersByTime(GESTURE_MS.wink + 300);
    });
    fireEvent.click(button);
    expect(button.dataset.gesture).toBe("wave");
  });

  it("con movimiento reducido es una imagen, no un botón, y nada se programa", () => {
    reduced = true;
    render(<AxelHeroAvatar ownerTyping={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Axel, tu director de mercadeo" })).toBeInTheDocument();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("en reposo no deja temporizadores vivos tras el despertar, y al desmontar ninguno", () => {
    const { unmount } = render(<AxelHeroAvatar ownerTyping={false} />);
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    expect(jest.getTimerCount()).toBe(0);
    act(() => {
      useCmoStore.setState({ thread: { id: "t1", messages: [], thinking: true }, live: live("") });
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it("lleva la diadema que el dueño eligió", () => {
    window.localStorage.setItem("axi.cmo.axel.accessory", "headset");
    render(<AxelHeroAvatar ownerTyping={false} />);
    expect(screen.getByTestId("face").dataset.acc).toBe("headset");
  });
});
