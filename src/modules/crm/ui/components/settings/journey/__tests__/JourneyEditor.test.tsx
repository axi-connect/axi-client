import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { HttpError } from "@/core/api/problem";
import type { JourneyDTO, JourneyStageDTO } from "@/modules/crm/domain/journey";
import { JourneyEditor } from "../JourneyEditor";

const getJourney = jest.fn();
const putJourney = jest.fn();
const applyJourneyTemplate = jest.fn();
jest.mock("@/modules/crm/infrastructure/services/journey-service.adapter", () => ({
  getJourney: (...args: unknown[]) => getJourney(...args),
  putJourney: (...args: unknown[]) => putJourney(...args),
  applyJourneyTemplate: (...args: unknown[]) => applyJourneyTemplate(...args),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));

jest.mock("@/modules/companies/public", () => ({
  useMyCompany: () => ({ company: { niche_code: "health_beauty" } }),
}));

function stage(over: Partial<JourneyStageDTO> & { stage_id: string; name: string; position: number }): JourneyStageDTO {
  return {
    stage_kind: "custom",
    cadence: null,
    rotting_days: null,
    auto_advance: false,
    moves_on: [],
    ...over,
  };
}

function journey(over: Partial<JourneyDTO> = {}): JourneyDTO {
  return {
    pipeline_id: "p1",
    template_code: "health_beauty",
    stages: [
      stage({
        stage_id: "s1",
        name: "Consulta",
        position: 0,
        stage_kind: "new",
        cadence: { max_attempts: 2, wait_hours: 4, channel: "message", exhausted_action: "let_cool" },
        rotting_days: 2,
        auto_advance: true,
      }),
      stage({
        stage_id: "s2",
        name: "Propuesta",
        position: 1,
        stage_kind: "proposal",
        cadence: { max_attempts: 4, wait_hours: 48, channel: "message", exhausted_action: "mark_lost" },
        rotting_days: 10,
        auto_advance: true,
        moves_on: ["cotización enviada"],
      }),
      stage({ stage_id: "s3", name: "Reagendar", position: 2 }),
    ],
    templates: [
      {
        niche_code: "restaurants",
        name: "Restaurantes",
        stages: [
          { name: "Pedido", stage_kind: "new", cadence: { max_attempts: 2, wait_hours: 2, channel: "message", exhausted_action: "let_cool" } },
        ],
      },
      {
        niche_code: "health_beauty",
        name: "Salud y belleza",
        stages: [
          { name: "Cita", stage_kind: "meeting", cadence: { max_attempts: 4, wait_hours: 24, channel: "call_then_message", exhausted_action: "hand_to_human" } },
          { name: "Asistió", stage_kind: "qualified", cadence: null },
        ],
      },
      { niche_code: "software_saas", name: "Software y servicios digitales", stages: [] },
    ],
    ...over,
  };
}

beforeEach(() => {
  getJourney.mockReset();
  putJourney.mockReset();
  applyJourneyTemplate.mockReset();
  showAlert.mockReset();
});

describe("JourneyEditor", () => {
  it("lista las etapas con su resumen de cadencia y marca la personalizada", async () => {
    getJourney.mockResolvedValue(journey());
    render(<JourneyEditor />);

    expect(await screen.findByText("Consulta")).toBeInTheDocument();
    expect(screen.getByText("2 intentos · cada 4 h · Mensaje · máx. 2 días · luego dejar enfriar")).toBeInTheDocument();
    expect(
      screen.getByText("4 intentos · cada 2 días · Mensaje · máx. 10 días · luego marcar perdida"),
    ).toBeInTheDocument();
    expect(screen.getByText("No se mueve sola")).toBeInTheDocument();
    // La plantilla aplicada, con el nombre del catálogo de nichos del cliente.
    expect(screen.getByText("Salud, belleza y citas")).toBeInTheDocument();
  });

  it("la fila expandida enseña qué la mueve sola y «Se mueve sola» escribe auto_advance con un PUT completo", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockImplementation((dto: { stages: JourneyStageDTO[] }) =>
      Promise.resolve({ ...journey(), stages: journey().stages.map((s) => ({ ...s, ...dto.stages.find((p) => p.stage_id === s.stage_id) })) }),
    );
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Propuesta/ }));
    expect(screen.getByText("cotización enviada")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(1));
    const body = putJourney.mock.calls[0][0] as { stages: Array<{ stage_id: string; auto_advance: boolean; stage_kind: string }> };
    expect(body.stages).toHaveLength(3);
    expect(body.stages.find((s) => s.stage_id === "s2")?.auto_advance).toBe(false);
    expect(body.stages.find((s) => s.stage_id === "s1")?.stage_kind).toBe("new");
    await waitFor(() => expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "success" })));
  });

  it("«Activar cadencia» nace con la cadencia por defecto y el número guarda al salir", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockImplementation((dto: { stages: JourneyStageDTO[] }) =>
      Promise.resolve({ ...journey(), stages: dto.stages.map((p, i) => ({ ...journey().stages[i], ...p })) }),
    );
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Reagendar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Activar cadencia" }));
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(1));
    const first = putJourney.mock.calls[0][0] as { stages: Array<{ stage_id: string; cadence: unknown }> };
    expect(first.stages.find((s) => s.stage_id === "s3")?.cadence).toEqual({
      max_attempts: 3,
      wait_hours: 24,
      channel: "message",
      exhausted_action: "let_cool",
    });

    const attempts = await screen.findByLabelText(/Intentos/);
    fireEvent.change(attempts, { target: { value: "5" } });
    expect(putJourney).toHaveBeenCalledTimes(1); // teclear no guarda
    fireEvent.blur(attempts);
    await waitFor(() => expect(putJourney).toHaveBeenCalledTimes(2));
    const second = putJourney.mock.calls[1][0] as { stages: Array<{ stage_id: string; cadence: { max_attempts: number } | null }> };
    expect(second.stages.find((s) => s.stage_id === "s3")?.cadence?.max_attempts).toBe(5);
  });

  it("si el servidor rechaza, vuelve al estado anterior y lo dice sin código crudo", async () => {
    getJourney.mockResolvedValue(journey());
    putJourney.mockRejectedValue(new HttpError({ status: 403, code: "rbac/permission_denied", message: "" }));
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: /Propuesta/ }));
    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);

    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ tone: "error", title: "No tienes permiso para realizar esta acción" }),
      ),
    );
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("el selector de plantillas pinta las del servidor (también las que el cliente no conoce), el nicho del tenant primero, y aplicar avisa sin borrar nada", async () => {
    getJourney.mockResolvedValue(journey());
    applyJourneyTemplate.mockResolvedValue(journey({ template_code: "software_saas" }));
    render(<JourneyEditor />);

    fireEvent.click(await screen.findByRole("button", { name: "Cambiar" }));
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(radios[0]).toHaveTextContent("Salud, belleza y citas");
    expect(radios[0]).toHaveTextContent("tu tipo de negocio");
    expect(screen.getByText("No borra etapas ni oportunidades.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: /Software y servicios digitales/ }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar plantilla" }));
    await waitFor(() => expect(applyJourneyTemplate).toHaveBeenCalledWith("software_saas"));
    await waitFor(() =>
      expect(showAlert).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Plantilla aplicada: Software y servicios digitales" }),
      ),
    );
  });

  it("un error al cargar se dice con reintento", async () => {
    getJourney
      .mockRejectedValueOnce(new HttpError({ status: 403, code: "rbac/permission_denied", message: "" }))
      .mockResolvedValueOnce(journey());
    render(<JourneyEditor />);

    expect(await screen.findByText("No tienes permiso para realizar esta acción")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("Consulta")).toBeInTheDocument();
  });
});
