import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge/types";
import { HSM_APPROVAL_LABELS, type HsmApprovalStatus } from "./enums";

/** Plantillas del tenant y plantillas de Meta (HSM). */

export type TemplateDTO = Schemas["TemplateDto"];
export type CreateTemplateDTO = Schemas["CreateTemplateDto"];
export type UpdateTemplateDTO = Schemas["UpdateTemplateDto"];

export type HsmTemplateDTO = Schemas["HsmTemplateDto"];
export type MessagingWindowDTO = Schemas["MessagingWindowDto"];
export type CreateHsmTemplateDTO = Schemas["CreateHsmTemplateDto"];

/**
 * Una HSM sirve para marketing SOLO si está aprobada y su categoría es
 * `marketing`. Una `utility` aprobada existe y se ve bien, pero Meta rechaza
 * el envío promocional: filtrarla en el selector evita un fallo que solo
 * aparecería al lanzar la campaña.
 */
export function isUsableForMarketing(template: HsmTemplateDTO): boolean {
  return template.approval_status === "approved" && template.category === "marketing";
}

/** Por qué una plantilla NO se puede usar, o `null` si sí se puede. */
export function whyUnusable(template: HsmTemplateDTO): string | null {
  if (template.approval_status !== "approved") {
    return `Meta la tiene como ${HSM_APPROVAL_LABELS[template.approval_status].toLowerCase()}`;
  }
  if (template.category !== "marketing") {
    return "Solo las de categoría Marketing sirven para promociones";
  }
  return null;
}

/** Semáforo del estado de aprobación. `pending` es transitorio: lo decide Meta. */
export const HSM_STATUS_MAP: StatusMap = {
  approved: { label: HSM_APPROVAL_LABELS.approved, tone: "success" },
  pending: { label: HSM_APPROVAL_LABELS.pending, tone: "warning", transient: true },
  rejected: { label: HSM_APPROVAL_LABELS.rejected, tone: "destructive" },
  paused: { label: HSM_APPROVAL_LABELS.paused, tone: "neutral" },
  disabled: { label: HSM_APPROVAL_LABELS.disabled, tone: "neutral" },
};

export const HSM_APPROVAL_ORDER: readonly HsmApprovalStatus[] = [
  "approved",
  "pending",
  "rejected",
  "paused",
  "disabled",
] as const;

/**
 * Resumen del contenido de una plantilla del tenant para la tabla. Cada `kind`
 * guarda su contenido en un campo distinto y solo uno viene relleno.
 */
export function describeTemplateContent(template: TemplateDTO): string {
  switch (template.kind) {
    case "text":
      return template.body ?? "Sin contenido";
    case "media": {
      const media = template.media as { filename?: string; media_kind?: string } | null;
      if (!media) return "Sin archivo";
      return media.filename ?? `Archivo ${media.media_kind ?? ""}`.trim();
    }
    case "hsm": {
      const ref = template.hsm_ref as { name?: string; language?: string } | null;
      if (!ref?.name) return "Sin plantilla de Meta enlazada";
      return ref.language ? `${ref.name} (${ref.language})` : ref.name;
    }
  }
}

/* ─────────────── Apertura de tareas de agente (F2 seguimiento autónomo) ─────────────── */

/**
 * Una HSM puede ABRIR una tarea de agente si está aprobada y no es de
 * autenticación (esas son para códigos, no para conversar). A diferencia de
 * las campañas, aquí las `utility` son las preferidas: seguimiento de algo que
 * el cliente inició, y veinticinco veces más baratas.
 */
export function isUsableAsOpening(template: HsmTemplateDTO): boolean {
  return template.approval_status === "approved" && template.category !== "authentication";
}

export function whyUnusableAsOpening(template: HsmTemplateDTO): string | null {
  if (template.approval_status !== "approved") {
    return `Meta la tiene como ${HSM_APPROVAL_LABELS[template.approval_status].toLowerCase()}`;
  }
  if (template.category === "authentication") {
    return "Las de autenticación son para códigos, no para abrir una conversación";
  }
  return null;
}

/**
 * Tarifa de Meta por mensaje ENTREGADO en Colombia (USD), por categoría.
 * Referencia para el panel; la fuente de cobro real es el catálogo de tarifas
 * del backend (`meta/{categoria}_co`), editable desde /platform/pricing.
 */
export const TEMPLATE_COST_CO_USD: Record<HsmTemplateDTO["category"], number> = {
  utility: 0.0008,
  authentication: 0.0008,
  marketing: 0.02,
};

export function formatTemplateCost(category: HsmTemplateDTO["category"]): string {
  const usd = TEMPLATE_COST_CO_USD[category];
  return `≈ US$${usd.toLocaleString("es-CO", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
}

const VARIABLE_PATTERN = /\{\{(\d+)\}\}/g;

export type TemplateVariablesVerdict =
  | { ok: true; count: number }
  | { ok: false; reason: "not_sequential" | "at_edges" | "adjacent" };

/**
 * Espejo de las reglas de Meta que el backend aplica al alta
 * (`template_variables.ts`): secuenciales desde {{1}}, nunca en los bordes,
 * nunca pegadas. Aquí es comodidad —el 422 llega igual—, para que el aviso
 * salga al teclear y no al enviar.
 */
export function inspectTemplateVariables(body: string): TemplateVariablesVerdict {
  const indexes = [...body.matchAll(VARIABLE_PATTERN)].map((match) => Number(match[1]));
  if (indexes.length === 0) return { ok: true, count: 0 };
  const sorted = [...indexes].sort((a, b) => a - b);
  if (!sorted.every((value, position) => value === position + 1)) {
    return { ok: false, reason: "not_sequential" };
  }
  const trimmed = body.trim();
  if (/^\{\{\d+\}\}/.test(trimmed) || /\{\{\d+\}\}$/.test(trimmed)) {
    return { ok: false, reason: "at_edges" };
  }
  if (/\}\}\s*\{\{/.test(body)) return { ok: false, reason: "adjacent" };
  return { ok: true, count: sorted.length };
}

export const TEMPLATE_VARIABLE_MESSAGES: Record<
  Exclude<TemplateVariablesVerdict, { ok: true }>["reason"],
  string
> = {
  not_sequential: "Las variables deben ir en orden desde {{1}} y sin saltos",
  at_edges: "Una variable no puede abrir ni cerrar el mensaje: pon texto alrededor",
  adjacent: "Dos variables no pueden ir pegadas: separa {{1}} y {{2}} con texto",
};

/**
 * Cuántos huecos tiene el cuerpo, o **`null` si Meta no lo aceptaría**.
 *
 * Devolvía un número a secas, y traducía «no entiendo este cuerpo» a CERO — que
 * significa «no hay huecos que rellenar». Con eso, una plantilla con `{{1}}`
 * repetido no pintaba ni una fila de variable, el operador no veía nada raro y
 * el envío salía sin parámetros: Meta lo rechaza entero con 132000. El gemelo
 * de este bug vivía en el servidor y mordía en dos flujos a la vez.
 *
 * `null` obliga a quien llama a decidir qué enseñar. Si vuelves a querer un
 * número a secas, el motivo lo tienes en `inspectTemplateVariables`.
 */
/**
 * El motivo del rechazo que manda Meta, legible.
 *
 * `rejected_reason` NO siempre es una frase: cuando el webhook trae
 * `rejection_info` guardamos la prosa de Meta, pero si no, lo que llega es un
 * ENUM —`INCORRECT_CATEGORY`, `INVALID_FORMAT`, `PROMOTIONAL`…— y pintarlo
 * crudo le deja al operador colombiano un «INVALID_FORMAT» en inglés, que es
 * peor que la frase genérica que había antes.
 */
const META_REJECTION_LABELS: Record<string, string> = {
  ABUSIVE_CONTENT: "Meta la consideró contenido abusivo o engañoso",
  INCORRECT_CATEGORY: "La categoría no corresponde al contenido: Meta la clasificaría de otra",
  INVALID_FORMAT: "El formato no le vale a Meta: revisa variables, saltos y puntuación",
  PROMOTIONAL: "Tiene tono promocional y la enviaste como utility",
  SCAM: "Meta la leyó como un intento de estafa",
  TAG_CONTENT_MISMATCH: "El contenido no corresponde a la etiqueta que elegiste",
};

export function rejectionReasonLabel(raw: string | null): string | null {
  if (raw === null) return null;
  const value = raw.trim();
  if (value.length === 0 || value.toUpperCase() === "NONE") return null;
  // Un enum es MAYÚSCULAS y guiones bajos; cualquier otra cosa ya es prosa.
  return /^[A-Z_]+$/.test(value) ? (META_REJECTION_LABELS[value] ?? value) : value;
}

/** Por qué Meta no aceptaría ese cuerpo, en español. `null` si está bien. */
export function templateVariableIssue(body: string): string | null {
  const verdict = inspectTemplateVariables(body);
  return verdict.ok ? null : TEMPLATE_VARIABLE_MESSAGES[verdict.reason];
}

export function countTemplateVariables(body: string): number | null {
  const verdict = inspectTemplateVariables(body);
  return verdict.ok ? verdict.count : null;
}

/**
 * Si esta plantilla se puede mandar **sin parámetros**.
 *
 * Las automatizaciones no tienen mapeo de variables: su despacho manda
 * `{name, language}` y nada más. Una plantilla con `{{1}}` elegida aquí sale
 * pelada, y Meta la rechaza con 132000 **al ejecutarse la regla** — semanas
 * después de configurarla, sin que nadie esté mirando. El diseño siempre
 * asumió HSM sin variables; lo que faltaba era que algo lo comprobara.
 *
 * Un cuerpo que no se entiende (`null`) también queda fuera: es la misma
 * cautela que en el servidor, donde traducir «no lo entiendo» a «cero huecos»
 * mandaba lotes enteros que Meta rechazaba.
 */
export function sendsWithoutParams(template: HsmTemplateDTO): boolean {
  return countTemplateVariables(template.body) === 0;
}

/**
 * Tres plantillas de seguimiento para empezar: utility, con {{1}} nombre y
 * {{2}} tema, redactadas para pasar la revisión de Meta a la primera. El
 * cierre «respóndenos «no»» es la salida de opt-out que Meta valora.
 */
export const SUGGESTED_OPENING_TEMPLATES: ReadonlyArray<{
  key: string;
  title: string;
  name: string;
  body: string;
  examples: [string, string];
}> = [
  {
    key: "resume",
    title: "Retomar conversación",
    name: "seguimiento_retomar",
    body: "Hola {{1}}, te escribo por {{2}}. ¿Seguimos? Si prefieres que no te contactemos, respóndenos «no».",
    examples: ["Ana", "la cotización del plan anual"],
  },
  {
    key: "quote",
    title: "Recordar cotización",
    name: "seguimiento_cotizacion",
    body: "Hola {{1}}, tu cotización de {{2}} sigue vigente. ¿Quieres que la retomemos? Si prefieres que no te contactemos, respóndenos «no».",
    examples: ["Carlos", "el módulo de llamadas"],
  },
  {
    key: "interest",
    title: "Confirmar interés",
    name: "seguimiento_interes",
    body: "Hola {{1}}, hace unos días hablamos de {{2}}. ¿Sigues interesado? Respóndeme y te ayudo. Si prefieres que no te contactemos, respóndenos «no».",
    examples: ["Laura", "la demo del jueves"],
  },
];
