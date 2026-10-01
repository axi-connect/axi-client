import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PilotProposalDTO } from "@/modules/autopilot/domain/proposals";
import { PilotProposals } from "../PilotProposals";

/**
 * «Axi propone» en Pilotos (P6b, mockup aprobado): sin propuestas no pinta
 * nada; con una, la cifra, el porqué, qué cambia y el riesgo; aplicar muestra
 * «Quedó puesto»; si el piloto cambió, lo dice y ofrece verlo; «Ahora no» pide
 * un motivo opcional y la quita.
 */
jest.mock("@/core/realtime/use-socket", () => ({ useSocket: () => ({ socket: null }), useSocketEvent: () => undefined }));
jest.mock("@/modules/autopilot/infrastructure/proposals-service.adapter", () => ({
  listPilotProposals: jest.fn(),
  approvePilotProposal: jest.fn(),
  rejectPilotProposal: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const api = require("@/modules/autopilot/infrastructure/proposals-service.adapter") as Record<string, jest.Mock>;

const PROPOSAL = {
  id: "p1",
  kind: "autopilot_tuning",
  status: "pending",
  title: "«Clínicas»: escribe a las 15:00",
  headline: "30 % de respuesta a las 15:00",
  rationale: "A las 15:00 te responde el 30 %; a las 09:00, el 10 %.",
  evidence: [
    { label: "Respuesta a las 09:00", value: "4 de 40 (10 %)", source: "piloto" },
    { label: "Respuesta a las 15:00", value: "12 de 40 (30 %)", source: "piloto" },
  ],
  risks: ["Con un solo turno al día, si el proveedor falla a esa hora el día queda sin captación."],
  artifacts: [
    {
      type: "autopilot_routine_patch",
      id: "r1",
      label: "Horario",
      spec: {
        patches: [
          {
            routine_id: "r1",
            before: { schedule: { times: ["09:00", "15:00"], leads_per_run: 20 } },
            after: { schedule: { times: ["15:00"], leads_per_run: 40 } },
          },
        ],
      },
    },
  ],
  source: "autopilot",
  expires_at: null,
  decided_at: null,
  reject_reason: null,
  created_at: "2026-09-30T12:00:00.000Z",
} as PilotProposalDTO;

const names = new Map([["r1", "Clínicas"]]);

afterEach(() => jest.clearAllMocks());

describe("PilotProposals", () => {
  it("sin propuestas no pinta nada", async () => {
    api.listPilotProposals.mockResolvedValue({ data: [] });
    const { container } = render(<PilotProposals routineNames={names} canManage />);
    await waitFor(() => expect(api.listPilotProposals).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("con una propuesta: cifra, porqué, evidencia, qué cambia y riesgo; aplicar la deja puesta", async () => {
    api.listPilotProposals.mockResolvedValue({ data: [PROPOSAL] });
    api.approvePilotProposal.mockResolvedValue({ applied: [], failed: [], status: "approved" });
    render(<PilotProposals routineNames={names} canManage />);
    expect(await screen.findByRole("heading", { name: "Axi propone" })).toBeInTheDocument();
    expect(screen.getByText("30 % de respuesta a las 15:00")).toBeInTheDocument();
    expect(screen.getByText("12 de 40 (30 %)")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Qué cambia" })).toHaveTextContent("Horario09:00 y 15:00 → 15:00");
    expect(screen.getByText(/proveedor falla/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aplicar ajuste" }));
    expect(await screen.findByText(/Quedó puesto/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver la ruta" })).toHaveAttribute("href", "/marketing/autopilot/r1");
  });

  it("si el piloto cambió entretanto, lo dice y ofrece verlo", async () => {
    api.listPilotProposals.mockResolvedValue({ data: [PROPOSAL] });
    api.approvePilotProposal.mockResolvedValue({
      applied: [],
      failed: [{ type: "autopilot_routine_patch", label: "Horario", reason: "un piloto cambió desde que se propuso el ajuste: revísalo en Pilotos" }],
      status: "pending",
    });
    render(<PilotProposals routineNames={names} canManage />);
    fireEvent.click(await screen.findByRole("button", { name: "Aplicar ajuste" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se aplicó: un piloto cambió");
    expect(screen.getByRole("link", { name: "Ver la ruta" })).toBeInTheDocument();
  });

  it("«Ahora no»: motivo opcional, lo corto se corrige y al descartar desaparece", async () => {
    api.listPilotProposals.mockResolvedValue({ data: [PROPOSAL] });
    api.rejectPilotProposal.mockResolvedValue({ directive_created: false });
    const { container } = render(<PilotProposals routineNames={names} canManage />);
    fireEvent.click(await screen.findByRole("button", { name: "Ahora no" }));
    fireEvent.change(screen.getByLabelText("¿Por qué no? (opcional)"), { target: { value: "no" } });
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    expect(await screen.findByText(/al menos 8 caracteres/)).toBeInTheDocument();
    expect(api.rejectPilotProposal).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("¿Por qué no? (opcional)"), { target: { value: "mi equipo no alcanza a esa hora" } });
    fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
    await waitFor(() => expect(container).toBeEmptyDOMElement());
    expect(api.rejectPilotProposal).toHaveBeenCalledWith("p1", { reason: "mi equipo no alcanza a esa hora" });
  });

  it("sin permiso de gestionar, se lee pero no se decide", async () => {
    api.listPilotProposals.mockResolvedValue({ data: [PROPOSAL] });
    render(<PilotProposals routineNames={names} canManage={false} />);
    expect(await screen.findByText(PROPOSAL.title)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Aplicar ajuste" })).toBeNull();
  });
});
