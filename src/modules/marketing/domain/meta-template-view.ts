import { isHttpError } from "@/core/api/problem";
import { HSM_APPROVAL_LABELS, type HsmApprovalStatus } from "./enums";
import { rejectionReasonLabel, whyUnusable, type HsmTemplateDTO } from "./template-catalog";

/**
 * Lo que la pantalla de plantillas de Meta dice de cada una (lienzo «Plantillas
 * de Meta premium», 2026-09-28). Puro: la vista solo pinta.
 */

/** Los tonos de `StatePill`: el color va en el punto, nunca en el texto. */
export type HsmStatusTone = "success" | "warning" | "destructive" | "neutral";

export const HSM_STATUS_TONE: Record<HsmApprovalStatus, HsmStatusTone> = {
  approved: "success",
  pending: "warning",
  rejected: "destructive",
  paused: "neutral",
  disabled: "neutral",
};

export function hsmStatusLabel(status: HsmApprovalStatus): string {
  return HSM_APPROVAL_LABELS[status];
}

/**
 * Qué implica el estado, en palabras del operador. El motivo del rechazo, si
 * Meta lo mandó en prosa, va firmado («Meta: …»): es SU veredicto, no el nuestro.
 */
export function hsmStatusNote(template: HsmTemplateDTO): string {
  switch (template.approval_status) {
    case "pending":
      return "Meta suele decidir en minutos; puede tardar hasta 48 h.";
    case "rejected": {
      const reason = rejectionReasonLabel(template.rejected_reason);
      if (reason === null) return "Corrige el texto y envíala como plantilla nueva: el nombre queda bloqueado 30 días.";
      // La prosa es de Meta y va firmada; un enum ya viene traducido a nuestra voz («El formato no le vale a Meta…»).
      const fromEnum = /^[A-Z_]+$/.test((template.rejected_reason ?? "").trim());
      return fromEnum ? reason : `Meta: ${reason}`;
    }
    case "paused":
      return "Varios destinatarios la marcaron como no deseada. Se reactiva si mejora la calidad.";
    case "disabled":
      return "Meta la deshabilitó por reportes repetidos o una violación de política.";
    case "approved":
      return whyUnusable(template) ?? "Sirve para abrir seguimientos del agente.";
  }
}

/**
 * La calidad de Meta en español, o `null` si no hay aviso que dar. Llega como
 * `GREEN`/`YELLOW`/`RED` (o `UNKNOWN`); antes se pintaba el enum en minúsculas
 * («Calidad yellow»).
 */
export function hsmQualityLabel(score: string | null): string | null {
  if (score === null) return null;
  const value = score.trim().toUpperCase();
  if (value === "" || value === "GREEN" || value === "UNKNOWN") return null;
  if (value === "YELLOW") return "media";
  if (value === "RED") return "baja";
  return score.toLowerCase();
}

/**
 * Por qué no se puede editar y —cuando lo hay— desde cuándo sí. La hora
 * concreta es lo que convierte un error en una instrucción.
 */
export function hsmEditHint(template: HsmTemplateDTO): string | undefined {
  if (template.editable) return undefined;
  const reason = template.edit_blocked_reason ?? "Meta no deja editarla ahora";
  if (template.edit_retry_at === null) return reason;
  const when = new Date(template.edit_retry_at).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${reason}. Podrás el ${when}.`;
}

/** Lo que la isla «Lo próximo» cuenta: lo que hay que corregir, lo que espera a Meta y lo que está por pausarse. */
export function hsmNextUp(templates: readonly HsmTemplateDTO[]): {
  rejected: HsmTemplateDTO[];
  pending: HsmTemplateDTO[];
  lowQuality: HsmTemplateDTO[];
} {
  return {
    rejected: templates.filter((template) => template.approval_status === "rejected"),
    pending: templates.filter((template) => template.approval_status === "pending"),
    lowQuality: templates.filter(
      (template) => template.approval_status === "approved" && hsmQualityLabel(template.quality_score) !== null,
    ),
  };
}

/** Los nombres de una lista, legibles: «a», «a y b», «a, b y 2 más». */
export function namesLine(templates: readonly HsmTemplateDTO[]): string {
  const names = templates.map((template) => template.name);
  if (names.length <= 2) return names.join(" y ");
  return `${names.slice(0, 2).join(", ")} y ${String(names.length - 2)} más`;
}

/**
 * Qué pasó al enviar, para decirlo DENTRO del formulario (tablero 8 del
 * lienzo). La rama importante es `unknown`: sin respuesta, Meta pudo recibirla
 * —así nació el incidente del 2026-09-28—, y lo honesto es mandar a mirar la
 * lista antes de reenviar.
 */
export type HsmSubmitFailure =
  | { kind: "exists_here"; templateId: string | null; status: HsmApprovalStatus | null }
  | { kind: "exists_meta" }
  | { kind: "meta_rejected"; detail: string | null; reference: string | null }
  | { kind: "invalid"; message: string }
  | { kind: "unknown" };

const APPROVAL_STATUSES = new Set<string>(["pending", "approved", "rejected", "paused", "disabled"]);

export function classifyHsmSubmitError(error: unknown): HsmSubmitFailure {
  if (!isHttpError(error)) return { kind: "unknown" };
  const details = (error.problem?.details ?? {}) as Record<string, unknown>;
  if (error.code === "channels/template_exists") {
    // Con `template_id` la teníamos aquí; sin él, fue Graph (100/2388024) quien dijo que ya existe.
    if (typeof details.template_id !== "string") return { kind: "exists_meta" };
    const status = typeof details.approval_status === "string" && APPROVAL_STATUSES.has(details.approval_status)
      ? (details.approval_status as HsmApprovalStatus)
      : null;
    return { kind: "exists_here", templateId: details.template_id, status };
  }
  if (error.code === "channels/template_sync_failed") {
    return {
      kind: "meta_rejected",
      detail: typeof details.detail === "string" ? details.detail : (error.problem?.detail ?? null),
      reference: typeof details.fbtrace_id === "string" ? details.fbtrace_id : null,
    };
  }
  // Un 4xx nuestro (borrador inválido, tope de edición, validación): el servidor ya dice qué corregir.
  if (error.status >= 400 && error.status < 500) {
    return { kind: "invalid", message: error.problem?.detail || error.problem?.title || error.message };
  }
  // 5xx sin código conocido, 504 del proxy, corte de red: no sabemos si llegó.
  return { kind: "unknown" };
}

/** `sesion_en_vivo_v1` → `sesion_en_vivo_v2`; sin sufijo, `_v2`. Cabe en los 120 caracteres de Meta. */
export function nextTemplateName(name: string): string {
  const match = /^(.*)_v(\d+)$/.exec(name);
  const next = match ? `${match[1]}_v${String(Number(match[2]) + 1)}` : `${name}_v2`;
  return next.slice(0, 120);
}
