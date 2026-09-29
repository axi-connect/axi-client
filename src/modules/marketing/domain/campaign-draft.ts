import type { SegmentFilters } from "@/modules/crm/public";
import { unresolvedHsmSlots, type HsmParamEntry } from "./hsm-params";
import type { AudiencePreviewDTO, CampaignDTO, CreateCampaignDTO, UpdateCampaignDTO } from "./campaign";

/**
 * Estado del wizard de campaña, en TypeScript puro.
 *
 * La lógica vive aquí y no en el componente porque es lo que decide si se puede
 * avanzar, qué viaja al backend y cómo se lee la estimación de audiencia — tres
 * cosas que conviene poder probar sin montar cuatro pasos de UI.
 */

/**
 * `contacts` e `import` (F6) son audiencias que llegan HECHAS desde el CRM
 * —«Enviar plantilla» sobre una selección, un segmento o un import— y viajan
 * como `audience_filters` del mismo DSL (`contact_ids` / `import_job_id`): el
 * servidor les aplica opt-out, simulados y alcance igual que a un segmento.
 */
export type AudienceMode = "all" | "segment" | "filters" | "contacts" | "import";

/** Lo que el CRM le pasa al asistente cuando la audiencia ya está decidida. */
export type PresetAudience =
  | { mode: "contacts"; contactIds: string[]; label: string }
  | { mode: "import"; importJobId: string; label: string }
  | { mode: "segment"; segmentId: string; label: string };

export type CampaignDraft = {
  name: string;
  description: string;
  audienceMode: AudienceMode;
  segmentId: string | null;
  filters: SegmentFilters;
  /** Con `contacts` / `import`: de dónde salió la lista, en palabras del operador. */
  audienceLabel: string | null;
  /** `null` = plantilla del tenant sin elegir todavía. */
  templateId: string | null;
  hsmChannelTemplateId: string | null;
  /** Qué va en cada `{{n}}` de la HSM. Vacío si la plantilla no tiene huecos. */
  hsmParamMapping: HsmParamEntry[];
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
  audienceLabel: null,
  templateId: null,
  hsmChannelTemplateId: null,
  hsmParamMapping: [],
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
      if (draft.audienceMode === "contacts" && !draft.filters.contact_ids?.length) {
        return "La lista llegó vacía: vuelve a marcar los contactos";
      }
      if (draft.audienceMode === "import" && !draft.filters.import_job_id) {
        return "No sé de qué import salen los contactos: vuelve desde el import";
      }
      return null;
    case "contenido": {
      if (draft.templateId === null && draft.hsmChannelTemplateId === null) {
        return "Elige la plantilla que se enviará";
      }
      // Un hueco sin decidir no es un detalle estético: Meta rechaza el envío
      // ENTERO si sobra o falta un parámetro, así que no puede pasar de aquí.
      if (draft.hsmChannelTemplateId !== null) {
        const pending = unresolvedHsmSlots(draft.hsmParamMapping);
        if (pending.length > 0) {
          return `Falta decir qué va en ${pending.join(" y ")}`;
        }
      }
      return null;
    }
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
    case "contacts":
      return { segment_id: null, audience_filters: { contact_ids: draft.filters.contact_ids ?? [] } };
    case "import":
      return {
        segment_id: null,
        audience_filters: { import_job_id: draft.filters.import_job_id ?? "" },
      };
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
    // Sin plantilla de Meta el mapeo viaja como `null`: un mapeo huérfano es
    // un 422 en el servidor, y con razón.
    hsm_param_mapping:
      draft.hsmChannelTemplateId === null || draft.hsmParamMapping.length === 0
        ? null
        : draft.hsmParamMapping,
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

/**
 * De vuelta: la campaña guardada → el estado del wizard, para RETOMAR un
 * borrador (o editar una programada) donde se quedó. Antes un borrador no se
 * podía reabrir: el detalle no tenía ni editar ni lanzar (canvas 2026-09-26).
 *
 * La fecha programada se lee en la hora local del navegador, que es en la que
 * `scheduledAtISO` la escribió.
 */
export function fromCampaignDTO(campaign: CampaignDTO): CampaignDraft {
  const filters = (campaign.audience_filters ?? {}) as SegmentFilters;
  const audienceMode: AudienceMode =
    campaign.segment_id !== null
      ? "segment"
      : campaign.audience_filters === null
        ? "all"
        : filters.import_job_id !== undefined
          ? "import"
          : filters.contact_ids !== undefined
            ? "contacts"
            : "filters";
  const pad = (n: number) => String(n).padStart(2, "0");
  const at = campaign.scheduled_at === null ? null : new Date(campaign.scheduled_at);
  const valid = at !== null && !Number.isNaN(at.getTime());
  return {
    name: campaign.name,
    description: campaign.description ?? "",
    audienceMode,
    segmentId: campaign.segment_id,
    filters,
    audienceLabel: null,
    templateId: campaign.template?.id ?? null,
    hsmChannelTemplateId: campaign.hsm_channel_template_id,
    hsmParamMapping: (campaign.hsm_param_mapping ?? []).filter(isHsmParamEntry),
    scheduledDate: valid ? `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}` : "",
    scheduledTime: valid ? `${pad(at.getHours())}:${pad(at.getMinutes())}` : "",
  };
}

function isHsmParamEntry(value: unknown): value is HsmParamEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as HsmParamEntry).index === "number" &&
    typeof (value as HsmParamEntry).source === "string"
  );
}

/** Dónde retomar: el primer paso que aún tiene algo pendiente; si no falta nada, la revisión. */
export function resumeStep(draft: CampaignDraft): WizardStep {
  return WIZARD_STEPS.find((step) => step !== "revision" && blockerForStep(step, draft) !== null) ?? "revision";
}

/**
 * Duplicar: una campaña nueva en BORRADOR con la misma audiencia y el mismo
 * mensaje. La fecha no se copia (una programación vieja saldría al instante) y
 * el nombre dice que es una copia, para que no se confundan en la lista.
 */
export function toDuplicateCampaignDTO(campaign: CampaignDTO): CreateCampaignDTO {
  const draft = fromCampaignDTO(campaign);
  const update = toUpdateCampaignDTO({ ...draft, scheduledDate: "", scheduledTime: "" });
  return {
    ...update,
    // El servidor acepta 80 caracteres: «Copia de » + un nombre largo no puede pasarse.
    name: `Copia de ${campaign.name}`.slice(0, 80),
  } as CreateCampaignDTO;
}

/** Dónde se retoma un borrador (o se edita una programada): el asistente, con la campaña cargada. */
export function campaignEditHref(id: string): string {
  return `/marketing/campaigns/new?campaign=${encodeURIComponent(id)}`;
}

/** El borrador con el que arranca el asistente cuando la audiencia viene decidida (F6). */
export function draftFromPreset(preset: PresetAudience): CampaignDraft {
  switch (preset.mode) {
    case "contacts":
      return {
        ...EMPTY_DRAFT,
        audienceMode: "contacts",
        filters: { contact_ids: preset.contactIds },
        audienceLabel: preset.label,
      };
    case "import":
      return {
        ...EMPTY_DRAFT,
        audienceMode: "import",
        filters: { import_job_id: preset.importJobId },
        audienceLabel: preset.label,
      };
    case "segment":
      return { ...EMPTY_DRAFT, audienceMode: "segment", segmentId: preset.segmentId, audienceLabel: preset.label };
  }
}

/**
 * La audiencia decidida, en la URL: es como el CRM abre el asistente
 * («Enviar plantilla» desde la selección, un segmento o un import). Ida y
 * vuelta simétricas para que la página pueda leerla sin adivinar.
 */
export function presetToSearchParams(preset: PresetAudience): URLSearchParams {
  const params = new URLSearchParams();
  params.set("audience", preset.mode);
  params.set("label", preset.label);
  if (preset.mode === "contacts") params.set("contact_ids", preset.contactIds.join(","));
  if (preset.mode === "import") params.set("import_job_id", preset.importJobId);
  if (preset.mode === "segment") params.set("segment_id", preset.segmentId);
  return params;
}

export function presetFromSearchParams(params: Record<string, string | undefined>): PresetAudience | null {
  const label = params.label?.trim() || "";
  switch (params.audience) {
    case "contacts": {
      const contactIds = (params.contact_ids ?? "").split(",").map((id) => id.trim()).filter(Boolean);
      return contactIds.length === 0
        ? null
        : { mode: "contacts", contactIds, label: label || `${String(contactIds.length)} contactos que marcaste` };
    }
    case "import":
      return params.import_job_id ? { mode: "import", importJobId: params.import_job_id, label: label || "Del import" } : null;
    case "segment":
      return params.segment_id ? { mode: "segment", segmentId: params.segment_id, label: label || "Del segmento" } : null;
    default:
      return null;
  }
}
