import { z } from "zod";

import {
  AGENT_CHARACTERS,
  AGENT_COLORS,
  BRIEF_LIMITS,
  BRIEF_ROLES,
  BRIEF_TONES,
  SYSTEM_PROMPT_MAX,
  VOICE_POLICY_LIMITS,
} from "@/modules/agents/domain/agent";
import { VOICE_SETTING_RANGES } from "@/modules/agents/domain/agent-voice";

/**
 * El formulario del estudio de agentes: UN solo `useForm`, así que hay un solo
 * `isDirty` y un solo «Guardar». Los topes del brief son los del servidor
 * (`agentBriefSchema`, D3) y `system_prompt` sigue siendo obligatorio (D10)
 * con su mismo tope. Los numéricos van como string (inputs HTML) y se parsean
 * en los mappers, como hacía `AgentForm`.
 */
const ruleLine = z.string().trim().min(1, "Una regla vacía no dice nada").max(BRIEF_LIMITS.item, `Máximo ${String(BRIEF_LIMITS.item)} caracteres por regla`);
const rules = (max: number) => z.array(ruleLine).max(max, `Máximo ${String(max)} reglas`);

const optionalInt = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= min && Number(v) <= max), message)
    .optional();

export const agentStudioSchema = z.object({
  name: z.string().trim().min(1, "Escribe cómo se presenta al cliente").max(80, "Máximo 80 caracteres"),
  status: z.enum(["active", "paused", "draft"]),
  appearance: z.object({ character: z.enum(AGENT_CHARACTERS), color: z.enum(AGENT_COLORS) }),
  brief: z.object({
    role: z.enum(BRIEF_ROLES),
    tone: z.enum(BRIEF_TONES),
    goal: z.string().trim().max(BRIEF_LIMITS.goal, `Máximo ${String(BRIEF_LIMITS.goal)} caracteres`),
    always: rules(BRIEF_LIMITS.always),
    never: rules(BRIEF_LIMITS.never),
    handoff_when: rules(BRIEF_LIMITS.handoff_when),
    business_facts: rules(BRIEF_LIMITS.business_facts),
  }),
  system_prompt: z
    .string()
    .trim()
    .min(1, "Las instrucciones adicionales son obligatorias: aunque sea una línea")
    .max(SYSTEM_PROMPT_MAX, `Máximo ${String(SYSTEM_PROMPT_MAX)} caracteres`),
  voice: z.object({
    voice_id: z.string(),
    stability: z.number().min(VOICE_SETTING_RANGES.stability.min).max(VOICE_SETTING_RANGES.stability.max),
    similarity_boost: z.number().min(VOICE_SETTING_RANGES.similarity_boost.min).max(VOICE_SETTING_RANGES.similarity_boost.max),
    speed: z.number().min(VOICE_SETTING_RANGES.speed.min).max(VOICE_SETTING_RANGES.speed.max),
  }),
  provider: z.enum(["openai_compatible", "anthropic"]),
  model: z.string().trim().min(1, "Elige un modelo"),
  // El tope real depende del proveedor (Anthropic 1, OpenAI 2): lo afina la vista con el catálogo
  temperature: z
    .string()
    .trim()
    .refine((v) => v === "" || (!Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 2), "Entre 0 y 2")
    .optional(),
  max_tokens: optionalInt(1, 32_000, "Entero entre 1 y 32000"),
  skills: z.array(z.string().trim().min(1).max(80)).max(30),
  handoff_keywords: z.array(z.string().trim().min(1).max(80)).max(50),
  max_failures: optionalInt(1, 10, "Entre 1 y 10"),
  voice_policy: z.object({
    enabled: z.boolean(),
    max_per_conversation: optionalInt(VOICE_POLICY_LIMITS.max_per_conversation.min, VOICE_POLICY_LIMITS.max_per_conversation.max, "Entre 1 y 20"),
    max_chars: optionalInt(VOICE_POLICY_LIMITS.max_chars.min, VOICE_POLICY_LIMITS.max_chars.max, "Entre 1 y 2000"),
  }),
  intentions: z.array(z.string()),
});

export type AgentStudioValues = z.infer<typeof agentStudioSchema>;
