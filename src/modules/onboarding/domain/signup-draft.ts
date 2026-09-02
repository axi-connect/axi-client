/**
 * Máquina de pasos del registro autoservicio (`/comenzar`). Dominio PURO:
 * cero React, cero http, cero zod — mismo patrón que
 * `marketing/domain/campaign-draft.ts`. Los bloqueos devuelven el MOTIVO, no
 * un booleano: un botón deshabilitado sin explicación deja al usuario mirando
 * la pantalla.
 *
 * Lee la oferta comercial del barrel de `landing` (datos puros): la landing es
 * la dueña del copy y de los precios, y aquí no se duplica ni una cifra.
 */
import type { SignupPayload } from "@/shared/auth/auth.types";
import {
  MODULES,
  MODULE_IDS,
  PRICING,
  SBS_TIERS,
  formatCop,
  founderCop,
  foundersRemaining,
  type ModuleId,
  type ModuleOffer,
  type PricingPlan,
} from "@/modules/landing/public";

/* ────────────────────────────── Oferta ────────────────────────────── */

/** Paquetes que se contratan solos. Enterprise se activa con ventas. */
export const SELF_SERVICE_PACKAGES = ["free_trial", "sbs"] as const;
export type PackageCode = (typeof SELF_SERVICE_PACKAGES)[number];

/**
 * Un Paquete XOR uno o varios Módulos (decisión del dueño, 2026-09-01). El tipo
 * hace imposible el estado mixto: cambiar de modo descarta el otro.
 */
export type OfferSelection =
  | { kind: "package"; code: PackageCode }
  | { kind: "modules"; codes: ModuleId[] };

export function isPackageCode(value: string): value is PackageCode {
  return (SELF_SERVICE_PACKAGES as readonly string[]).includes(value);
}

export function isModuleId(value: string): value is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(value);
}

export function packagePlan(code: PackageCode): PricingPlan {
  const plan = PRICING.plans.find((candidate) => candidate.id === code);
  if (!plan) throw new Error(`El paquete "${code}" no existe en el content de la landing.`);
  return plan;
}

export function moduleOffer(id: ModuleId): ModuleOffer {
  const offer = MODULES.find((candidate) => candidate.id === id);
  if (!offer) throw new Error(`El módulo "${id}" no existe en el content de la landing.`);
  return offer;
}

/** Códigos que viajan al backend: el id del paquete o los `offer_code` de los módulos. */
export function offerCodesOf(selection: OfferSelection): string[] {
  return selection.kind === "package"
    ? [selection.code]
    : selection.codes.map((id) => moduleOffer(id).offer_code);
}

/** Alterna un módulo dentro de la selección; desde un paquete arranca de cero. */
export function toggleModule(selection: OfferSelection | null, id: ModuleId): OfferSelection {
  const current = selection?.kind === "modules" ? selection.codes : [];
  const codes = current.includes(id) ? current.filter((code) => code !== id) : [...current, id];
  return { kind: "modules", codes };
}

/**
 * Preselección desde la URL de los CTA de precios: `?plan=sbs` o
 * `?modulo=calls,crm`. Los códigos desconocidos se ignoran (un enlace viejo no
 * rompe el funnel) y `plan=enterprise` manda a ventas: el backend rechaza crear
 * un tenant enterprise sin base dedicada.
 */
export type ParsedOfferQuery = { selection: OfferSelection | null; redirectTo: string | null };

export const ENTERPRISE_PATH = "/contacto";

export function parseOfferQuery(params: { get(name: string): string | null }): ParsedOfferQuery {
  const plan = params.get("plan");
  if (plan === "enterprise") return { selection: null, redirectTo: ENTERPRISE_PATH };
  if (plan && isPackageCode(plan)) return { selection: { kind: "package", code: plan }, redirectTo: null };

  const modules = params.get("modulo");
  if (modules) {
    const codes = modules.split(",").map((code) => code.trim()).filter(isModuleId);
    if (codes.length > 0) return { selection: { kind: "modules", codes }, redirectTo: null };
  }
  return { selection: null, redirectTo: null };
}

/* ─────────────────────────────── Pasos ─────────────────────────────── */

export const SIGNUP_STEPS = [
  { code: "offer", label: "Oferta" },
  { code: "company", label: "Empresa" },
  { code: "account", label: "Cuenta" },
] as const;

export type SignupStep = (typeof SIGNUP_STEPS)[number]["code"];
export const SIGNUP_STEP_LABELS: readonly string[] = SIGNUP_STEPS.map((step) => step.label);

/** A dónde va el usuario con la sesión recién abierta. La ruta la entrega F3. */
export const SIGNUP_NEXT_PATH = "/onboarding";

export type CompanyDraft = {
  name: string;
  nit: string;
  country_code: string;
  /** Obligatoria (decisión del dueño): ajusta ejemplos, zonas y agenda. */
  city: string;
  timezone: string;
};

export type AccountDraft = {
  name: string;
  email: string;
  password: string;
  accept_terms: boolean;
};

export type SignupDraft = {
  offer: OfferSelection | null;
  company: CompanyDraft | null;
  account: AccountDraft | null;
};

export const EMPTY_SIGNUP_DRAFT: SignupDraft = { offer: null, company: null, account: null };

export function offerBlocker(selection: OfferSelection | null): string | null {
  if (!selection) return "Elige un paquete o al menos un módulo para continuar.";
  if (selection.kind === "modules" && selection.codes.length === 0) {
    return "Elige al menos un módulo para continuar.";
  }
  return null;
}

/** Motivo por el que NO se puede entrar en un paso, o `null` si está abierto. */
export function blockerForSignupStep(step: SignupStep, draft: SignupDraft): string | null {
  if (step === "offer") return null;
  const offer = offerBlocker(draft.offer);
  if (offer) return offer;
  if (step === "account" && !draft.company) return "Completa los datos de tu empresa primero.";
  return null;
}

/* ─────────────────────────── Resumen del rail ─────────────────────────── */

export type OfferSummaryLine = { label: string; value: string };

export type OfferSummary = {
  kind: "Paquete" | "Módulos";
  title: string;
  lines: OfferSummaryLine[];
  /** Precio mensual tras la prueba, formateado; `null` cuando no aplica (Free Trial). */
  afterTrial: string | null;
  /** «Desde» cuando el precio depende de un tramo aún no elegido. */
  approximate: boolean;
};

/** Precio de SBS que ve hoy el visitante: fundador mientras queden cupos. */
export function sbsEntryPriceCop(): number {
  const list = SBS_TIERS[0].listCop;
  return foundersRemaining() > 0 ? founderCop(list) : list;
}

export function offerSummary(selection: OfferSelection): OfferSummary {
  if (selection.kind === "package") {
    const plan = packagePlan(selection.code);
    if (selection.code === "sbs") {
      return {
        kind: "Paquete",
        title: plan.name,
        lines: [
          { label: "Incluye", value: "Producto completo" },
          { label: "Volumen", value: SBS_TIERS[0].volumeBullet },
        ],
        afterTrial: `${formatCop(sbsEntryPriceCop())} COP/mes`,
        approximate: true,
      };
    }
    return {
      kind: "Paquete",
      title: plan.name,
      lines: [
        { label: "Incluye", value: "Producto completo con topes de prueba" },
        { label: "Duración", value: "7 días" },
      ],
      afterTrial: null,
      approximate: false,
    };
  }

  const offers = selection.codes.map(moduleOffer);
  const total = offers.reduce((sum, offer) => sum + offer.listCop, 0);
  return {
    kind: "Módulos",
    title: offers.length === 1 ? offers[0].name : `${offers.length} módulos`,
    lines: offers.map((offer) => ({ label: offer.name, value: formatCop(offer.listCop) })),
    afterTrial: offers.length > 0 ? `${formatCop(total)} COP/mes` : null,
    approximate: false,
  };
}

/** Con dos o más módulos el paquete SBS sale mejor: el rail lo dice. */
export function packageBeatsModules(selection: OfferSelection | null): boolean {
  if (!selection || selection.kind !== "modules" || selection.codes.length < 2) return false;
  const total = selection.codes.map(moduleOffer).reduce((sum, offer) => sum + offer.listCop, 0);
  return total >= sbsEntryPriceCop();
}

/* ───────────────────────────── Validaciones ───────────────────────────── */

/** «901.234.567-8» → «901234567-8»: sin puntos ni espacios; el DV lo valida el backend. */
export function normalizeNit(raw: string): string {
  return raw.replace(/[.\s]/g, "").toUpperCase();
}

/** 0–4: longitud ≥10, mayúscula, número, símbolo o ≥14 caracteres. */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  let score = 0;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 14) score += 1;
  return score as 0 | 1 | 2 | 3 | 4;
}

export const PASSWORD_STRENGTH_LABELS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "Mínimo 10 caracteres",
  1: "Débil: añade una mayúscula y un número",
  2: "Regular: añade un número o un símbolo",
  3: "Buena",
  4: "Muy buena",
};

/* ──────────────────────────────── Wire ──────────────────────────────── */

/**
 * Compone el cuerpo del alta. Lanza si el borrador está incompleto: llegar aquí
 * sin oferta o sin empresa es un bug del orquestador, no un estado del usuario.
 */
export function toSignupPayload(
  draft: SignupDraft,
  extras: { captcha_token: string; website: string },
): SignupPayload {
  if (!draft.offer || offerBlocker(draft.offer)) throw new Error("Falta la oferta en el borrador del alta.");
  if (!draft.company) throw new Error("Faltan los datos de la empresa en el borrador del alta.");
  if (!draft.account?.accept_terms) throw new Error("Falta la cuenta o la aceptación de términos.");

  const company = draft.company;
  return {
    offer: {
      kind: draft.offer.kind === "package" ? "package" : "module",
      codes: offerCodesOf(draft.offer),
    },
    company: {
      name: company.name.trim(),
      nit: normalizeNit(company.nit),
      country_code: company.country_code,
      city: company.city.trim(),
      ...(company.timezone ? { timezone: company.timezone } : {}),
    },
    owner: {
      name: draft.account.name.trim(),
      email: draft.account.email.trim().toLowerCase(),
      password: draft.account.password,
    },
    captcha_token: extras.captcha_token,
    accepted_terms: true,
    website: extras.website,
  };
}
