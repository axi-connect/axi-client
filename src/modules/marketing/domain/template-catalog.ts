import type { Schemas } from "@/core/api/types";
import type { StatusMap } from "@/shared/components/features/status-badge/types";
import { HSM_APPROVAL_LABELS, type HsmApprovalStatus } from "./enums";

/** Plantillas del tenant y plantillas de Meta (HSM). */

export type TemplateDTO = Schemas["TemplateDto"];
export type CreateTemplateDTO = Schemas["CreateTemplateDto"];
export type UpdateTemplateDTO = Schemas["UpdateTemplateDto"];

export type HsmTemplateDTO = Schemas["HsmTemplateDto"];
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
