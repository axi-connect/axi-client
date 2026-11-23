import type { ContactDataField } from "./contact-data";

/**
 * «El negocio» en la ficha del contacto (plan `captacion_enriquecimiento_al_contacto.md`,
 * Fase 1; mockup aprobado `docs/design/mockups/crm-contact-business.*`).
 *
 * La captación deja en `contact.custom_fields` lo que sabe del negocio con
 * claves estándar (servidor `prospecting/domain/business_profile.ts`). Esas
 * claves no las define ningún formulario, así que «Datos del cliente» las
 * pintaba como campos sueltos con nombre técnico («Website», «Google maps
 * url»). Aquí se les da nombre, enlace y orden; ese panel deja de repetirlas.
 *
 * Puro: sin React, sin red. Lo usan la tarjeta del 360 y los accesos del Inbox.
 */

export const BUSINESS_WEB_KEYS = [
  "website",
  "instagram",
  "facebook",
  "tiktok",
  "linkedin",
  "whatsapp",
] as const;
export const BUSINESS_FICHA_KEYS = ["category", "company_tax_id", "google_maps_url"] as const;
/** El nombre tal como venía de Google Maps: va en la procedencia, no como fila. */
export const ORIGINAL_NAME_KEY = "original_name";

export type BusinessKey =
  | (typeof BUSINESS_WEB_KEYS)[number]
  | (typeof BUSINESS_FICHA_KEYS)[number];

/**
 * Quién decide en el negocio (prospección decisor, fase 1 parte 2). La
 * captación las escribe SOLO cuando es un hecho: lo dice el registro mercantil
 * o lo confirmó alguien del equipo (servidor `prospecting/domain/decision_maker.ts`).
 * Se enseñan en «El negocio» y no como filas sueltas de «Datos del cliente».
 */
export const DECISION_MAKER_KEYS = {
  name: "quien_decide",
  title: "quien_decide_cargo",
  source: "quien_decide_fuente",
} as const;

const ALL_KEYS: ReadonlySet<string> = new Set<string>([
  ...BUSINESS_WEB_KEYS,
  ...BUSINESS_FICHA_KEYS,
  ORIGINAL_NAME_KEY,
  ...Object.values(DECISION_MAKER_KEYS),
]);

/**
 * ¿Es una clave del perfil del negocio que «El negocio» ya muestra? Solo
 * cuenta si ningún formulario la define: un campo de formulario que se llame
 * igual es del formulario y se queda en «Datos del cliente».
 */
export function isBusinessProfileField(field: Pick<ContactDataField, "code" | "defined">): boolean {
  return !field.defined && ALL_KEYS.has(field.code);
}

export const BUSINESS_LABELS: Record<BusinessKey, string> = {
  website: "Sitio web",
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  category: "Categoría",
  company_tax_id: "NIT",
  google_maps_url: "Google Maps",
};

export interface BusinessRow {
  key: BusinessKey;
  label: string;
  /** El valor guardado, tal cual (lo que se copia y se corrige). */
  value: string;
  /** Lo que se lee en la ficha. */
  display: string;
  /** Enlace seguro (solo http/https) o null si el dato no es navegable. */
  href: string | null;
  /** El equipo lo corrigió o lo confirmó: la captación ya no lo cambia. */
  corrected: boolean;
  field: ContactDataField;
}

/** Quién decide, tal como se lee en «El negocio». */
export interface BusinessDecisionMaker {
  name: string;
  title: string | null;
  /** «según el registro mercantil», en minúscula, para la línea secundaria. */
  evidence: string | null;
}

export interface BusinessProfileView {
  /** Quién decide; null si no se sabe o si lo guardado no es un hecho. */
  decisionMaker: BusinessDecisionMaker | null;
  web: BusinessRow[];
  ficha: BusinessRow[];
  originalName: string | null;
  /** La primera vez que la captación escribió alguno de estos datos. */
  capturedAt: string | null;
}

function text(value: ContactDataField["value"]): string | null {
  if (typeof value !== "string") return value === null ? null : String(value);
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** `https://…` válido o null. Nada de `javascript:` ni esquemas raros en una ficha. */
export function safeHttpUrl(raw: string): string | null {
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function stripUrl(raw: string): string {
  return raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

/** «https://instagram.com/almejatours/» o «almejatours» → «@almejatours». */
function handleOf(raw: string, host: string): string {
  const stripped = stripUrl(raw);
  const path = stripped.toLowerCase().startsWith(host) ? stripped.slice(host.length) : stripped;
  const handle = path.replace(/^\/+/, "").split(/[/?#]/)[0]?.replace(/^@/, "") ?? "";
  return handle === "" ? stripped : `@${handle}`;
}

/** Un usuario suelto («@almeja») como enlace al perfil; TikTok lleva la arroba en la ruta. */
function profileUrl(raw: string, host: string, keepAt = false): string | null {
  if (/^https?:\/\//i.test(raw) || raw.toLowerCase().includes(host)) return safeHttpUrl(raw);
  const handle = raw.replace(/^@/, "");
  return safeHttpUrl(`https://${host}/${keepAt ? "@" : ""}${handle}`);
}

/** Un celular colombiano dictado sin indicativo («300 314 8451») lleva el 57. */
function internationalDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return /^3\d{9}$/.test(digits) ? `57${digits}` : digits;
}

/** «573003148451» → «+57 300 314 8451»; otros países, con el + y sin agrupar. */
function readablePhone(digits: string): string {
  const co = /^57(3\d{2})(\d{3})(\d{4})$/.exec(digits);
  return co === null ? `+${digits}` : `+57 ${co[1]} ${co[2]} ${co[3]}`;
}

function whatsappOf(raw: string): { display: string; href: string | null } {
  if (/wa\.me|whatsapp\.com/i.test(raw)) {
    const digits = raw.replace(/\D/g, "");
    return { display: digits === "" ? stripUrl(raw) : readablePhone(digits), href: safeHttpUrl(raw) };
  }
  const digits = internationalDigits(raw);
  if (digits.length < 8) return { display: raw, href: null };
  return { display: readablePhone(digits), href: `https://wa.me/${digits}` };
}

function rowOf(key: BusinessKey, field: ContactDataField): BusinessRow | null {
  const value = text(field.value);
  if (value === null) return null;
  let display = value;
  let href: string | null = null;
  switch (key) {
    case "website":
    case "linkedin":
      display = stripUrl(value);
      href = safeHttpUrl(value);
      break;
    case "facebook":
      display = stripUrl(value);
      href = profileUrl(value, "facebook.com");
      break;
    case "instagram":
      display = handleOf(value, "instagram.com");
      href = profileUrl(value, "instagram.com");
      break;
    case "tiktok":
      display = handleOf(value, "tiktok.com");
      href = profileUrl(value, "tiktok.com", true);
      break;
    case "whatsapp": {
      const wa = whatsappOf(value);
      display = wa.display;
      href = wa.href;
      break;
    }
    case "google_maps_url":
      display = "Abrir su ficha en Maps";
      href = safeHttpUrl(value);
      break;
    case "category":
    case "company_tax_id":
      break;
  }
  return {
    key,
    label: BUSINESS_LABELS[key],
    value,
    display,
    href,
    corrected: field.state === "corrected" || field.state === "confirmed",
    field,
  };
}

/** Cómo se cuenta la fuente guardada, en la voz de la ficha. */
function evidenceOf(source: string | null): string | null {
  if (source === null) return null;
  const lower = source.toLowerCase();
  const confirmed = lower.includes("confirmado por tu equipo");
  if (lower.includes("registro mercantil")) return "según el registro mercantil";
  if (lower.includes("sitio web")) {
    return confirmed ? "de su sitio web, confirmado por tu equipo" : "según su sitio web";
  }
  if (confirmed) return "confirmado por tu equipo";
  return `según ${source}`;
}

/**
 * Quién decide, leído de los datos del contacto.
 *
 * Guarda de lectura de la misma regla que aplica el servidor al escribir: un
 * valor marcado «(sin confirmar)» es una pista, y una pista NUNCA se nombra en
 * el contacto. El servidor ya no escribe ninguno así; esto cubre un dato de
 * antes o puesto a mano.
 */
export function businessDecisionMakerOf(
  fields: readonly ContactDataField[],
): BusinessDecisionMaker | null {
  const byCode = new Map(
    fields.filter((field) => isBusinessProfileField(field)).map((field) => [field.code, field]),
  );
  const read = (code: string): string | null => {
    const field = byCode.get(code);
    return field === undefined ? null : text(field.value);
  };
  const name = read(DECISION_MAKER_KEYS.name);
  if (name === null) return null;
  const source = read(DECISION_MAKER_KEYS.source);
  if (source !== null && source.toLowerCase().includes("sin confirmar")) return null;
  return { name, title: read(DECISION_MAKER_KEYS.title), evidence: evidenceOf(source) };
}

/** Las filas de «El negocio», en el orden del mockup; solo las que tienen dato. */
export function businessProfileOf(fields: readonly ContactDataField[]): BusinessProfileView {
  const byCode = new Map(
    fields.filter((field) => isBusinessProfileField(field)).map((field) => [field.code, field]),
  );
  const rows = (keys: readonly BusinessKey[]) =>
    keys
      .map((key) => {
        const field = byCode.get(key);
        return field === undefined ? null : rowOf(key, field);
      })
      .filter((row): row is BusinessRow => row !== null);
  const original = byCode.get(ORIGINAL_NAME_KEY);
  const captured = [...byCode.values()]
    .map((field) => field.captured_at)
    .filter((at): at is string => at !== null)
    .sort();
  return {
    decisionMaker: businessDecisionMakerOf(fields),
    web: rows(BUSINESS_WEB_KEYS),
    ficha: rows(BUSINESS_FICHA_KEYS),
    originalName: original === undefined ? null : text(original.value),
    capturedAt: captured[0] ?? null,
  };
}

export function hasBusinessProfile(view: BusinessProfileView): boolean {
  return view.decisionMaker !== null || view.web.length > 0 || view.ficha.length > 0;
}
