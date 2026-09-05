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
import { ONBOARDING_WELCOME_PATH } from "@/modules/onboarding/domain/onboarding-progress";
import type { SignupPayload } from "@/shared/auth/auth.types";
import {
  BILLING_PERIODS,
  MODULES,
  MODULE_IDS,
  PRICING,
  formatCop,
  isVolumeId,
  modulePriceCop,
  planMonthlyCop,
  volumeById,
  type BillingPeriodId,
  type ModuleId,
  type ModuleOffer,
  type PricingPlan,
  type PublicCatalog,
} from "@/modules/landing/public";

/**
 * El catálogo público (tramos, tarifas, promoción) llega por props desde la
 * página; sin él (API caído) el alta sigue funcionando: la oferta se elige por
 * nombre y el precio se muestra «a confirmar».
 */
export type VolumeId = string;

/* ────────────────────────────── Oferta ────────────────────────────── */

/**
 * Paquetes que se contratan solos. Enterprise se activa con ventas.
 * `sbs` se conserva como ALIAS del catálogo anterior: hay enlaces publicados y
 * marcadores con `?plan=sbs`, y quien llegue por ahí debe aterrizar en el
 * paquete equivalente en vez de en un error de oferta desconocida.
 */
export const SELF_SERVICE_PACKAGES = [
  "free_trial",
  "esencial",
  "crecimiento",
  "escala",
] as const;
export type PackageCode = (typeof SELF_SERVICE_PACKAGES)[number];

/**
 * Un Paquete XOR uno o varios Módulos (decisión del dueño, 2026-09-01). El tipo
 * hace imposible el estado mixto: cambiar de modo descarta el otro.
 *
 * Desde que el precio tiene dos ejes (2026-09-04), elegir un paquete es elegir
 * TRES cosas: qué funciones, cuántas conversaciones y cada cuánto se paga.
 *
 * Volumen y periodicidad van OPCIONALES a propósito: un enlace publicado con
 * `?plan=crecimiento` a secas sigue siendo válido y cae en los valores por
 * defecto, en vez de aterrizar en un error de oferta incompleta.
 */
export type OfferSelection =
  | { kind: "package"; code: PackageCode; volume?: VolumeId; period?: BillingPeriodId }
  | { kind: "modules"; codes: ModuleId[] };

export function isBillingPeriodId(value: string): value is BillingPeriodId {
  return BILLING_PERIODS.some((period) => period.id === value);
}

/**
 * Los enlaces publicados antes del catálogo en vivo llevan el tramo como número
 * (`?volumen=1000`); el catálogo lo nombra `t1000`. Se acepta el alias para que
 * ningún enlace compartido aterrice en un error (hallazgo B9 de la auditoría).
 */
export function normalizeVolumeId(raw: string): string {
  return /^\d+$/.test(raw) ? `t${raw}` : raw;
}

/**
 * Los dos ejes de una selección, con sus valores por defecto ya resueltos.
 * Sin catálogo el volumen queda SIN resolver (`undefined`), nunca «max»: un
 * borrador guardado con el sentinela diría «Más de 25.000 al mes» y «A la
 * medida» a quien pidió 1.000 cuando el catálogo volviera.
 */
export function offerAxes(
  selection: OfferSelection,
  catalog: PublicCatalog | null,
): { volume: VolumeId | undefined; period: BillingPeriodId } {
  const fallback = catalog?.defaultVolumeId;
  if (selection.kind !== "package") return { volume: fallback, period: "monthly" };
  return {
    volume: selection.volume ?? fallback,
    period: selection.period ?? "monthly",
  };
}

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
 * Preselección desde la URL de los CTA de precios: `?plan=crecimiento` o
 * `?modulo=calls,crm`. Las tarjetas añaden además `&volumen=2500&periodo=anual`,
 * los dos ejes elegidos en la sección de precios; sin ellos se usan los valores
 * por defecto, así que un enlace viejo sigue funcionando.
 *
 * Los códigos desconocidos se ignoran (un enlace viejo no rompe el funnel) y
 * `plan=enterprise` manda a ventas: el backend rechaza crear un tenant
 * enterprise sin base dedicada.
 */
export type ParsedOfferQuery = { selection: OfferSelection | null; redirectTo: string | null };

export const ENTERPRISE_PATH = "/contacto";

/**
 * Paquetes retirados y a dónde va hoy quien llegue con su enlace. `sbs` era el
 * paquete completo del catálogo anterior y su equivalente directo es
 * Crecimiento, que es también el destino de su migración en la base.
 */
const RETIRED_PACKAGES: Readonly<Record<string, PackageCode>> = { sbs: "crecimiento" };

export function parseOfferQuery(
  params: { get(name: string): string | null },
  catalog: PublicCatalog | null,
): ParsedOfferQuery {
  const plan = params.get("plan");
  if (plan === "enterprise") return { selection: null, redirectTo: ENTERPRISE_PATH };

  const rawVolume = params.get("volumen");
  const rawPeriod = params.get("periodo");
  const volume = rawVolume === null ? null : normalizeVolumeId(rawVolume);
  const axes = {
    ...(volume !== null && isVolumeId(catalog, volume) ? { volume } : {}),
    ...(rawPeriod && isBillingPeriodId(rawPeriod) ? { period: rawPeriod } : {}),
  };

  const revived = plan === null ? undefined : RETIRED_PACKAGES[plan];
  if (revived) return { selection: { kind: "package", code: revived, ...axes }, redirectTo: null };
  if (plan && isPackageCode(plan)) {
    return { selection: { kind: "package", code: plan, ...axes }, redirectTo: null };
  }

  const modules = params.get("modulo");
  if (modules) {
    const codes = modules.split(",").map((code) => code.trim()).filter(isModuleId);
    if (codes.length > 0) return { selection: { kind: "modules", codes }, redirectTo: null };
  }
  return { selection: null, redirectTo: null };
}

/* ─────────────────────────────── Pasos ─────────────────────────────── */

/**
 * Una pregunta por pantalla (mockup v3 «Flow», aprobado 2026-09-05). Cinco
 * pantallas para tres objetos del wire: la empresa se pregunta en dos
 * (identidad y ubicación) y la persona propietaria en otras dos (quién es y
 * su contraseña). El payload no cambia: `toSignupPayload` sigue leyendo
 * `company` y `account` completos.
 */
export const SIGNUP_STEPS = [
  { code: "offer", label: "Oferta" },
  { code: "company", label: "Empresa" },
  { code: "location", label: "Ubicación" },
  { code: "owner", label: "Tú" },
  { code: "account", label: "Cuenta" },
] as const;

export type SignupStep = (typeof SIGNUP_STEPS)[number]["code"];
export const SIGNUP_STEP_LABELS: readonly string[] = SIGNUP_STEPS.map((step) => step.label);

/** A dónde va el usuario con la sesión recién abierta: la bienvenida de `/onboarding`. */
export const SIGNUP_NEXT_PATH = ONBOARDING_WELCOME_PATH;

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

/** La empresa tiene identidad cuando ya se respondió la pantalla «Empresa». */
export function hasCompanyIdentity(company: CompanyDraft | null): boolean {
  return !!company && company.name.trim().length > 0 && company.nit.trim().length > 0;
}

/** La empresa está completa cuando además se respondió «Ubicación». */
export function hasCompanyLocation(company: CompanyDraft | null): boolean {
  return hasCompanyIdentity(company) && !!company && company.country_code.length > 0 && company.city.trim().length > 0;
}

/** La persona propietaria se conoce cuando ya se respondió la pantalla «Tú». */
export function hasOwnerIdentity(account: AccountDraft | null): boolean {
  return !!account && account.name.trim().length > 0 && account.email.trim().length > 0;
}

/**
 * Motivo por el que NO se puede entrar en un paso, o `null` si está abierto.
 * Cada pantalla exige la anterior respondida: adelante solo con información,
 * atrás siempre (misma regla que el onboarding guiado).
 */
export function blockerForSignupStep(step: SignupStep, draft: SignupDraft): string | null {
  if (step === "offer") return null;
  const offer = offerBlocker(draft.offer);
  if (offer) return offer;
  if (step === "company") return null;
  if (!hasCompanyIdentity(draft.company)) return "Cuéntanos primero cómo se llama tu empresa.";
  if (step === "location") return null;
  if (!hasCompanyLocation(draft.company)) return "Completa los datos de tu empresa primero.";
  if (step === "owner") return null;
  if (!hasOwnerIdentity(draft.account)) return "Dinos primero quién eres.";
  return null;
}

/** Primer paso al que se puede entrar sin saltarse ninguno; nunca más allá de `wanted`. */
export function reachableSignupStep(wanted: number, draft: SignupDraft): number {
  const target = Math.max(0, Math.min(wanted, SIGNUP_STEPS.length - 1));
  for (let index = 0; index <= target; index += 1) {
    if (blockerForSignupStep(SIGNUP_STEPS[index].code, draft)) return Math.max(0, index - 1);
  }
  return target;
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

/**
 * Precio que ve hoy el visitante para un paquete: el de fundador mientras la
 * oferta siga abierta, el de lista después.
 *
 * Usa `foundersOfferOpen`, que mira cupos Y fecha. Antes miraba solo los
 * cupos, así que pasada la fecha el registro habría cobrado un precio de
 * fundador que la página de precios ya no mostraba.
 */
export function packagePriceCop(
  catalog: PublicCatalog | null,
  code: PackageCode,
  volume?: VolumeId,
  now: Date = new Date(),
): number | null {
  if (catalog === null) return null;
  return planMonthlyCop(catalog, code, volume ?? catalog.defaultVolumeId, now);
}

/**
 * Precio del escalón de entrada: la referencia contra la que se comparan los
 * módulos. Se toma al VOLUMEN MÁS BAJO del catálogo a propósito — comparar un
 * módulo con un paquete cargado de conversaciones haría ganar al módulo
 * siempre, y la comparación dejaría de significar nada.
 */
export function entryPackagePriceCop(catalog: PublicCatalog | null, now: Date = new Date()): number | null {
  if (catalog === null) return null;
  const entry = catalog.volumes.find((volume) => volume.feeCop !== null) ?? catalog.volumes[0];
  return planMonthlyCop(catalog, "esencial", entry.id, now);
}

export function modulePrice(catalog: PublicCatalog | null, id: ModuleId): number | null {
  return catalog === null ? null : modulePriceCop(catalog, moduleOffer(id).offer_code);
}

export function offerSummary(
  selection: OfferSelection,
  catalog: PublicCatalog | null,
  now: Date = new Date(),
): OfferSummary {
  if (selection.kind === "package") {
    const plan = packagePlan(selection.code);
    if (plan.group === "package") {
      const { volume, period } = offerAxes(selection, catalog);
      const price = packagePriceCop(catalog, selection.code, volume, now);
      const volumeLabel =
        catalog === null ? null : volumeById(catalog, volume ?? catalog.defaultVolumeId).label;
      // El volumen sale del eje elegido, no de la primera viñeta del plan:
      // desde que son dos ejes, las viñetas solo hablan de funciones.
      return {
        kind: "Paquete",
        title: plan.name,
        lines: [
          ...(volumeLabel === null ? [] : [{ label: "Conversaciones", value: `${volumeLabel} al mes` }]),
          {
            label: "Pago",
            value: period === "annual" ? "Anual, con 1 mes gratis" : "Mensual",
          },
        ],
        afterTrial: price === null ? "Precio a confirmar" : `${formatCop(price)} COP/mes`,
        approximate: false,
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
  const prices = offers.map((offer) => modulePrice(catalog, offer.id));
  const known = prices.every((price): price is number => price !== null);
  const total = known ? prices.reduce((sum, price) => sum + price, 0) : null;
  return {
    kind: "Módulos",
    title: offers.length === 1 ? offers[0].name : `${offers.length} módulos`,
    lines: offers.map((offer, index) => ({
      label: offer.name,
      value: prices[index] === null ? "A confirmar" : formatCop(prices[index] as number),
    })),
    afterTrial: offers.length === 0 ? null : total === null ? "Precio a confirmar" : `${formatCop(total)} COP/mes`,
    approximate: false,
  };
}

/** Con dos o más módulos el paquete de entrada sale mejor: el rail lo dice. */
export function packageBeatsModules(selection: OfferSelection | null, catalog: PublicCatalog | null): boolean {
  if (!selection || selection.kind !== "modules" || selection.codes.length < 2) return false;
  const entry = entryPackagePriceCop(catalog);
  if (entry === null) return false;
  const prices = selection.codes.map((id) => modulePrice(catalog, id));
  if (!prices.every((price): price is number => price !== null)) return false;
  return prices.reduce((sum, price) => sum + price, 0) >= entry;
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
  if (!hasCompanyLocation(draft.company) || !draft.company) throw new Error("Faltan los datos de la empresa en el borrador del alta.");
  if (!hasOwnerIdentity(draft.account) || !draft.account?.accept_terms) throw new Error("Falta la cuenta o la aceptación de términos.");

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
