import { act, render, screen, waitFor } from "@testing-library/react";
import { BulkFollowUpModal } from "@/modules/crm/ui/forms/bulk/BulkFollowUpModal";

const showAlert = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({
  useAlert: () => ({ showAlert, showModal: jest.fn(), closeModal: jest.fn() }),
}));
jest.mock("@/shared/auth/entitlements.hooks", () => ({
  useEntitlements: () => ({ hasCapability: () => false }),
}));
jest.mock("@/modules/agents/public", () => ({
  getTenantAgents: () => Promise.resolve([{ id: "ag-1", name: "Laura Sofía" }]),
}));
jest.mock("@/modules/companies/public", () => ({
  loadMyCompanyOnce: () => Promise.resolve({ timezone: "America/Bogota", name: "Axi" }),
}));
jest.mock("@/modules/channels/public", () => ({
  listChannels: () => Promise.resolve({ data: [{ id: "ch-1", kind: "whatsapp_cloud", name: "Ventas" }] }),
}));
jest.mock("@/modules/marketing/public", () => ({
  listHsmTemplates: () =>
    Promise.resolve([
      { id: "t-1", name: "seguimiento_cotizacion", language: "es", category: "utility", approval_status: "approved", body: "Hola {{1}}" },
    ]),
  isUsableAsOpening: () => true,
  bulkOpeningCost: (n: number) => ({ unit_usd: 0.02, total_usd: n * 0.02, category: "utility" }),
  formatUsd: (v: number) => `US$ ${v.toFixed(2)}`,
}));
jest.mock("@/modules/crm/infrastructure/services/agent-task-settings-service.adapter", () => ({
  getAgentTaskSettings: () => Promise.reject(new Error("sin ajustes")),
}));
const previewBulk = jest.fn();
const createBulk = jest.fn();
jest.mock("@/modules/crm/infrastructure/services/bulk-service.adapter", () => ({
  previewBulk: (...args: unknown[]) => previewBulk(...args),
  createBulk: (...args: unknown[]) => createBulk(...args),
}));
// La modal del DS monta un Dialog de Radix: aquí solo importa lo que pinta dentro.
jest.mock("@/shared/components/ui/modal", () => ({
  Modal: ({
    children,
    config,
  }: {
    children: React.ReactNode;
    config: { title: string; body?: React.ReactNode; actions: { label: string; disabled?: boolean }[] };
  }) => (
    <div>
      <h2>{config.title}</h2>
      {config.body}
      {children}
      {config.actions.map((action) => (
        <button key={action.label} disabled={action.disabled}>
          {action.label}
        </button>
      ))}
    </div>
  ),
}));

const AUDIENCE = { source: "contacts" as const, contact_ids: ["c1", "c2", "c3"] };

function preview(over: Partial<{ total: number; eligible: number; needs_opening: number; skipped: unknown[]; agent_tasks_enabled: boolean }> = {}) {
  return { total: 3, eligible: 2, needs_opening: 1, skipped: [{ reason: "no_channel", count: 1, contact_ids: ["c3"] }], within_limit: true, max: 5000, agent_tasks_enabled: true, ...over };
}

describe("BulkFollowUpModal — quién recibe esto (F4/F5)", () => {
  beforeEach(() => {
    previewBulk.mockReset();
    createBulk.mockReset();
  });

  it("cuenta en cifras: elegibles, quienes nunca escribieron y quienes quedan fuera, con su acción", async () => {
    previewBulk.mockResolvedValue(preview());
    render(<BulkFollowUpModal open audience={AUDIENCE} audienceLabel="3 contactos que marcaste" onOpenChange={jest.fn()} onScheduled={jest.fn()} />);

    expect(await screen.findByRole("heading", { name: "Seguimiento para 2 contactos" })).toBeInTheDocument();
    const panel = screen.getByRole("region", { name: "Quién recibe esto" });
    // En el DOM va dt→dd (C3): la etiqueta antes que la cifra; la cifra se pinta primero por CSS.
    // (la etiqueta corta del celular va delante de la larga)
    expect(panel).toHaveTextContent(/recibirán seguimiento\s*2/);
    expect(panel).toHaveTextContent(/abre con plantilla\s*1/);
    expect(panel).toHaveTextContent(/quedan fuera\s*1/);
    expect(panel).toHaveTextContent("Sin teléfono ni WhatsApp");
    // Dos copias del detalle: la fija (≥ sm) y la plegada del celular; las dos con la misma acción.
    for (const link of screen.getAllByRole("link", { name: "Completar teléfono" })) {
      expect(link).toHaveAttribute("href", "/crm/contacts/c3");
    }
  });

  it("con alguien que nunca escribió, la plantilla es obligatoria y bloquea «Programar»", async () => {
    previewBulk.mockResolvedValue(preview());
    render(<BulkFollowUpModal open audience={AUDIENCE} audienceLabel="x" onOpenChange={jest.fn()} onScheduled={jest.fn()} />);
    await screen.findByRole("heading", { name: "Seguimiento para 2 contactos" });
    await waitFor(() => expect(screen.getByLabelText("Plantilla de apertura")).toBeInTheDocument());

    expect(screen.getByText(/obligatoria para 1/)).toBeInTheDocument();
    expect(screen.getByLabelText("Plantilla de apertura")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Programar 2 seguimientos" })).toBeDisabled();
  });

  it("sin nadie que haya escrito nunca, la plantilla sigue siendo opcional", async () => {
    previewBulk.mockResolvedValue(preview({ needs_opening: 0 }));
    render(<BulkFollowUpModal open audience={AUDIENCE} audienceLabel="x" onOpenChange={jest.fn()} onScheduled={jest.fn()} />);
    await screen.findByRole("heading", { name: "Seguimiento para 2 contactos" });
    await waitFor(() => expect(screen.getByLabelText("Plantilla de apertura")).toBeInTheDocument());
    expect(screen.getByText(/· opcional/)).toBeInTheDocument();
    expect(screen.getByLabelText("Plantilla de apertura")).not.toHaveAttribute("aria-invalid");
  });

  it("con 0 elegibles explica qué pasó y no ofrece «Programar 0 seguimientos»", async () => {
    previewBulk.mockResolvedValue(preview({ total: 1, eligible: 0, needs_opening: 0, skipped: [{ reason: "no_channel", count: 1, contact_ids: ["c3"] }] }));
    await act(async () => {
      render(<BulkFollowUpModal open audience={AUDIENCE} audienceLabel="1 contacto que marcaste" onOpenChange={jest.fn()} onScheduled={jest.fn()} />);
    });
    expect(await screen.findByText("Nadie puede recibir este seguimiento todavía")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Programar" })).toBeDisabled();
    expect(screen.queryByText(/Programar 0/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Agente")).not.toBeInTheDocument();
  });

  it("con las tareas de agente apagadas avisa, enlaza a Ajustes y no deja programar", async () => {
    previewBulk.mockResolvedValue(preview({ needs_opening: 0, agent_tasks_enabled: false }));
    render(<BulkFollowUpModal open audience={AUDIENCE} audienceLabel="x" onOpenChange={jest.fn()} onScheduled={jest.fn()} />);
    expect(await screen.findByText(/Las tareas de agente están apagadas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enciéndelas en Ajustes" })).toHaveAttribute("href", "/crm/settings/agent-tasks");
    expect(screen.getByRole("button", { name: "Programar 2 seguimientos" })).toBeDisabled();
  });

  it("el singular no se pluraliza a la fuerza", async () => {
    previewBulk.mockResolvedValue(preview({ total: 1, eligible: 1, needs_opening: 0, skipped: [] }));
    render(<BulkFollowUpModal open audience={AUDIENCE} audienceLabel="x" onOpenChange={jest.fn()} onScheduled={jest.fn()} />);
    expect(await screen.findByRole("heading", { name: "Seguimiento para 1 contacto" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Programar 1 seguimiento" })).toBeInTheDocument();
  });
});
