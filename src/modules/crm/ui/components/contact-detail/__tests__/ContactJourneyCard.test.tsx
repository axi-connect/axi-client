import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { ContactJourneyDTO } from "@/modules/crm/domain/journey";
import { ContactJourneyCard } from "../ContactJourneyCard";

const getContactJourney = jest.fn();
const revertStageChange = jest.fn();
const resumeAiMoves = jest.fn();
jest.mock("@/modules/crm/infrastructure/services/journey-service.adapter", () => ({
  getContactJourney: (...args: unknown[]) => getContactJourney(...args),
  revertStageChange: (...args: unknown[]) => revertStageChange(...args),
  resumeAiMoves: (...args: unknown[]) => resumeAiMoves(...args),
}));

type ModalAction = { label: string; onClick?: () => void };
let lastModal: { title?: string; description?: string; actions?: ModalAction[] } | null = null;
const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({
    showAlert,
    closeModal: jest.fn(),
    showModal: (config: { title?: string; description?: string; actions?: ModalAction[] }) => {
      lastModal = config;
    },
  }),
}));

function journey(over: Partial<ContactJourneyDTO> = {}): ContactJourneyDTO {
  return {
    deal: { id: "d1", title: "Plan facial completo", value_cents: 124_000_000, ai_moves_paused: false },
    stage: {
      name: "Propuesta",
      stage_kind: "proposal",
      entered_at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
      days_in_stage: 6,
      rotting_days: 10,
    },
    last_move: {
      event_id: "ev1",
      actor_type: "ai_agent",
      actor_name: "Sofía",
      reason: "Pidió la cotización del tratamiento completo",
      rule_code: null,
      at: new Date().toISOString(),
    },
    cadence: {
      attempts_used: 1,
      max_attempts: 4,
      next_run_at: "2026-09-25T15:00:00.000Z",
      channel: "message",
      enrollment_id: null,
    },
    ...over,
  };
}

beforeEach(() => {
  getContactJourney.mockReset();
  revertStageChange.mockReset();
  resumeAiMoves.mockReset();
  showAlert.mockReset();
  lastModal = null;
});

describe("ContactJourneyCard", () => {
  it("cuenta la etapa, el tiempo, quién la movió y la cadencia como una lista", async () => {
    getContactJourney.mockResolvedValue(journey());
    render(<ContactJourneyCard contactId="c1" canManage />);

    // El nombre de la etapa y su tipo (badge neutro) coinciden en este caso.
    expect(await screen.findAllByText("Propuesta")).toHaveLength(2);
    expect(screen.getByText(/Oportunidad «Plan facial completo»/)).toBeInTheDocument();
    expect(screen.getByText("6 días")).toBeInTheDocument();
    expect(screen.getByText(/máx\. 10 días · vence el/)).toBeInTheDocument();
    expect(screen.getByText("el agente Sofía")).toBeInTheDocument();
    expect(screen.getByText(/«Pidió la cotización del tratamiento completo»/)).toBeInTheDocument();
    expect(screen.getByText("intento 1 de 4")).toBeInTheDocument();
    expect(screen.getByText(/próximo el .* · Mensaje/)).toBeInTheDocument();
    // La pausa de la cadencia no tiene endpoint todavía: no se pinta un botón hueco.
    expect(screen.queryByRole("button", { name: /Pausar/ })).not.toBeInTheDocument();
  });

  it("sin oportunidad abierta, una frase", async () => {
    getContactJourney.mockResolvedValue(journey({ deal: null, stage: null, last_move: null, cadence: null }));
    render(<ContactJourneyCard contactId="c1" canManage={false} />);

    expect(
      await screen.findByText("Sin recorrido activo. Se abre solo al detectar intención o al crear una oportunidad."),
    ).toBeInTheDocument();
  });

  it("con 404 o 403 no pinta nada: el recorrido no existe para ese tenant o ese rol", async () => {
    getContactJourney.mockRejectedValue(new HttpError({ status: 404, code: "resource/not_found", message: "" }));
    const { container } = render(<ContactJourneyCard contactId="c1" canManage />);
    await waitFor(() => expect(getContactJourney).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it("otro error se dice con reintento, sin código crudo", async () => {
    getContactJourney.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(journey());
    render(<ContactJourneyCard contactId="c1" canManage />);

    fireEvent.click(await screen.findByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("intento 1 de 4")).toBeInTheDocument();
  });

  it("«Deshacer» solo con permiso; confirma, revierte y avisa al resto de la ficha", async () => {
    getContactJourney.mockResolvedValue(journey());
    const { unmount } = render(<ContactJourneyCard contactId="c1" canManage={false} />);
    await screen.findByText("el agente Sofía");
    expect(screen.queryByRole("button", { name: "Deshacer" })).not.toBeInTheDocument();
    unmount();

    revertStageChange.mockResolvedValue(undefined);
    const changed = jest.fn();
    window.addEventListener("crm:journey:changed", changed);
    render(<ContactJourneyCard contactId="c1" canManage />);
    fireEvent.click(await screen.findByRole("button", { name: "Deshacer" }));

    expect(lastModal?.title).toBe("¿Deshacer el paso a Propuesta?");
    // Lo movió la IA: el aviso dice que sus movimientos quedan en pausa.
    expect(lastModal?.description).toMatch(/quedan en pausa/);
    lastModal?.actions?.find((action) => action.label === "Deshacer")?.onClick?.();

    await waitFor(() => expect(revertStageChange).toHaveBeenCalledWith("d1", "ev1"));
    await waitFor(() => expect(changed).toHaveBeenCalled());
    // El evento recarga la card.
    await waitFor(() => expect(getContactJourney.mock.calls.length).toBeGreaterThanOrEqual(2));
    window.removeEventListener("crm:journey:changed", changed);
  });

  it("con la IA en pausa muestra el aviso y «Reanudar» quita la pausa", async () => {
    getContactJourney.mockResolvedValue(
      journey({ deal: { id: "d1", title: "Plan", value_cents: null, ai_moves_paused: true } }),
    );
    resumeAiMoves.mockResolvedValue({});
    render(<ContactJourneyCard contactId="c1" canManage={false} />);

    expect(await screen.findByText("Movimientos de la IA en pausa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reanudar" }));
    await waitFor(() => expect(resumeAiMoves).toHaveBeenCalledWith("d1"));
  });
});
