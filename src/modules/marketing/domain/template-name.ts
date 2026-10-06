import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";

/**
 * El nombre de una plantilla de Meta, partido en lo que el operador piensa y lo
 * que Meta exige (maqueta F0 v2, `hsm-template-page`, vista «Nombre y versión»).
 *
 * El operador escribe el nombre como lo dice —«¡Promo Día de la Madre 2026!»— y
 * elige una versión. Meta recibe `promo_dia_de_la_madre_2026_v1`: minúsculas,
 * números y guion bajo. Antes el campo pedía el formato de Meta a pelo y el
 * operador aprendía las reglas a base de errores.
 */

/** El tope de la casa (`NAME_REGEX` del formulario, 3–120); Meta admite más, axi no lo necesita. */
export const TEMPLATE_NAME_MAX = 120;
export const TEMPLATE_NAME_MIN = 3;

/** Lo que ocupa el sufijo más largo que se ofrece (`_v999`): la base no puede comérselo. */
const VERSION_SUFFIX_MAX = 5;

/** Cuántas versiones nuevas se ofrecen en el selector además de las que ya existen. */
const FREE_VERSIONS_OFFERED = 2;

const NAME_PATTERN = /^[a-z0-9_]+$/;

/**
 * Lo que el operador escribe → la base en el formato de Meta. Quita tildes y
 * eñes (`ñ` → `n`), pasa a minúsculas, cambia todo lo que no sea letra o número
 * por `_`, y no deja `_` repetidos ni en los bordes. Se aplica en vivo: nunca
 * hay un nombre inválido que corregir a mano.
 */
export function formatTemplateBase(human: string): string {
  return human
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, TEMPLATE_NAME_MAX - VERSION_SUFFIX_MAX)
    .replace(/_+$/, "");
}

/** `temporada_coleccion_v2` → `{ base: "temporada_coleccion", version: 2 }`. Sin sufijo, `version: null`. */
export function splitTemplateName(name: string): { base: string; version: number | null } {
  const match = /^(.*)_v(\d+)$/.exec(name);
  if (match === null) return { base: name, version: null };
  return { base: match[1], version: Number(match[2]) };
}

export function composeTemplateName(base: string, version: number): string {
  return `${base}_v${String(version)}`;
}

/**
 * La base de Meta → algo que se lee como un nombre: `temporada_coleccion` →
 * «Temporada coleccion». Para el campo al editar o al partir de una sugerida:
 * las tildes no se pueden recuperar, y no se inventan.
 */
export function humanizeTemplateBase(base: string): string {
  const spaced = base.replace(/_+/g, " ").trim();
  return spaced === "" ? "" : spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Si el nombre completo cumple lo que Meta y la casa exigen. */
export function isValidTemplateName(name: string): boolean {
  return (
    name.length >= TEMPLATE_NAME_MIN && name.length <= TEMPLATE_NAME_MAX && NAME_PATTERN.test(name)
  );
}

/** Por qué una versión no se puede usar, o `null` si está libre. */
export type VersionTaken =
  | { reason: "in_use"; status: HsmTemplateDTO["approval_status"] }
  /** Meta reserva 30 días el nombre de una plantilla borrada. `until` ISO, si se sabe. */
  | { reason: "reserved"; until: string | null };

export interface VersionOption {
  version: number;
  taken: VersionTaken | null;
}

/**
 * Las versiones de una base en un idioma: las que ya existen en la lista (en
 * uso), las que Meta dijo que están reservadas, y las primeras libres.
 * Una plantilla es única por nombre E idioma, así que la v1 en inglés no ocupa
 * la v1 en español.
 *
 * Lo reservado solo se sabe cuando Meta lo dice (el 409 al enviar): la lista
 * no trae las borradas. Quien llama lo acumula y lo pasa aquí.
 */
export function versionOptions(
  base: string,
  language: string,
  templates: readonly Pick<HsmTemplateDTO, "name" | "language" | "approval_status">[],
  reserved: ReadonlyMap<number, string | null> = new Map(),
): VersionOption[] {
  const taken = new Map<number, VersionTaken>();
  for (const template of templates) {
    if (template.language !== language) continue;
    const parts = splitTemplateName(template.name);
    if (parts.base === base && parts.version !== null) {
      taken.set(parts.version, { reason: "in_use", status: template.approval_status });
    }
  }
  for (const [version, until] of reserved) {
    if (!taken.has(version)) taken.set(version, { reason: "reserved", until });
  }

  // Las libres: las primeras N que no están tomadas, buscando desde la v1. El
  // recorrido es de |tomadas| + N pasos como mucho, NO hasta la más alta: una
  // plantilla del Business Manager llamada `promo_v20261003` no puede producir
  // veinte millones de opciones (auditoría F3, R1).
  const options: VersionOption[] = [...taken].map(([version, reason]) => ({ version, taken: reason }));
  for (let version = 1, free = 0; free < FREE_VERSIONS_OFFERED; version += 1) {
    if (taken.has(version)) continue;
    options.push({ version, taken: null });
    free += 1;
  }
  return options.sort((left, right) => left.version - right.version);
}

/** La primera versión libre: la que el selector propone sin que nadie elija. */
export function firstFreeVersion(options: readonly VersionOption[]): number {
  return options.find((option) => option.taken === null)?.version ?? options.length + 1;
}
