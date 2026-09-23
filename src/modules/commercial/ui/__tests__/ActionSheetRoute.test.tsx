import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { HttpError } from "@/core/api/problem";
import { resetCommercialStore, useCommercialStore } from "@/modules/commercial/infrastructure/stores/commercial.store";
import { ActionSheetRoute } from "../ActionSheetRoute";
import { proposal } from "./fixtures";

const mockGetProposal = jest.fn();
jest.mock("@/modules/commercial/infrastructure/services/commercial-service.adapter", () => ({
  ...jest.requireActual("@/modules/commercial/infrastructure/services/commercial-service.adapter"),
  getProposal: (id: string) => mockGetProposal(id),
}));
const permissions = new Set(["commercial:read", "commercial:approve"]);
jest.mock("@/shared/auth/auth.hooks", () => ({ useAuth: () => ({ hasPermission: (code: string) => permissions.has(code) }) }));
const mockBack = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ back: mockBack, replace: jest.fn(), push: jest.fn() }) }));
const mockShowAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert: mockShowAlert }) }));
// El panel real es Radix + framer: aquí basta su contrato (título, cabecera, cuerpo, pie).
jest.mock("@/shared/components/features/detail-sheet", () => ({
  DetailSheet: ({
    title,
    children,
    renderHeader,
    renderFooter,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
    renderHeader?: () => React.ReactNode;
    renderFooter?: () => React.ReactNode;
  }) => (
    <div role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <h3>{title}</h3>
      {renderHeader?.()}
      {children}
      <footer>{renderFooter?.()}</footer>
    </div>
  ),
}));

const approveProposal = jest.fn();
const rejectProposal = jest.fn();

afterEach(cleanup);
beforeEach(() => {
  resetCommercialStore();
  permissions.add("commercial:approve");
  mockGetProposal.mockReset().mockResolvedValue(proposal);
  approveProposal.mockReset();
  rejectProposal.mockReset();
  mockShowAlert.mockReset();
  // Los métodos reales escriben `approvals`/`decisions`; aquí se simula lo que harían.
  approveProposal.mockImplementation(async (id: string) => {
    const result = {
      applied: [{ type: "agent_task_bulk_spec", id: "b1", label: "Lote", detail: "10 programados · 2 omitidos: 2 baja comercial" }],
      failed: [],
    };
    useCommercialStore.setState((state) => ({
      approvals: { ...state.approvals, [id]: result },
      decisions: { ...state.decisions, [id]: { status: "approved", decided_at: new Date().toISOString() } },
    }));
    return result;
  });
  rejectProposal.mockImplementation(async (id: string) => {
    useCommercialStore.setState((state) => ({
      decisions: { ...state.decisions, [id]: { status: "rejected", decided_at: new Date().toISOString() } },
    }));
    return { directive_created: false };
  });
  useCommercialStore.setState({ approveProposal, rejectProposal });
});

describe("ActionSheetRoute / ActionDetail", () => {
  it("pinta tipo, titular violeta con la cuenta, por qué ahora y qué va a pasar", async () => {
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByRole("heading", { name: proposal.title })).toBeInTheDocument();
    expect(screen.getByText("Lote de seguimiento")).toBeInTheDocument();
    expect(screen.getByText("+2 ventas estimadas · cubre el 20 % de lo que falta para volver al ritmo")).toHaveClass("text-accent-violet");
    expect(screen.getByText("La cuenta: 12 × 50 % × 35 % = 2")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Por qué ahora" })).toHaveTextContent("27 de 33 esperadas a hoy");
    const plan = screen.getByRole("region", { name: "Qué va a pasar" });
    expect(plan).toHaveTextContent("12 contactos");
    expect(plan).toHaveTextContent("12 por hora");
    expect(screen.getByRole("region", { name: "Después" })).toBeInTheDocument();
  });

  it("aprobar pinta el resultado parcial en contactos y ofrece «Ver en Tareas»", async () => {
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    fireEvent.click(await screen.findByRole("button", { name: /^Aprobar$/ }));
    expect(approveProposal).toHaveBeenCalledWith(proposal.id);
    expect(await screen.findByText(/^Listo\. 10 contactos entran en seguimiento /)).toBeInTheDocument();
    expect(screen.getByText("2 quedaron fuera (2 baja comercial).")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver en Tareas/ })).toHaveAttribute("href", "/crm/tasks");
    expect(screen.queryByRole("button", { name: /^Aprobar$/ })).toBeNull();
  });

  it("rechazar pide el motivo, manda el elegido y lo confirma", async () => {
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    expect(screen.getByRole("group", { name: "¿Por qué no?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Es pronto para volver a escribirles" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => {
      expect(rejectProposal).toHaveBeenCalledWith(proposal.id, "Es pronto para volver a escribirles.");
    });
    expect(await screen.findByText("Anotado. Axi no vuelve a proponerlo esta semana.")).toBeInTheDocument();
  });

  it("«Otro motivo…» exige 8 caracteres antes de dejar rechazar", async () => {
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    fireEvent.click(screen.getByRole("radio", { name: /Otro motivo/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Motivo propio del rechazo" }), { target: { value: "corto" } });
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox", { name: "Motivo propio del rechazo" }), { target: { value: "No los lotes los viernes" } });
    expect(screen.getByRole("button", { name: "Rechazar" })).toBeEnabled();
  });

  it("sin commercial:approve es de solo lectura y dice a quién pedírselo", async () => {
    permissions.delete("commercial:approve");
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText(/Pídele a un administrador que apruebe/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprobar|Rechazar/ })).toBeNull();
  });

  it("aprobada desde la lista: el detalle ya trae el resultado del store", async () => {
    useCommercialStore.setState({
      approvals: { [proposal.id]: { applied: [{ type: "agent_task_bulk_spec", id: "b1", label: "Lote", detail: "36 programados" }], failed: [] } },
      decisions: { [proposal.id]: { status: "approved", decided_at: new Date().toISOString() } },
    });
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText(/^Listo\. 36 contactos entran en seguimiento/)).toBeInTheDocument();
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it("404 = ya no está (no un error de red)", async () => {
    mockGetProposal.mockRejectedValue(new HttpError({ status: 404, code: "cmo/proposal_not_found", message: "no" }));
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText("Esta acción ya no está")).toBeInTheDocument();
  });
});
