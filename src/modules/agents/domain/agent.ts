import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice agents — agentes de IA del tenant (`/ai-agents`).
 *
 * Desde el estudio de agentes (2026-09-21) un agente es: un **perfil** que el
 * tenant elige —personaje del catálogo de plataforma, color y voz—, un
 * **brief** estructurado (rol, objetivo, tono y cuatro listas de reglas) más
 * las «Instrucciones adicionales» (`system_prompt`, obligatorio), y la
 * configuración técnica (proveedor/modelo, intenciones, handoff, voz).
 *
 * Todos los tipos se derivan de `Schemas`: si el servidor cambia un enum, `tsc`
 * revienta aquí y no en la pantalla.
 */
export type AiAgentDTO = Schemas["AiAgentDto"];
export type AiAgentListItemDTO = Schemas["AiAgentListDto"]["data"][number];
export type CreateAiAgentDTO = Schemas["CreateAiAgentDto"];
export type UpdateAiAgentDTO = Schemas["UpdateAiAgentDto"];
export type SetAgentIntentionsDTO = Schemas["SetAgentIntentionsDto"];

export type AgentStatus = AiAgentDTO["status"];
export type AiProvider = AiAgentDTO["provider"];
export type AgentIntentionAssignment = AiAgentDTO["intentions"][number];

export const AGENT_STATUS_LABELS: Record<AgentStatus, string> = {
  active: "Activo",
  paused: "Pausado",
  draft: "Borrador",
};

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  openai_compatible: "OpenAI compatible",
  anthropic: "Anthropic",
  // Uso interno del módulo quality (QA simulado): jamás se ofrece en el form
  mock: "Mock (QA interno)",
};

/** Proveedor asignable desde el panel: `mock` es interno de quality y el
 * backend lo rechaza, así que el selector NO debe ofrecerlo (los labels de
 * arriba sí lo tienen: la rejilla debe poder mostrarlo). */
export type AssignableAiProvider = Exclude<AiProvider, "mock">;

export const ASSIGNABLE_AI_PROVIDERS: AssignableAiProvider[] = [
  "openai_compatible",
  "anthropic",
];

/**
 * Modelo del catálogo (`GET /ai-agents/models`). El catálogo son las tarifas
 * vigentes del panel de plataforma: un modelo sin precio no es elegible,
 * porque su consumo se mediría sin costo y el tope de gasto quedaría ciego.
 */
export type AiModelDTO = Schemas["AiModelListDto"]["data"][number];

/* ─────────────────────────── Perfil: personaje y color ─────────────────────────── */

export type AgentAppearance = AiAgentDTO["appearance"];
export type AgentCharacter = AgentAppearance["character"];
export type AgentColor = AgentAppearance["color"];

/** El catálogo (D4) es CÓDIGO en el servidor; aquí su espejo tipado: si el
 * servidor añade un personaje, esto deja de compilar hasta dibujarlo. */
export const AGENT_CHARACTERS = ["cloudee", "nova", "strobi"] as const satisfies readonly AgentCharacter[];
export const AGENT_COLORS = [
  "white",
  "cloud",
  "coral",
  "amber",
  "violet",
  "mint",
  "sky",
  "rose",
] as const satisfies readonly AgentColor[];

export const CHARACTER_LABELS: Record<AgentCharacter, string> = {
  cloudee: "Cloudee",
  nova: "Nova",
  strobi: "Strobi",
};

export const CHARACTER_TAGLINES: Record<AgentCharacter, string> = {
  cloudee: "Ligero y cercano",
  nova: "Curioso y atento",
  strobi: "Sereno y claro",
};

export const COLOR_LABELS: Record<AgentColor, string> = {
  white: "Blanco",
  cloud: "Nube",
  coral: "Coral",
  amber: "Ámbar",
  violet: "Violeta",
  mint: "Menta",
  sky: "Cielo",
  rose: "Rosa",
};

/** Con el que nace un agente sin elegir (mismo default que el servidor). */
export const DEFAULT_APPEARANCE: AgentAppearance = { character: "nova", color: "white" };

/* ─────────────────────────────── Brief ─────────────────────────────── */

export type AgentBrief = NonNullable<AiAgentDTO["brief"]>;
export type AgentBriefRole = AgentBrief["role"];
export type AgentBriefTone = AgentBrief["tone"];

export const BRIEF_ROLES = ["ventas", "reservas", "soporte", "captacion"] as const satisfies readonly AgentBriefRole[];
export const BRIEF_TONES = ["cercano", "formal", "directo"] as const satisfies readonly AgentBriefTone[];

/** Etiqueta corta (segmentado) y lo que hace de verdad (tarjeta, rejilla). */
export const BRIEF_ROLE_LABELS: Record<AgentBriefRole, { short: string; long: string }> = {
  ventas: { short: "Ventas", long: "Vende y toma pedidos" },
  reservas: { short: "Reservas", long: "Gestiona la agenda" },
  soporte: { short: "Soporte", long: "Atiende soporte" },
  captacion: { short: "Captación", long: "Capta clientes nuevos" },
};

export const BRIEF_TONE_LABELS: Record<AgentBriefTone, { label: string; hint: string }> = {
  cercano: { label: "Cercano", hint: "De tú, cálido" },
  formal: { label: "Formal", hint: "De usted, sin apodos" },
  directo: { label: "Directo", hint: "Sin rodeos ni relleno" },
};

/** Los mismos topes que el DTO estricto del servidor (`agentBriefSchema`). */
export const BRIEF_LIMITS = {
  goal: 300,
  item: 200,
  always: 8,
  never: 8,
  handoff_when: 6,
  business_facts: 10,
} as const;

/** `system_prompt` sigue siendo obligatorio (D10) con el tope del servidor. */
export const SYSTEM_PROMPT_MAX = 20_000;

export function emptyBrief(role: AgentBriefRole = "ventas"): AgentBrief {
  return { role, tone: "cercano", always: [], never: [], handoff_when: [], business_facts: [] };
}

/* ─────────────────────────────── Voz ─────────────────────────────── */

/** `agent.voice` tal como lo sirve el servidor (ya normalizado). */
export type AgentVoice = NonNullable<AiAgentDTO["voice"]>;

/** `voice` del DTO de escritura: STRICT en el servidor; `{}` quita la voz. */
export type AgentVoiceInput = NonNullable<CreateAiAgentDTO["voice"]>;

/** Un agente «tiene voz» cuando eligió una del catálogo. */
export function agentHasVoice(agent: Pick<AiAgentDTO, "voice">): boolean {
  return typeof agent.voice?.voice_id === "string" && agent.voice.voice_id.length > 0;
}

/**
 * `agent.voice_policy` (§10.5): CUÁNDO habla. El schema del backend es STRICT
 * (una clave desconocida es 400, jamás un apagado silencioso), así que el form
 * envía EXACTAMENTE estas claves. `mode: "mirror"` es el único valor hoy: el
 * agente responde con voz solo si el cliente usó voz en ese turno.
 */
export type AgentVoicePolicy = {
  enabled: boolean;
  mode: "mirror";
  max_per_conversation?: number;
  max_chars?: number;
};

export const VOICE_POLICY_LIMITS = {
  max_per_conversation: { min: 1, max: 20, fallback: 6 },
  max_chars: { min: 1, max: 2000 },
} as const;

/** Lectura tolerante del JSON de la vista (la escritura es estricta). */
export function agentVoicePolicy(raw: AiAgentDTO["voice_policy"] | null | undefined): {
  enabled: boolean;
  max_per_conversation?: number;
  max_chars?: number;
} {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    enabled: value.enabled === true,
    ...(typeof value.max_per_conversation === "number"
      ? { max_per_conversation: value.max_per_conversation }
      : {}),
    ...(typeof value.max_chars === "number" ? { max_chars: value.max_chars } : {}),
  };
}
