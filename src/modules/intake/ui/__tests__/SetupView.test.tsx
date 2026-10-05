import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

import type { IntakeField, IntakeSessionView } from "@/modules/intake/domain/intake";
import { useIntakeStore } from "@/modules/intake/infrastructure/stores/intake.store";
import { SetupView } from "../SetupView";

/**
 * El rendimiento y la estructura de la pantalla de Alba (plan de asistentes
 * premium, F2): UNA sola ficha montada (antes había dos, escritorio y hoja) y
 * guardar un dato no repinta el hilo. Store REAL: un mock estático no dispara
 * suscripciones.
 */

const open = jest.fn();
jest.mock("@/modules/intake/infrastructure/services/intake-service.adapter", () => ({
  intakeService: {
    open: (...args: unknown[]) => open(...args),
    message: jest.fn(),
    patchAnswers: jest.fn(),
    transcribe: jest.fn(),
  },
}));

const threadRenders = jest.fn();
jest.mock("../components/SetupThread", () => {
  const actual = jest.requireActual<typeof import("../components/SetupThread")>("../components/SetupThread");
  const { memo } = jest.requireActual<typeof import("react")>("react");
  return {
    SetupThread: memo((props: ComponentProps<typeof actual.SetupThread>) => {
      threadRenders();
      return <actual.SetupThread {...props} />;
    }),
  };
});

const FIELD: IntakeField = {
  code: "ciudad",
  label: "Ciudad",
  kind: "text",
  required: false,
  help: null,
  options: null,
  value: "Medellín",
  display: "Medellín",
  source: "stated",
  needs_confirmation: false,
  skipped: null,
};

function session(city = "Medellín"): IntakeSessionView {
  return {
    status: "in_progress",
    assistant_name: "Alba",
    company_name: "Café Aroma",
    invite_name: "Marta",
    estimated_minutes: 7,
    turns_left: 40,
    voice_enabled: false,
    messages: [
      {
        id: "m1",
        role: "assistant",
        body: "Hola, soy Alba.",
        created_at: "2026-09-28T14:00:00.000Z",
        captured: [],
        question: null,
        voice: false,
      },
    ],
    topics: [{ code: "negocio", title: "Tu negocio", fields: [{ ...FIELD, value: city, display: city }] }],
    progress: {
      topics: [
        {
          code: "negocio",
          title: "Tu negocio",
          required: 0,
          resolved: 1,
          pending_confirmation: 0,
          captured: 1,
          answered: 1,
          skipped: 0,
          open: 0,
          total: 1,
          deferred: false,
          status: "in_progress",
        },
      ],
      percent: 50,
      next_topic: null,
      next_field: null,
      has_pending_required: false,
      has_pending_confirmation: false,
      essential: { confirmed: 0, total: 1, complete: false },
      pending_review: 0,
      next_ask: null,
    },
    closing: null,
    summary: null,
    resume: null,
  };
}

const initial = useIntakeStore.getState();

async function mount() {
  open.mockResolvedValue(session());
  render(<SetupView token={"t".repeat(32)} />);
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  threadRenders.mockClear();
  useIntakeStore.setState({ ...initial }, true);
});

afterEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
});

describe("SetupView", () => {
  it("en escritorio hay UNA sola ficha en el DOM", async () => {
    await mount();
    expect(screen.getAllByRole("heading", { name: "Tu avance" })).toHaveLength(1);
  });

  it("guardar un dato repinta la ficha, no el hilo", async () => {
    await mount();
    const before = threadRenders.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: "Ver todo lo anotado" }));
    act(() => {
      useIntakeStore.setState({ session: session("Bogotá") });
    });

    expect(screen.getByText("Bogotá")).toBeInTheDocument();
    expect(threadRenders.mock.calls.length).toBe(before);
  });

  it("la isla dice el tema de ahora", async () => {
    await mount();
    expect(screen.getByText("Tu negocio", { selector: "b" })).toBeInTheDocument();
  });

  it("en móvil la ficha vive en una hoja que se abre desde su botón", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    await mount();
    expect(screen.queryByRole("heading", { name: "Tu avance" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Abrir la ficha/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tu avance" })).toBeInTheDocument();
  });
});
