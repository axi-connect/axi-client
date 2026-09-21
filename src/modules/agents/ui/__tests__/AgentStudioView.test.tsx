import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { AiAgentDTO } from "@/modules/agents/domain/agent";
import { AgentsProvider } from "@/modules/agents/infrastructure/stores/agent.context";
import { AgentStudioView } from "../AgentStudioView";

const replace = jest.fn();
const push = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace, push }) }));

const showAlert = jest.fn();
const showModal = jest.fn();
jest.mock("@/core/providers/alert-provider", () => ({ useAlert: () => ({ showAlert, showModal, closeModal: jest.fn() }) }));

const createAgent = jest.fn();
const updateAgent = jest.fn();
const getAgentById = jest.fn();
const setAgentIntentions = jest.fn();
jest.mock("@/modules/agents/infrastructure/services/agent-service.adapter", () => ({
  listAgents: () => Promise.resolve({ data: [] }),
  listAiModels: () =>
    Promise.resolve({
      data: [
        { provider: "anthropic", model: "claude-sonnet-5", display_name: "Sonnet 5", is_default: true, temperature_max: 1 },
        { provider: "openai_compatible", model: "gpt-4o-mini", display_name: "GPT-4o mini", is_default: true, temperature_max: 2 },
      ],
    }),
  getAgentById: (...args: unknown[]) => getAgentById(...args),
  createAgent: (...args: unknown[]) => createAgent(...args),
  updateAgent: (...args: unknown[]) => updateAgent(...args),
  deleteAgent: jest.fn(),
  setAgentIntentions: (...args: unknown[]) => setAgentIntentions(...args),
}));
jest.mock("@/modules/agents/infrastructure/services/intention-service.adapter", () => ({ listIntentions: () => Promise.resolve({ data: [] }) }));
const voiceSettings = { ai_enabled: true };
jest.mock("@/modules/agents/infrastructure/services/voice-service.adapter", () => ({
  listAiVoices: () =>
    Promise.resolve({
      data: [{ id: "voice-1", provider: "elevenlabs", external_voice_id: "v1", name: "Lucía", description: "cálida", gender: "female", accent: "es-CO", default_model_id: "eleven_flash_v2_5", default_settings: {}, preview_url: null, is_active: true, sort_order: 0 }],
    }),
  getVoiceSettings: () => Promise.resolve(voiceSettings),
}));
jest.mock("@/modules/channels/public", () => ({
  listChannels: () => Promise.resolve({ data: [{ id: "ch1", name: "Savage · WhatsApp", kind: "whatsapp_cloud", status: "connected", default_ai_agent_id: "a1" }] }),
  ChannelKindIcon: () => <span data-testid="channel-icon" />,
}));

const AGENT: AiAgentDTO = {
  id: "a1",
  name: "Valentina",
  status: "active",
  system_prompt: "Usa «tú».",
  skills: [],
  provider: "anthropic",
  model: "claude-sonnet-5",
  model_params: {},
  handoff_policy: {},
  voice_policy: {},
  appearance: { character: "nova", color: "coral" },
  voice: null,
  brief: { role: "ventas", tone: "cercano", goal: "Cerrar la venta.", always: ["Confirma talla."], never: [], handoff_when: [], business_facts: [] },
  intentions: [],
  created_at: "2026-09-21T00:00:00.000Z",
  updated_at: "2026-09-21T00:00:00.000Z",
};

const renderStudio = (props: { mode: "create" } | { mode: "edit"; agentId: string }) =>
  render(
    <AgentsProvider>
      <AgentStudioView {...props} />
    </AgentsProvider>,
  );

describe("AgentStudioView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    voiceSettings.ai_enabled = true;
  });

  it("crear: nombre + instrucciones bastan; manda el perfil por defecto (Nova/blanco, ventas, cercano), sin voz, y navega al agente", async () => {
    createAgent.mockResolvedValueOnce({ ...AGENT, id: "new-1", name: "Mateo" });
    renderStudio({ mode: "create" });

    // un solo avatar vivo: el del escenario (botón «Saludar»); los tiles son svg pelados
    expect(await screen.findByRole("button", { name: /saludar a tu agente/i })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^nombre/i), { target: { value: "Mateo" } });
    fireEvent.change(screen.getByLabelText(/instrucciones adicionales/i), { target: { value: "Habla claro." } });
    fireEvent.click(screen.getByRole("button", { name: "Crear agente" }));

    await waitFor(() => expect(createAgent).toHaveBeenCalledTimes(1));
    expect(createAgent.mock.calls[0]?.[0]).toMatchObject({
      name: "Mateo",
      status: "draft",
      system_prompt: "Habla claro.",
      appearance: { character: "nova", color: "white" },
      brief: { role: "ventas", tone: "cercano", always: [], never: [], handoff_when: [], business_facts: [] },
      voice_policy: { enabled: false, mode: "mirror" },
      provider: "anthropic",
      model: "claude-sonnet-5",
    });
    expect(createAgent.mock.calls[0]?.[0]).not.toHaveProperty("voice");
    expect(setAgentIntentions).not.toHaveBeenCalled();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/agents/new-1"));
  });

  it("crear: sin instrucciones adicionales no se envía (D10) y el error se ve", async () => {
    renderStudio({ mode: "create" });
    await screen.findByRole("button", { name: /saludar/i });
    fireEvent.change(screen.getByLabelText(/^nombre/i), { target: { value: "Mateo" } });
    fireEvent.click(screen.getByRole("button", { name: "Crear agente" }));
    expect(await screen.findByText(/instrucciones adicionales son obligatorias/i)).toBeInTheDocument();
    expect(createAgent).not.toHaveBeenCalled();
  });

  it("editar: carga el agente, «Guardar» se enciende solo con cambios, y guardar manda PATCH + PUT de intenciones y limpia el dirty", async () => {
    getAgentById.mockResolvedValueOnce(AGENT);
    updateAgent.mockResolvedValueOnce({ ...AGENT, name: "Vale" });
    setAgentIntentions.mockResolvedValueOnce({ ...AGENT, name: "Vale" });
    renderStudio({ mode: "edit", agentId: "a1" });

    const save = await screen.findByRole("button", { name: "Guardar cambios" });
    expect(save).toBeDisabled();
    expect(screen.getByDisplayValue("Valentina")).toBeInTheDocument();
    expect(screen.getByText("Confirma talla.")).toBeInTheDocument();
    // canales que lo usan, informativo
    expect(await screen.findByText("Savage · WhatsApp")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^nombre/i), { target: { value: "Vale" } });
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => expect(updateAgent).toHaveBeenCalledWith("a1", expect.objectContaining({ name: "Vale", appearance: { character: "nova", color: "coral" } })));
    expect(setAgentIntentions).toHaveBeenCalledWith("a1", { intentions: [] });
    expect(await screen.findByText(/guardado hace un momento/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();
  });

  it("con la voz de empresa apagada el bloque de voz se deshabilita y explica dónde encenderla", async () => {
    voiceSettings.ai_enabled = false;
    renderStudio({ mode: "create" });
    expect(await screen.findByText(/apagadas para tu empresa/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /configuración → voz/i })).toHaveAttribute("href", "/settings/voice");
  });

  it("un error del servidor se dice en la barra y el personaje lo siente; en reposo no quedan temporizadores", async () => {
    jest.useFakeTimers();
    try {
      createAgent.mockRejectedValueOnce(new Error("El servidor no responde"));
      renderStudio({ mode: "create" });
      await act(async () => {
        await Promise.resolve();
      });
      fireEvent.change(screen.getByLabelText(/^nombre/i), { target: { value: "Mateo" } });
      fireEvent.change(screen.getByLabelText(/instrucciones adicionales/i), { target: { value: "Hola." } });
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Crear agente" }));
        await Promise.resolve();
        await Promise.resolve();
      });
      // errorMessage() prefiere el mensaje real al fallback: la barra dice lo que pasó
      expect(await screen.findByRole("alert")).toHaveTextContent(/el servidor no responde/i);
      expect(screen.getByRole("button", { name: /saludar/i })).toHaveAttribute("data-mood", "sorry");
      // Los cambios de humor disparan parpadeos FINITOS (encadenados, de un
      // disparo). `runAllTimers` revienta si hubiera un bucle; al agotarse, cero.
      act(() => {
        jest.runAllTimers();
      });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
