import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import type { ProposalDTO } from "@/modules/cmo/domain/cmo";
import { ProposalDetail } from "../ProposalDetail";

/**
 * El detalle es donde el dueño decide, y sus tres verdades no tenían test:
 * el resultado de aprobar SEPARA lo aplicado de lo que falló (un «listo»
 * genérico mentiría), un insight no ofrece botón de aprobar, y un fallo de
 * red NO se disfraza de «esta propuesta ya no está» (F4 de la auditoría).
 */

const getProposal = jest.fn<Promise<ProposalDTO | null>, [string]>();

jest.mock("@/modules/cmo/infrastructure/services/cmo-service.adapter", () => ({
  getProposal: (id: string) => getProposal(id),
}));

const approve = jest.fn();
const reject = jest.fn();

jest.mock("@/modules/cmo/infrastructure/stores/cmo.store", () => ({
  useCmoStore: (selector: (state: unknown) => unknown) =>
    selector({ approve, reject } as never),
}));

jest.mock("@/shared/auth/auth.hooks", () => ({
  useAuth: () => ({ hasPermission: () => true }),
}));

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert }),
}));

function proposal(over: Partial<ProposalDTO> = {}): ProposalDTO {
  return {
    id: "prop-1",
    kind: "recovery",
    status: "pending",
    source: "chat",
    title: "Persigue los carritos",
    headline: "$8.129.000 en juego",
    rationale: "Hay 22 carritos abiertos.",
    evidence: [],
    risks: [],
    artifacts: [{ type: "automation", id: "auto-1", label: "Rescate", before: null, after: null }],
    expires_at: null,
    decided_at: null,
    reject_reason: null,
    created_at: "2026-08-22T14:00:00.000Z",
    ...over,
  } as ProposalDTO;
}

describe("ProposalDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Sin colas `once` heredadas entre tests: cada test fija SU respuesta.
    getProposal.mockReset();
  });

  it("un fallo de red NO se pinta como propuesta purgada: error propio con reintento", async () => {
    getProposal.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(proposal());
    render(<ProposalDetail proposalId="prop-1" />);

    expect(await screen.findByText(/no se pudo cargar la propuesta/iu)).toBeVisible();
    expect(screen.queryByText(/ya no está/iu)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /reintentar/iu }));
    expect(await screen.findByText("Persigue los carritos")).toBeVisible();
  });

  it("el null del backend SÍ es «ya no está»: es el caso normal de vencida o decidida", async () => {
    getProposal.mockResolvedValueOnce(null);
    render(<ProposalDetail proposalId="prop-1" />);
    expect(await screen.findByText(/esta propuesta ya no está/iu)).toBeVisible();
  });

  it("aprobar muestra lo APLICADO y lo PENDIENTE por separado, con el motivo", async () => {
    getProposal.mockResolvedValueOnce(proposal());
    approve.mockResolvedValueOnce({
      applied: [{ type: "promotion", id: "p1", label: "15% coral" }],
      failed: [{ type: "campaign", label: "Quincena", reason: "la plantilla de Meta sigue en revisión" }],
    });
    render(<ProposalDetail proposalId="prop-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /aprobar y encender/iu }));
    expect(await screen.findByText("Encendido")).toBeVisible();
    expect(screen.getByText("Quedó pendiente")).toBeVisible();
    expect(screen.getByText(/plantilla de Meta sigue en revisión/iu)).toBeVisible();
  });

  it("un insight no ofrece «Aprobar»: no hay nada que encender", async () => {
    getProposal.mockResolvedValueOnce(
      proposal({ kind: "insight", title: "El cierre cayó a la mitad", artifacts: [] }),
    );
    const view = render(<ProposalDetail proposalId="prop-1" />);
    const scope = within(view.container);
    expect(await scope.findByText("El cierre cayó a la mitad")).toBeVisible();
    expect(scope.queryByRole("button", { name: /aprobar/iu })).not.toBeInTheDocument();
    // La única salida es descartar.
    expect(scope.getByRole("button", { name: /descartar/iu })).toBeVisible();
  });

  it("el motivo libre viaja al rechazo tal como el dueño lo escribió", async () => {
    getProposal.mockResolvedValueOnce(proposal());
    reject.mockResolvedValueOnce({ directive_created: true });
    render(<ProposalDetail proposalId="prop-1" />);

    fireEvent.click(await screen.findByRole("button", { name: /no, gracias/iu }));
    fireEvent.click(screen.getByRole("radio", { name: /otro motivo/iu }));
    fireEvent.change(screen.getByLabelText(/motivo propio del rechazo/iu), {
      target: { value: "No toques nada hasta diciembre." },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /^descartar$/iu }));
    });

    await waitFor(() => {
      expect(reject).toHaveBeenCalledWith("prop-1", "No toques nada hasta diciembre.", true);
    });
  });
});
