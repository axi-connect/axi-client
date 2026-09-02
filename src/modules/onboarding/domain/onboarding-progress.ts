/**
 * Máquina de pasos del onboarding (`/onboarding`), dominio PURO. Los códigos de
 * paso van en inglés porque son el wire con el backend
 * (`GET/PUT /onboarding/progress`, contrato B3); las etiquetas en español son UI.
 *
 * El progreso vive en el servidor: recargar, cambiar de dispositivo o volver
 * al día siguiente retoma donde se quedó. Aquí solo se decide qué paso está
 * abierto, a cuál se puede saltar y cuánto falta.
 */

export const ONBOARDING_PATH = "/onboarding";
/** `?welcome=1`: el registro acaba de crear la cuenta y se muestra la bienvenida antes del primer paso. */
export const WELCOME_QUERY = "welcome";
export const ONBOARDING_WELCOME_PATH = `${ONBOARDING_PATH}?${WELCOME_QUERY}=1`;

export const ONBOARDING_STEPS = [
  { code: "niche", label: "Negocio" },
  { code: "business_hours", label: "Horarios" },
  { code: "catalog", label: "Catálogo" },
  { code: "agents", label: "Agentes" },
  { code: "whatsapp", label: "WhatsApp" },
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]["code"];
export const ONBOARDING_STEP_CODES: readonly OnboardingStep[] = ONBOARDING_STEPS.map((step) => step.code);
export const ONBOARDING_STEP_LABELS: readonly string[] = ONBOARDING_STEPS.map((step) => step.label);

/** Pasos que se pueden dejar para después. El nicho no: sin él no hay plantillas. */
export const SKIPPABLE_STEPS: readonly OnboardingStep[] = ["business_hours", "catalog", "agents", "whatsapp"];

export type StepStatus = "pending" | "done" | "skipped";

export type StepState = {
  status: StepStatus;
  completed_at: string | null;
  /** Mínimo por paso: `{ import_id }` en catálogo, `{ channel_id }` en WhatsApp… */
  data?: Record<string, unknown>;
};

// CONTRACT: espejo de `OnboardingProgressDto` (B3). Se sustituye por
// `Schemas["OnboardingProgressDto"]` en F7, cuando el backend esté en main.
export type OnboardingProgressDTO = {
  company_id: string;
  niche_code: string | null;
  current_step: OnboardingStep;
  steps: Partial<Record<OnboardingStep, StepState>>;
  completed_at: string | null;
  banner_dismissed_at: string | null;
  started_at: string;
  updated_at: string;
};

export type UpdateOnboardingProgressDTO = {
  current_step?: OnboardingStep;
  niche_code?: string;
  steps?: Partial<Record<OnboardingStep, { status: StepStatus; data?: Record<string, unknown> }>>;
  banner_dismissed_at?: string | null;
};

export function stepStatus(progress: OnboardingProgressDTO, code: OnboardingStep): StepStatus {
  return progress.steps[code]?.status ?? "pending";
}

export function isClosed(status: StepStatus): boolean {
  return status !== "pending";
}

export function stepIndex(code: OnboardingStep): number {
  return ONBOARDING_STEP_CODES.indexOf(code);
}

export function isOnboardingStep(value: string | null | undefined): value is OnboardingStep {
  return typeof value === "string" && (ONBOARDING_STEP_CODES as readonly string[]).includes(value);
}

/** Primer paso sin cerrar, o `null` cuando todos están hechos u omitidos. */
export function firstOpenStep(progress: OnboardingProgressDTO): OnboardingStep | null {
  return ONBOARDING_STEP_CODES.find((code) => !isClosed(stepStatus(progress, code))) ?? null;
}

/**
 * Se puede entrar a un paso ya cerrado (para revisarlo) o al primer abierto.
 * Nunca se salta por encima de un paso abierto: el orden lleva información
 * (el nicho decide las plantillas, el horario gobierna la agenda).
 */
export function canJumpTo(code: OnboardingStep, progress: OnboardingProgressDTO): boolean {
  if (isClosed(stepStatus(progress, code))) return true;
  return firstOpenStep(progress) === code;
}

/** El paso que debe mostrarse al entrar: el pedido por URL si es alcanzable, si no el primero abierto. */
export function resolveEntryStep(progress: OnboardingProgressDTO, requested: string | null): OnboardingStep | null {
  if (isOnboardingStep(requested) && canJumpTo(requested, progress)) return requested;
  return firstOpenStep(progress);
}

export function closedCount(progress: OnboardingProgressDTO): number {
  return ONBOARDING_STEP_CODES.filter((code) => isClosed(stepStatus(progress, code))).length;
}

export function pendingCount(progress: OnboardingProgressDTO): number {
  return ONBOARDING_STEP_CODES.length - closedCount(progress);
}

/** 0–100 sobre los pasos cerrados; un paso omitido también cierra. */
export function progressPercent(progress: OnboardingProgressDTO): number {
  return Math.round((closedCount(progress) / ONBOARDING_STEP_CODES.length) * 100);
}

/**
 * Recién creado: sin nicho y sin ningún paso cerrado. Es la condición para
 * mostrar la bienvenida aunque la URL traiga `?welcome=1`: quien recarga a
 * mitad de camino vuelve a su paso, no a la fiesta.
 */
export function isFreshProgress(progress: OnboardingProgressDTO): boolean {
  return progress.niche_code === null && closedCount(progress) === 0 && !isOnboardingComplete(progress);
}

export function isOnboardingComplete(progress: OnboardingProgressDTO): boolean {
  return progress.completed_at !== null;
}

/** El banner del dashboard: hay algo pendiente y nadie lo ocultó. */
export function shouldShowResumeBanner(progress: OnboardingProgressDTO): boolean {
  return !isOnboardingComplete(progress) && progress.banner_dismissed_at === null && pendingCount(progress) > 0;
}

/** Progreso vacío para una empresa recién creada (el backend lo crea en el alta). */
export function emptyProgress(companyId: string, now: string): OnboardingProgressDTO {
  return {
    company_id: companyId,
    niche_code: null,
    current_step: "niche",
    steps: {},
    completed_at: null,
    banner_dismissed_at: null,
    started_at: now,
    updated_at: now,
  };
}
