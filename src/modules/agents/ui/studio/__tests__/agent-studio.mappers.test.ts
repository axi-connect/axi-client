import type { AiAgentDTO } from "@/modules/agents/domain/agent";
import { agentToStudioValues, defaultModelFor, defaultStudioValues, toAgentDto, toIntentionsDto } from "../agent-studio.mappers";

const MODELS = [
  { provider: "anthropic" as const, model: "claude-haiku-4-5-20251001", display_name: "Haiku", is_default: false, temperature_max: 1 },
  { provider: "anthropic" as const, model: "claude-sonnet-5", display_name: "Sonnet 5", is_default: true, temperature_max: 1 },
  { provider: "openai_compatible" as const, model: "gpt-4o-mini", display_name: "GPT-4o mini", is_default: true, temperature_max: 2 },
];

const AGENT: AiAgentDTO = {
  id: "a1",
  name: "Valentina",
  status: "active",
  system_prompt: "Usa «tú».",
  skills: ["moda"],
  provider: "anthropic",
  model: "claude-sonnet-5",
  model_params: { temperature: 0.6, max_tokens: 700 },
  handoff_policy: { keywords: ["asesor"], max_failures: 3 },
  voice_policy: { enabled: true, mode: "mirror", max_per_conversation: 6 },
  appearance: { character: "nova", color: "coral" },
  voice: { provider: "elevenlabs", voice_id: "v1", model_id: "eleven_flash_v2_5", settings: { stability: 0.55, style: 0.1 } },
  brief: {
    role: "ventas",
    tone: "cercano",
    goal: "Cerrar la venta.",
    always: ["Confirma talla y color."],
    never: ["Nunca inventes precios."],
    handoff_when: ["Reclamo por pedido pagado."],
    business_facts: ["Envíos a toda Colombia."],
  },
  intentions: [{ intention_id: "i1", requirements: { require_catalog: true }, code: "sales_inquiry", type: "sales", is_system: true }],
  created_at: "2026-09-21T00:00:00.000Z",
  updated_at: "2026-09-21T00:00:00.000Z",
};

describe("agent-studio.mappers", () => {
  it("defaults: nace en borrador, Nova/blanco, rol ventas, tono cercano y el modelo por defecto del proveedor", () => {
    const values = defaultStudioValues(MODELS);
    expect(values.status).toBe("draft");
    expect(values.appearance).toEqual({ character: "nova", color: "white" });
    expect(values.brief).toMatchObject({ role: "ventas", tone: "cercano", goal: "", always: [], never: [] });
    expect(values.provider).toBe("anthropic");
    expect(values.model).toBe("claude-sonnet-5");
    expect(defaultModelFor(MODELS, "openai_compatible")).toBe("gpt-4o-mini");
    expect(defaultModelFor(null, "anthropic")).toBe("");
  });

  it("agente → valores → DTO da la vuelta completa con EXACTAMENTE las claves del contrato", () => {
    const values = agentToStudioValues(AGENT);
    expect(values.voice).toEqual({ voice_id: "v1", stability: 0.55, similarity_boost: 0.75, speed: 1 });
    expect(values.voice_policy).toEqual({ enabled: true, max_per_conversation: "6", max_chars: "" });
    expect(values.intentions).toEqual(["i1"]);

    expect(toAgentDto(values, AGENT)).toEqual({
      name: "Valentina",
      status: "active",
      provider: "anthropic",
      model: "claude-sonnet-5",
      system_prompt: "Usa «tú».",
      appearance: { character: "nova", color: "coral" },
      brief: AGENT.brief,
      skills: ["moda"],
      model_params: { temperature: 0.6, max_tokens: 700 },
      handoff_policy: { keywords: ["asesor"], max_failures: 3 },
      voice_policy: { enabled: true, mode: "mirror", max_per_conversation: 6 },
      // model_id y settings.style se preservan; los sliders mandan lo suyo
      voice: { provider: "elevenlabs", voice_id: "v1", model_id: "eleven_flash_v2_5", settings: { style: 0.1, stability: 0.55, similarity_boost: 0.75, speed: 1 } },
    });
    expect(toIntentionsDto(values, AGENT)).toEqual({ intentions: [{ intention_id: "i1", requirements: { require_catalog: true } }] });
  });

  it("un objetivo vacío no viaja; quitar la voz manda {} y sin voz antes ni ahora no manda la clave", () => {
    const values = agentToStudioValues(AGENT);
    values.brief.goal = "   ";
    values.voice.voice_id = "";
    const dto = toAgentDto(values, AGENT);
    expect(dto.brief).not.toHaveProperty("goal");
    expect(dto.voice).toEqual({});

    const fresh = defaultStudioValues(MODELS);
    fresh.name = "Nuevo";
    fresh.system_prompt = "Hola.";
    const created = toAgentDto(fresh, null);
    expect(created).not.toHaveProperty("voice");
    expect(created.voice_policy).toEqual({ enabled: false, mode: "mirror" });
    expect(created.model_params).toEqual({});
  });

  it("un agente sin brief (anterior al estudio) abre con el brief vacío de ventas y un provider mock cae a openai", () => {
    const values = agentToStudioValues({ ...AGENT, brief: null, provider: "mock" });
    expect(values.brief).toEqual({ role: "ventas", tone: "cercano", goal: "", always: [], never: [], handoff_when: [], business_facts: [] });
    expect(values.provider).toBe("openai_compatible");
  });
});
