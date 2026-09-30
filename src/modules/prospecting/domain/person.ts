import type { Schemas } from "@/core/api/types";

import type { LeadDTO } from "./lead";

/**
 * P2 · personas de un negocio, señales y llaves propias.
 *
 * TypeScript puro: tipos del contrato, etiquetas y las reglas que la interfaz
 * no debe inventarse (cuánto cuesta revelar, qué papel se nombra cómo).
 */

export type LeadPersonDTO = Schemas["LeadPeopleDto"]["items"][number];
export type LeadSignalDTO = Schemas["LeadSignalsDto"]["items"][number];
export type TenantProviderKeyDTO = Schemas["TenantProviderKeysDto"]["items"][number];
export type BuyingRole = LeadPersonDTO["buying_role"];

/** Cómo se dice cada papel en la compra, en la voz del dueño. */
export const BUYING_ROLE_LABELS: Record<BuyingRole, string> = {
  decides: "decide",
  approves: "aprueba",
  recommends: "recomienda",
  uses: "usa",
  unknown: "sin papel claro",
};

/** El orden en que se lee un equipo: quien decide primero. */
export const BUYING_ROLE_ORDER: readonly BuyingRole[] = [
  "decides",
  "approves",
  "recommends",
  "uses",
  "unknown",
];

/** Pasan al CRM con su negocio (el servidor aplica la misma lista). */
export const PROMOTED_WITH_BUSINESS: readonly BuyingRole[] = ["decides", "approves", "recommends"];

/**
 * Lo que cuesta revelar, tal como lo declara la cuenta de Apollo en la
 * plataforma (el precio vive en datos, no en el código). Es un techo, no una
 * factura: Apollo cobra solo si lo encuentra, y la cifra real la trae el libro.
 * `null` = la cuenta no lo declara: la interfaz dice «–» en vez de inventarlo.
 */
export interface RevealCosts {
  email: number | null;
  phone: number | null;
}

export const NO_REVEAL_COSTS: RevealCosts = { email: null, phone: null };

/** Una persona que todavía se puede revelar, y qué. */
export interface RevealCandidate {
  id: string;
  masked: boolean;
  source: string;
  email: string | null;
  phone: string | null;
  /** Lo que la fuente dice que podría revelar (Apollo `has_email`, `has_direct_phone`). */
  has_email: boolean;
  has_phone: boolean;
}

/** El estado del revelado de una persona, que decide el botón de su fila. */
export type RevealState = "not_apollo" | "revealable" | "revealed";

export function revealStateOf(person: RevealCandidate): RevealState {
  if (person.source !== "apollo_people") return "not_apollo";
  return person.masked ? "revealable" : "revealed";
}

/**
 * El techo de lo que costaría revelar una selección. Cuenta el correo de quien
 * aún no lo tiene y Apollo dice tener, y lo mismo con el celular si se pide.
 */
export function revealCeiling(
  people: readonly RevealCandidate[],
  withPhone: boolean,
  costs: RevealCosts,
): { emails: number; phones: number; credits: number | null } {
  let emails = 0;
  let phones = 0;
  for (const person of people) {
    if (revealStateOf(person) !== "revealable") continue;
    if (person.email === null && person.has_email) emails += 1;
    if (withPhone && person.phone === null && person.has_phone) phones += 1;
  }
  // Sin precio declarado para algo que sí se va a pedir, no hay techo honesto.
  if ((emails > 0 && costs.email === null) || (phones > 0 && costs.phone === null)) {
    return { emails, phones, credits: null };
  }
  return {
    emails,
    phones,
    credits: emails * (costs.email ?? 0) + phones * (costs.phone ?? 0),
  };
}

/** Un lead de la lista como candidato a revelar (la fila no trae `has_*`: van en attributes). */
export function revealCandidateOf(lead: LeadDTO): RevealCandidate {
  const attributes = (lead.attributes ?? {}) as Record<string, unknown>;
  return {
    id: lead.id,
    masked: lead.masked,
    source: lead.source,
    email: lead.email,
    phone: lead.phone,
    has_email: attributes.has_email === true || lead.email !== null,
    has_phone: attributes.has_direct_phone === true || lead.phone !== null,
  };
}

/** Las iniciales para el avatar de una fila: «Carolina Ruiz» → «CR». */
export function initialsOf(name: string | null): string {
  if (name === null) return "?";
  const words = name
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0][0] ?? "";
  const second = words.length > 1 ? (words[1][0] ?? "") : "";
  return `${first}${second}`.toUpperCase();
}

/** Qué fuente atestigua que la persona es del negocio, para la insignia de la fila. */
export const EVIDENCE_PROVIDER_LABELS: Record<string, string> = {
  rues: "RUES",
  apollo: "Apollo",
  site_extractor: "Sitio",
};

/** Los tipos de señal, dichos como hecho. */
export const SIGNAL_KIND_LABELS: Record<string, string> = {
  hiring: "Contratando",
  reviews_unanswered: "Reseñas sin respuesta",
  instagram_active: "Instagram activo",
  new_registration: "Recién matriculado",
  public_contract: "Contrato público",
  diagnostic_completed: "Hizo el diagnóstico",
  reply: "Respondió",
  custom: "Señal",
};

/** El nivel de evidencia, como se lee en la ficha (maestro §4.5). */
export const SIGNAL_LEVEL_LABELS: Record<LeadSignalDTO["level"], string> = {
  fact: "hecho",
  hypothesis: "hipótesis",
  validated: "confirmado",
};

/** El plan de una llave de Apollo, dicho por lo que deja hacer. */
export function providerPlanOf(key: TenantProviderKeyDTO): "people_and_companies" | "companies_only" | "none" {
  if (!key.configured) return "none";
  return key.capabilities.includes("discover") || key.capabilities.includes("find_people")
    ? "people_and_companies"
    : "companies_only";
}
