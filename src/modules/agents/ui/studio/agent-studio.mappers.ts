import {
  agentVoicePolicy,
  DEFAULT_APPEARANCE,
  emptyBrief,
  type AgentBriefRole,
  type AiAgentDTO,
  type AiModelDTO,
  type CreateAiAgentDTO,
  type SetAgentIntentionsDTO,
  type UpdateAiAgentDTO,
} from "@/modules/agents/domain/agent";
import { buildVoiceDto, voiceFormValues } from "@/modules/agents/domain/agent-voice";
import type { AgentStudioValues } from "@/modules/agents/ui/studio/agent-studio.schema";

/** Funciones PURAS entre el agente del servidor y los valores del formulario (y vuelta). */

/** El modelo preseleccionado del proveedor (o el primero) — el catálogo lo marca. */
export function defaultModelFor(models: readonly AiModelDTO[] | null, provider: AgentStudioValues["provider"]): string {
  const candidates = (models ?? []).filter((entry) => entry.provider === provider);
  return (candidates.find((entry) => entry.is_default) ?? candidates[0])?.model ?? "";
}

export function defaultStudioValues(models: readonly AiModelDTO[] | null): AgentStudioValues {
  return {
    name: "",
    status: "draft",
    appearance: { ...DEFAULT_APPEARANCE },
    brief: { ...emptyBrief("ventas"), goal: "" },
    system_prompt: "",
    voice: voiceFormValues(null),
    provider: "anthropic",
    model: defaultModelFor(models, "anthropic"),
    temperature: "",
    max_tokens: "",
    skills: [],
    handoff_keywords: ["asesor", "humano"],
    max_failures: "",
    voice_policy: { enabled: false, max_per_conversation: "", max_chars: "" },
    intentions: [],
  };
}

/**
 * Un agente anterior al estudio no tiene brief. Su rol se DERIVA de las
 * intenciones que ya atiende con una precedencia FIJA: venta manda; si no,
 * captación; si no, soporte/técnico; si no, ventas. La migración del servidor
 * usó los mismos códigos pero ordenando por `priority`, que la vista del
 * agente no expone; los dos caminos nunca ven el mismo agente (la migración
 * solo rellenó briefs y esto solo actúa cuando el brief es null). Sin esto,
 * abrir un agente de soporte para cambiarle el color y guardar lo convertía
 * en «quien vende y toma los pedidos» sin avisar (auditoría C-H1).
 */
export function roleFromIntentions(intentions: readonly { type: string }[]): AgentBriefRole {
  const types = new Set(intentions.map((link) => link.type));
  if (types.has("sales")) return "ventas";
  if (types.has("onboarding")) return "captacion";
  if (types.has("support") || types.has("technical")) return "soporte";
  return "ventas";
}

export function agentToStudioValues(agent: AiAgentDTO): AgentStudioValues {
  const handoff = agent.handoff_policy as { keywords?: string[]; max_failures?: number };
  const params = agent.model_params as { temperature?: number; max_tokens?: number };
  const policy = agentVoicePolicy(agent.voice_policy);
  const brief = agent.brief ?? emptyBrief(roleFromIntentions(agent.intentions));
  return {
    name: agent.name,
    status: agent.status,
    appearance: { ...agent.appearance },
    brief: {
      role: brief.role,
      tone: brief.tone,
      goal: brief.goal ?? "",
      always: [...brief.always],
      never: [...brief.never],
      handoff_when: [...brief.handoff_when],
      business_facts: [...brief.business_facts],
    },
    system_prompt: agent.system_prompt,
    voice: voiceFormValues(agent.voice),
    // 'mock' es interno de quality y no se puede asignar desde el panel
    provider: agent.provider === "mock" ? "openai_compatible" : agent.provider,
    model: agent.model,
    temperature: params.temperature !== undefined ? String(params.temperature) : "",
    max_tokens: params.max_tokens !== undefined ? String(params.max_tokens) : "",
    skills: [...agent.skills],
    handoff_keywords: [...(handoff.keywords ?? [])],
    max_failures: handoff.max_failures !== undefined ? String(handoff.max_failures) : "",
    voice_policy: {
      enabled: policy.enabled,
      max_per_conversation: policy.max_per_conversation !== undefined ? String(policy.max_per_conversation) : "",
      max_chars: policy.max_chars !== undefined ? String(policy.max_chars) : "",
    },
    intentions: agent.intentions.map((link) => link.intention_id),
  };
}

/**
 * El DTO de escritura. Es la misma forma para crear y actualizar (reemplazo
 * completo de cada JSON, como hacía `AgentForm`); `voice` solo viaja cuando hay
 * algo que decir (`buildVoiceDto`: `{}` quita la voz, `undefined` no la toca).
 */
export function toAgentDto(values: AgentStudioValues, existing: AiAgentDTO | null): CreateAiAgentDTO {
  const voice = buildVoiceDto(values.voice, existing?.voice ?? null);
  const goal = values.brief.goal.trim();
  return {
    name: values.name.trim(),
    status: values.status,
    provider: values.provider,
    model: values.model,
    system_prompt: values.system_prompt.trim(),
    appearance: values.appearance,
    brief: {
      role: values.brief.role,
      tone: values.brief.tone,
      ...(goal ? { goal } : {}),
      always: values.brief.always,
      never: values.brief.never,
      handoff_when: values.brief.handoff_when,
      business_facts: values.brief.business_facts,
    },
    skills: values.skills,
    model_params: {
      ...(values.temperature ? { temperature: Number(values.temperature) } : {}),
      ...(values.max_tokens ? { max_tokens: Number(values.max_tokens) } : {}),
    },
    handoff_policy: {
      keywords: values.handoff_keywords,
      ...(values.max_failures ? { max_failures: Number(values.max_failures) } : {}),
    },
    // `mode: "mirror"` es el único modo válido hoy: responder con voz solo cuando el cliente usó voz
    voice_policy: {
      enabled: values.voice_policy.enabled,
      mode: "mirror",
      ...(values.voice_policy.max_per_conversation ? { max_per_conversation: Number(values.voice_policy.max_per_conversation) } : {}),
      ...(values.voice_policy.max_chars ? { max_chars: Number(values.voice_policy.max_chars) } : {}),
    },
    ...(voice !== undefined ? { voice } : {}),
  };
}

/** El de update es el parcial del de creación: la misma forma encaja sin cast (si divergen, `tsc` lo dice aquí). */
export function toUpdateDto(values: AgentStudioValues, existing: AiAgentDTO): UpdateAiAgentDTO {
  const dto: UpdateAiAgentDTO = toAgentDto(values, existing);
  return dto;
}

/** PUT del set completo, conservando los `requirements` que ya tenía cada intención. */
export function toIntentionsDto(values: AgentStudioValues, existing: AiAgentDTO | null): SetAgentIntentionsDTO {
  return {
    intentions: values.intentions.map((intention_id) => {
      const link = existing?.intentions.find((entry) => entry.intention_id === intention_id);
      return { intention_id, ...(link?.requirements ? { requirements: link.requirements } : {}) };
    }),
  };
}
