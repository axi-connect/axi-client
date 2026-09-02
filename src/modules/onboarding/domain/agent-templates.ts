/**
 * Plantillas de agente por nicho (paso «Agentes» del onboarding). Dominio
 * PURO. La plantilla la resuelve el servidor (prompt, intenciones, manual de
 * ventas, modelo): aquí solo se elige y se personaliza lo que el dueño del
 * negocio entiende — nombre, tono, personalidad y datos clave.
 */

export type AgentTemplateRole = "ventas" | "reservas" | "soporte" | "captacion";

// CONTRACT: `Schemas["AgentTemplateDto"]` (B3) en F7.
export type AgentTemplateDTO = {
  code: string;
  niche_code: string;
  name: string;
  role: AgentTemplateRole;
  description: string;
  default_skills: string[];
  intention_codes: Array<{ code: string; requirements?: Record<string, boolean> }>;
  recommended_character_id: string | null;
  recommended_voice_id: string | null;
  /** Placeholders que el servidor rellena: `company.name`, `company.city`… */
  placeholders: string[];
  /** La que el nicho propone primero. A lo sumo una por nicho. */
  recommended: boolean;
};

export const AGENT_TONES = ["cercano", "formal", "directo"] as const;
export type AgentTone = (typeof AGENT_TONES)[number];

export const TONE_LABELS: Record<AgentTone, string> = {
  cercano: "Cercano",
  formal: "Formal",
  directo: "Directo",
};

export const ROLE_LABELS: Record<AgentTemplateRole, string> = {
  ventas: "Ventas",
  reservas: "Reservas",
  soporte: "Atención",
  captacion: "Captación",
};

export type AgentTemplateOverrides = {
  name?: string;
  tone?: AgentTone;
  character_id?: string;
  voice_id?: string;
  /** «Datos clave que debe saber»: zonas, políticas, promociones. Máx. 2000. */
  extra_instructions?: string;
};

export const EXTRA_INSTRUCTIONS_MAX = 2000;

// CONTRACT: `CreateAgentFromTemplateDto` (B3).
export type CreateAgentFromTemplateDTO = {
  template_code: string;
  overrides?: AgentTemplateOverrides;
  status?: "active" | "draft";
};

export type AgentTemplateDraft = {
  name: string;
  tone: AgentTone;
  character_id: string | null;
  extra_instructions: string;
};

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
    character_id: template.recommended_character_id,
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
  if (draft.character_id && draft.character_id !== template.recommended_character_id) overrides.character_id = draft.character_id;
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
