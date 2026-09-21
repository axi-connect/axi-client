import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { AiAgentListItemDTO } from "@/modules/agents/domain/agent";
import { AgentsProvider } from "@/modules/agents/infrastructure/stores/agent.context";
import { AgentsGridView } from "../AgentsGridView";

const showAlert = jest.fn();
const showModal = jest.fn();
const closeModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert, showModal, closeModal }) }));

const listAgents = jest.fn();
const deleteAgent = jest.fn();
jest.mock("@/modules/agents/infrastructure/services/agent-service.adapter", () => ({
  listAgents: () => listAgents(),
  listAiModels: () => Promise.resolve({ data: [] }),
  deleteAgent: (...args: unknown[]) => deleteAgent(...args),
}));
jest.mock("@/modules/agents/infrastructure/services/intention-service.adapter", () => ({ listIntentions: () => Promise.resolve({ data: [] }) }));
jest.mock("@/modules/agents/infrastructure/services/voice-service.adapter", () => ({
  listAiVoices: () => Promise.resolve({ data: [] }),
  getVoiceSettings: () => Promise.resolve({ ai_enabled: true }),
}));
jest.mock("@/modules/channels/public", () => ({
  listChannels: () => Promise.resolve({ data: [{ id: "ch1", name: "Savage · WhatsApp", kind: "whatsapp_cloud", status: "connected", default_ai_agent_id: "a1" }] }),
  ChannelKindIcon: () => <span data-testid="channel-icon" />,
}));

const agent = (over: Partial<AiAgentListItemDTO>): AiAgentListItemDTO => ({
  id: "a1",
  name: "Valentina",
  status: "active",
  system_prompt: "x",
  skills: [],
  provider: "anthropic",
  model: "claude-sonnet-5",
  model_params: {},
  handoff_policy: {},
  voice_policy: {},
  appearance: { character: "nova", color: "coral" },
  voice: { provider: "elevenlabs", voice_id: "v1" },
  brief: { role: "ventas", tone: "cercano", always: [], never: [], handoff_when: [], business_facts: [] },
  intentions: [],
  created_at: "2026-09-21T00:00:00.000Z",
  updated_at: "2026-09-21T00:00:00.000Z",
  ...over,
});

const renderGrid = () =>
  render(
    <AgentsProvider>
      <AgentsGridView />
    </AgentsProvider>,
  );

describe("AgentsGridView", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sin agentes: el estado vacío con el trío y la única acción lleva a /admin/agents/new", async () => {
    listAgents.mockResolvedValueOnce({ data: [] });
    renderGrid();
    expect(await screen.findByText("Tu equipo empieza aquí")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /crear tu primer agente/i })).toHaveAttribute("href", "/admin/agents/new");
    expect(document.querySelectorAll("svg.assistant-avatar")).toHaveLength(3);
  });

  it("con agentes: una tarjeta por agente con personaje, rol, estado, canales que lo usan y voz; toda la tarjeta navega al estudio", async () => {
    listAgents.mockResolvedValueOnce({
      data: [agent({}), agent({ id: "a2", name: "Sofía", status: "paused", appearance: { character: "strobi", color: "mint" }, voice: null, brief: { role: "reservas", tone: "formal", always: [], never: [], handoff_when: [], business_facts: [] } })],
    });
    renderGrid();
    expect(await screen.findByRole("link", { name: /valentina, vende y toma pedidos, activo/i })).toHaveAttribute("href", "/admin/agents/a1");
    expect(screen.getByRole("link", { name: /sofía, gestiona la agenda, pausado/i })).toHaveAttribute("href", "/admin/agents/a2");
    expect(await screen.findByText("Savage · WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Sin canal asignado")).toBeInTheDocument();
    expect(screen.getByText("Con voz")).toBeInTheDocument();
    expect(screen.getByText("Sin voz")).toBeInTheDocument();
    // avatares estáticos, uno por tarjeta; el pausado duerme
    expect(document.querySelector('svg[data-character="strobi"][data-color="mint"]')).toHaveAttribute("data-expression", "asleep");
  });

  it("eliminar pide confirmación y, al confirmar, borra y recarga", async () => {
    listAgents.mockResolvedValue({ data: [agent({})] });
    deleteAgent.mockResolvedValueOnce(undefined);
    renderGrid();
    fireEvent.click(await screen.findByRole("button", { name: /más acciones de valentina/i }));
    fireEvent.click(await screen.findByText("Eliminar agente"));
    expect(showModal).toHaveBeenCalledTimes(1);
    const config = showModal.mock.calls[0]?.[0] as { actions: { id: string; onClick?: () => void }[] };
    config.actions.find((action) => action.id === "agents-delete-confirm")?.onClick?.();
    await waitFor(() => expect(deleteAgent).toHaveBeenCalledWith("a1"));
    expect(listAgents).toHaveBeenCalledTimes(2);
  });
});
