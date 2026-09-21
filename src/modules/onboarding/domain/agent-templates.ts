/**
 * Plantillas de agente por nicho (paso «Agentes» del onboarding). Dominio
 * PURO. La plantilla la resuelve el servidor (prompt, intenciones, manual de
 * ventas, modelo): aquí solo se elige y se personaliza lo que el dueño del
 * negocio entiende — nombre, tono, personalidad y datos clave.
 */

/** Una plantilla del catálogo, tal como la sirve el servidor. */
import type { Schemas } from "@/core/api/types";
import {
  BRIEF_TONE_LABELS,
  BRIEF_TONES,
  DEFAULT_APPEARANCE,
  type AgentAppearance,
  type AgentBriefTone,
} from "@/modules/agents/public";

export type AgentTemplateDTO = Schemas["AgentTemplateListDto"]["data"][number];

export type AgentTemplateRole = AgentTemplateDTO["role"];

/** El tono es el del brief del agente: una sola fuente (`agents/public`). */
export const AGENT_TONES = BRIEF_TONES;
export type AgentTone = AgentBriefTone;
export const TONE_LABELS: Record<AgentTone, string> = {
  cercano: BRIEF_TONE_LABELS.cercano.label,
  formal: BRIEF_TONE_LABELS.formal.label,
  directo: BRIEF_TONE_LABELS.directo.label,
};

export const ROLE_LABELS: Record<AgentTemplateRole, string> = {
  ventas: "Ventas",
  reservas: "Reservas",
  soporte: "Atención",
  captacion: "Captación",
};

export type CreateAgentFromTemplateDTO = Schemas["CreateAgentFromTemplateDto"];

/** Los overrides tal como los acepta el servidor (la voz es la forma NO vacía: aquí no se «quita»). */
export type AgentTemplateOverrides = NonNullable<CreateAgentFromTemplateDTO["overrides"]>;

export const EXTRA_INSTRUCTIONS_MAX = 2000;

export type AgentTemplateDraft = {
  name: string;
  tone: AgentTone;
  appearance: AgentAppearance;
  /** `external_voice_id` del catálogo; `""` = sin voz. */
  voice_id: string;
  extra_instructions: string;
};

/** Lo que la plantilla recomienda como cara, o el default global. */
export function templateAppearance(template: AgentTemplateDTO): AgentAppearance {
  return {
    character: template.recommended_character_code ?? DEFAULT_APPEARANCE.character,
    color: template.recommended_color_code ?? DEFAULT_APPEARANCE.color,
  };
}

/** «Joao, vendedor de La Parrilla»: el nombre del negocio manda; sin él, el de la plantilla. */
export function defaultAgentName(template: AgentTemplateDTO, companyName: string | null): string {
  if (!companyName) return template.name;
  const role = ROLE_LABELS[template.role].toLowerCase();
  return `${role === "ventas" ? "Vendedor" : role === "reservas" ? "Reservas" : role === "atención" ? "Atención" : "Captación"} de ${companyName}`;
}

export function recommendedTemplate(templates: readonly AgentTemplateDTO[]): AgentTemplateDTO | null {
  return templates.find((template) => template.recommended) ?? templates[0] ?? null;
}

export function initialDraft(template: AgentTemplateDTO, companyName: string | null): AgentTemplateDraft {
  return {
    name: defaultAgentName(template, companyName),
    tone: "cercano",
    appearance: templateAppearance(template),
    // Sin voz por defecto: elegirla enciende las notas de voz (cuestan); lo decide el dueño.
    voice_id: "",
    extra_instructions: "",
  };
}

/** Motivo por el que el borrador no se puede enviar, o `null`. */
export function draftBlocker(draft: AgentTemplateDraft): string | null {
  if (draft.name.trim().length < 2) return "Escribe cómo se presentará el agente.";
  if (draft.extra_instructions.length > EXTRA_INSTRUCTIONS_MAX) return `Los datos clave superan ${EXTRA_INSTRUCTIONS_MAX} caracteres.`;
  return null;
}

/** Solo viaja lo que el usuario cambió respecto a la plantilla. */
export function toCreateDTO(template: AgentTemplateDTO, draft: AgentTemplateDraft, companyName: string | null): CreateAgentFromTemplateDTO {
  const overrides: AgentTemplateOverrides = {};
  const name = draft.name.trim();
  if (name && name !== defaultAgentName(template, companyName)) overrides.name = name;
  else if (name && companyName) overrides.name = name; // el nombre con la empresa sí viaja: el servidor no la conoce en la plantilla
  if (draft.tone !== "cercano") overrides.tone = draft.tone;
  const recommended = templateAppearance(template);
  if (draft.appearance.character !== recommended.character || draft.appearance.color !== recommended.color) {
    overrides.appearance = draft.appearance;
  }
  // La voz solo viaja si el dueño la eligió: mandarla enciende las notas de voz del agente.
  if (draft.voice_id !== "") {
    overrides.voice = { provider: "elevenlabs", voice_id: draft.voice_id };
  }
  const extra = draft.extra_instructions.trim();
  if (extra) overrides.extra_instructions = extra;
  return {
    template_code: template.code,
    ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
    status: "active",
  };
}

/** «Crear el recomendado tal cual»: la plantilla decide todo salvo el nombre con la empresa. */
export function quickCreateDTO(template: AgentTemplateDTO, companyName: string | null): CreateAgentFromTemplateDTO {
  return {
    template_code: template.code,
    ...(companyName ? { overrides: { name: defaultAgentName(template, companyName) } } : {}),
    status: "active",
  };
}
