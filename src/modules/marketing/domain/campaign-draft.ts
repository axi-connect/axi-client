import type { SegmentFilters } from "@/modules/crm/public";
import type { AudiencePreviewDTO, CreateCampaignDTO, UpdateCampaignDTO } from "./campaign";

/**
 * Estado del wizard de campaña, en TypeScript puro.
 *
 * La lógica vive aquí y no en el componente porque es lo que decide si se puede
 * avanzar, qué viaja al backend y cómo se lee la estimación de audiencia — tres
 * cosas que conviene poder probar sin montar cuatro pasos de UI.
 */

export type AudienceMode = "all" | "segment" | "filters";

export type CampaignDraft = {
  name: string;
  description: string;
  audienceMode: AudienceMode;
  segmentId: string | null;
  filters: SegmentFilters;
  /** `null` = plantilla del tenant sin elegir todavía. */
  templateId: string | null;
  hsmChannelTemplateId: string | null;
  /** `""` = sale en cuanto se lance. */
  scheduledDate: string;
  scheduledTime: string;
};

export const EMPTY_DRAFT: CampaignDraft = {
  name: "",
  description: "",
  audienceMode: "segment",
  segmentId: null,
  filters: {},
  templateId: null,
  hsmChannelTemplateId: null,
  scheduledDate: "",
  scheduledTime: "",
};

/** Los cuatro pasos, en orden. */
export const WIZARD_STEPS = ["audiencia", "contenido", "programacion", "revision"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  audiencia: "Audiencia",
  contenido: "Contenido",
  programacion: "Programación",
  revision: "Revisión",
};

/**
 * Qué falta para poder salir de un paso. `null` = se puede avanzar.
 *
 * Devuelve el MOTIVO y no un booleano: un botón deshabilitado sin explicación
 * deja al usuario mirando la pantalla sin saber qué le falta.
 */
export function blockerForStep(step: WizardStep, draft: CampaignDraft): string | null {
  switch (step) {
    case "audiencia":
      if (draft.name.trim().length < 3) return "Ponle un nombre de al menos 3 caracteres";
      if (draft.audienceMode === "segment" && draft.segmentId === null) {
        return "Elige el segmento al que le vas a escribir";
      }
      return null;
    case "contenido":
      if (draft.templateId === null && draft.hsmChannelTemplateId === null) {
        return "Elige la plantilla que se enviará";
      }
      return null;
    case "programacion":
      if (draft.scheduledDate !== "" && draft.scheduledTime === "") {
        return "Indica la hora a la que sale";
      }
      if (draft.scheduledDate === "" && draft.scheduledTime !== "") {
        return "Indica el día en el que sale";
      }
      return null;
    case "revision":
      return null;
  }
}

/** Fecha y hora locales → ISO, o `null` si la campaña sale de inmediato. */
export function scheduledAtISO(draft: CampaignDraft): string | null {
  if (draft.scheduledDate === "" || draft.scheduledTime === "") return null;
  const date = new Date(`${draft.scheduledDate}T${draft.scheduledTime}`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Primer hueco razonable al elegir "Programar": la siguiente hora en punto con
 * al menos una hora de margen, y si eso ya cae de noche, mañana a las 9:00.
 *
 * Un valor por defecto que ya pasó obligaría a corregir un aviso nada más
 * marcar la opción, que es exactamente el trabajo que un default debe evitar.
 */
export function defaultScheduleSlot(now: Date): { date: string; time: string } {
  const slot = new Date(now.getTime());
  slot.setMinutes(0, 0, 0);
  slot.setHours(slot.getHours() + 2);
  if (slot.getHours() > 21 || slot.getHours() < 7) {
    slot.setDate(slot.getDate() + (slot.getHours() < 7 ? 0 : 1));
    slot.setHours(9);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${slot.getFullYear()}-${pad(slot.getMonth() + 1)}-${pad(slot.getDate())}`,
    time: `${pad(slot.getHours())}:00`,
  };
}

/** `true` si la fecha programada ya pasó: el backend la lanzaría al instante. */
export function isScheduleInThePast(draft: CampaignDraft, now: Date): boolean {
  const iso = scheduledAtISO(draft);
  return iso !== null && new Date(iso).getTime() <= now.getTime();
}

function audiencePayload(draft: CampaignDraft) {
  // `segment_id` y `audience_filters` son EXCLUYENTES en el contrato: mandar
  // los dos es un 422, y mandar los dos en null significa "todos los contactos".
  switch (draft.audienceMode) {
    case "segment":
      return { segment_id: draft.segmentId, audience_filters: null };
    case "filters":
      return { segment_id: null, audience_filters: draft.filters };
    case "all":
      return { segment_id: null, audience_filters: null };
  }
}

/** Payload del alta: se crea al salir del paso 1, con lo mínimo que ya se sabe. */
export function toCreateCampaignDTO(draft: CampaignDraft): CreateCampaignDTO {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    ...audiencePayload(draft),
  };
}

/** Payload de cada paso siguiente: el borrador ya existe, se va completando. */
export function toUpdateCampaignDTO(draft: CampaignDraft): UpdateCampaignDTO {
  return {
    name: draft.name.trim(),
    description: draft.description.trim() || null,
    ...audiencePayload(draft),
    template_id: draft.templateId,
    hsm_channel_template_id: draft.hsmChannelTemplateId,
    scheduled_at: scheduledAtISO(draft),
  };
}

/**
 * Lectura honesta de la estimación de audiencia.
 *
 * El backend cuenta los opt-out sobre una MUESTRA (cap 1000), así que el número
 * de bajas es una proyección, no un dato. Se devuelve por separado para que la
 * UI no pueda presentarlo como exacto sin querer.
 */
export type AudienceEstimate = {
  total: number;
  /** Bajas proyectadas al total a partir de la muestra. */
  estimatedOptedOut: number;
  /** Cuántos recibirán el mensaje, proyectado. */
  estimatedReach: number;
  /** Tamaño de la muestra sobre la que se midió. */
  sampleSize: number;
  /** `true` si la muestra fue el total: entonces la cifra NO es estimación. */
  exact: boolean;
};

export function readAudienceEstimate(preview: AudiencePreviewDTO): AudienceEstimate {
  const { total, sample_size: sampleSize, sample_opted_out: sampleOptedOut } = preview;
  if (total <= 0 || sampleSize <= 0) {
    return { total, estimatedOptedOut: 0, estimatedReach: total, sampleSize, exact: true };
  }
  const ratio = sampleOptedOut / sampleSize;
  const estimatedOptedOut = Math.min(total, Math.round(total * ratio));
  return {
    total,
    estimatedOptedOut,
    estimatedReach: Math.max(0, total - estimatedOptedOut),
    sampleSize,
    // Si la muestra cubrió a todos, la proyección coincide con el recuento.
    exact: sampleSize >= total,
  };
}
