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
const capabilities = new Set(["crm", "crm_ai"]);
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => ({ entitlements: null, loaded: true, hasCapability: (code: string) => capabilities.has(code) }),
}));
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
  capabilities.add("crm_ai");
  mockGetProposal.mockReset().mockResolvedValue(proposal);
  approveProposal.mockReset();
  rejectProposal.mockReset();
  mockShowAlert.mockReset();
  // Los métodos reales escriben `approvals`/`decisions`; aquí se simula lo que harían.
  approveProposal.mockImplementation(async (id: string) => {
    const result = {
      applied: [{ type: "agent_task_bulk_spec", id: "b1", label: "Lote", detail: "10 programados · 2 omitidos: 2 baja comercial" }],
      failed: [],
      status: "approved" as const,
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
    // La procedencia del titular (`estimate_source`) va junto a la cuenta.
    expect(screen.getByText("La cuenta: 12 × 50 % × 35 % = 2").parentElement).toHaveTextContent("según tu historia");
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
    for (const link of screen.getAllByRole("link", { name: /Ver en Tareas/ })) expect(link).toHaveAttribute("href", "/crm/tasks");
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
      approvals: { [proposal.id]: { applied: [{ type: "agent_task_bulk_spec", id: "b1", label: "Lote", detail: "36 programados" }], failed: [], status: "approved" } },
      decisions: { [proposal.id]: { status: "approved", decided_at: new Date().toISOString() } },
    });
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText(/^Listo\. 36 contactos entran en seguimiento/)).toBeInTheDocument();
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it("nada aplicado: pinta el fallo, no dice «Aprobada» y deja «Aprobar» para reintentar (Q5)", async () => {
    useCommercialStore.setState({
      approvals: {
        [proposal.id]: {
          applied: [],
          failed: [{ type: "agent_task_bulk_spec", label: "Lote", reason: "Tu plan no incluye el agente de seguimiento del CRM (crm_ai)" }],
          status: "pending",
        },
      },
    });
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText("No se pudo: Lote.")).toBeInTheDocument();
    expect(screen.getByText(/Tu plan no incluye CRM con IA, así que el agente no pudo empezar/)).toBeInTheDocument();
    expect(screen.getByText(/La propuesta sigue por decidir/)).toBeInTheDocument();
    expect(screen.queryByText("Aprobada")).toBeNull();
    expect(screen.getByRole("button", { name: /^Aprobar$/ })).toBeEnabled();
  });

  it("404 = ya no está (no un error de red)", async () => {
    mockGetProposal.mockRejectedValue(new HttpError({ status: 404, code: "cmo/proposal_not_found", message: "no" }));
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText("Esta acción ya no está")).toBeInTheDocument();
  });

  it("con permiso pero sin crm_ai: sin Aprobar ni Rechazar y la línea del plan (C5)", async () => {
    capabilities.delete("crm_ai");
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText("Tu plan no incluye CRM con IA: el agente no puede trabajar esta lista.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Aprobar|Rechazar/ })).toBeNull();
  });

  it("doble clic en Aprobar: una sola aprobación (C9)", async () => {
    approveProposal.mockImplementation(() => new Promise(() => {}));
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    const button = await screen.findByRole("button", { name: /^Aprobar$/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(approveProposal).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
  });

  it.each([
    [409, "cmo/proposal_not_pending"],
    [403, "rbac/permission_denied"],
  ])("un %s al aprobar avisa y vuelve a leer la propuesta sin skeleton (C4)", async (status, code) => {
    approveProposal.mockRejectedValue(new HttpError({ status, code, message: "no" }));
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    mockGetProposal.mockResolvedValue({ ...proposal, status: "approved", decided_at: "2026-09-22T15:00:00.000Z" });
    fireEvent.click(await screen.findByRole("button", { name: /^Aprobar$/ }));

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(expect.objectContaining({ tone: "error" }));
    });
    expect(mockGetProposal).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Se aprobó el 22 de septiembre.")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Cargando la acción" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Aprobar$/ })).toBeNull();
  });

  it("un 409 al rechazar también vuelve a leerla", async () => {
    rejectProposal.mockRejectedValue(new HttpError({ status: 409, code: "cmo/proposal_not_pending", message: "Esa propuesta ya fue decidida" }));
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    fireEvent.click(await screen.findByRole("button", { name: "Rechazar" }));
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    await waitFor(() => {
      expect(mockGetProposal).toHaveBeenCalledTimes(2);
    });
  });

  it("aprobada fuera de esta sesión: en pasado, con lo que devuelve el servidor y sin futuro (C6)", async () => {
    mockGetProposal.mockResolvedValue({ ...proposal, status: "approved", decided_at: "2026-09-22T15:00:00.000Z" });
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText("Se aprobó el 22 de septiembre.")).toBeInTheDocument();
    expect(screen.getByText("Lo que se encendió se sigue en Tareas.")).toBeInTheDocument();
    const approved = screen.getByRole("region", { name: "Lo que se aprobó" });
    expect(approved).toHaveTextContent("12 contactos");
    expect(approved).toHaveTextContent("quedaron fuera al aprobar");
    expect(approved).not.toHaveTextContent(/mañana|desde ahora|quedan fuera/);
    expect(screen.queryByRole("region", { name: "Qué va a pasar" })).toBeNull();
    expect(screen.getByRole("region", { name: "Después" })).toHaveTextContent("El avance se ve en Ventas cerradas y en Tareas.");
    expect(screen.queryByText(/^Verás/)).toBeNull();
    expect(screen.queryByText(/^Listo\./)).toBeNull();
    for (const link of screen.getAllByRole("link", { name: "Ver en Tareas" })) expect(link).toHaveAttribute("href", "/crm/tasks");
  });

  it("la evidencia se pinta tal cual como texto (C13)", async () => {
    mockGetProposal.mockResolvedValue({ ...proposal, evidence: [{ label: "Ventas del mes", value: "$ 18,9 M COP", source: "history" }] });
    render(<ActionSheetRoute proposalId={proposal.id} closeBehavior="back" />);
    expect(await screen.findByText("$ 18,9 M COP")).toBeInTheDocument();
  });
});
