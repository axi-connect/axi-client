import { render, screen, waitFor } from "@testing-library/react";
import type { AiModelDTO } from "@/modules/agents/domain/agent";
import { AgentForm } from "../AgentForm";

/**
 * El modelo del agente era un input de texto libre: un typo creaba un agente
 * cuyas conversaciones fallaban en cada turno y cuyo consumo quedaba sin
 * tarifa. Ahora sale de `GET /ai-agents/models`, que el backend deriva de las
 * tarifas vigentes.
 */
const MODELS: AiModelDTO[] = [
  {
    provider: "anthropic",
    model: "claude-sonnet-5",
    display_name: "Claude Sonnet 4.5",
    is_default: false,
    temperature_max: 1,
  },
  {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    display_name: "Claude Haiku 4.5",
    is_default: true,
    temperature_max: 1,
  },
  {
    provider: "openai_compatible",
    model: "gpt-4o-mini",
    display_name: "GPT-4o mini",
    is_default: true,
    temperature_max: 2,
  },
];

const listAiModels = jest.fn();
jest.mock("@/modules/agents/infrastructure/services/agent-service.adapter", () => ({
  listAiModels: () => listAiModels(),
  createAgent: jest.fn(),
  updateAgent: jest.fn(),
  setAgentIntentions: jest.fn(),
}));

// Mutable por test: la sección de voz depende del switch de empresa
const agentContext = {
  characters: [] as unknown[],
  intentions: [],
  voices: null,
  voiceSettings: null as { ai_enabled: boolean } | null,
  fetchCharacters: jest.fn(),
  fetchIntentions: jest.fn(),
  fetchVoices: jest.fn(),
  fetchVoiceSettings: jest.fn(),
};
jest.mock("@/modules/agents/infrastructure/stores/agent.context", () => ({
  useAgent: () => agentContext,
}));

jest.mock("@/modules/agents/ui/components/AgentIntentionsEditor", () => ({
  AgentIntentionsEditor: () => <div />,
}));

describe("AgentForm — selector de modelos", () => {
  beforeEach(() => {
    listAiModels.mockReset();
    listAiModels.mockResolvedValue({ data: MODELS });
    agentContext.voiceSettings = null;
  });

  it("el modelo ya no es un campo de texto libre", async () => {
    render(<AgentForm />);
    await waitFor(() => {
      expect(listAiModels).toHaveBeenCalled();
    });
    // El combobox de modelo existe; no hay input de texto para escribirlo
    const inputs = screen.queryAllByPlaceholderText(/claude-sonnet-5|gpt-4o-mini/u);
    expect(inputs).toHaveLength(0);
  });

  it("preselecciona el modelo por defecto del proveedor inicial", async () => {
    render(<AgentForm />);
    // El form arranca en anthropic; su default es Haiku
    await waitFor(() => {
      expect(screen.getByText("Claude Haiku 4.5")).toBeInTheDocument();
    });
  });

  it("no ofrece el proveedor mock (es interno de quality y el backend lo rechaza)", async () => {
    render(<AgentForm />);
    await waitFor(() => {
      expect(listAiModels).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Mock \(QA interno\)/u)).not.toBeInTheDocument();
  });

  it("acota la temperatura al máximo del proveedor (Anthropic corta en 1)", async () => {
    render(<AgentForm />);
    await waitFor(() => {
      expect(listAiModels).toHaveBeenCalled();
    });
    const temperature = screen.getByLabelText(/Temperatura/u);
    expect(temperature).toHaveAttribute("max", "1");
  });

  it("si el catálogo falla, el selector queda vacío en vez de romper el form", async () => {
    listAiModels.mockRejectedValue(new Error("boom"));
    render(<AgentForm />);
    await waitFor(() => {
      expect(screen.getByText(/Sin modelos disponibles/u)).toBeInTheDocument();
    });
  });
});

describe("AgentForm — política de voz (§10.5 F2)", () => {
  beforeEach(() => {
    listAiModels.mockReset();
    listAiModels.mockResolvedValue({ data: MODELS });
    agentContext.voiceSettings = null;
  });

  it("la sección existe con el switch de responder con notas de voz", async () => {
    render(<AgentForm />);
    await waitFor(() => {
      expect(screen.getByRole("switch", { name: /Responder con notas de voz/u })).toBeInTheDocument();
    });
  });

  it("con la voz de empresa APAGADA la sección se deshabilita y se explica (nunca se oculta)", async () => {
    agentContext.voiceSettings = { ai_enabled: false };
    render(<AgentForm />);
    await waitFor(() => {
      expect(screen.getByText(/La voz está desactivada para tu empresa/u)).toBeInTheDocument();
    });
    expect(screen.getByRole("switch", { name: /Responder con notas de voz/u })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Actívala en Configuración/u })).toHaveAttribute(
      "href",
      "/settings/voice",
    );
  });

  it("con el switch de empresa desconocido (fetch fallido) NO se bloquea la sección", async () => {
    agentContext.voiceSettings = null;
    render(<AgentForm />);
    await waitFor(() => {
      expect(screen.getByRole("switch", { name: /Responder con notas de voz/u })).toBeEnabled();
    });
    expect(screen.queryByText(/La voz está desactivada/u)).not.toBeInTheDocument();
  });
});
