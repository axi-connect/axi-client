import { formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { renderHsmPreview, type PreviewSegment } from "@/modules/marketing/public";
import type { OpeningTemplateParam } from "./schedule-follow-up";

/**
 * Qué va en cada hueco `{{n}}` de la plantilla de Meta con la que abre un
 * seguimiento (hotfix 2026-09-29).
 *
 * El servidor recibe UNA cadena por hueco (`params`): `first_name`,
 * `full_name`, `company_name`, `topic`, `static:<texto>` o
 * `custom_field:<código>`. Aquí el hueco se modela como lo elige el operador
 * —un origen y, para los textos fijos, un TIPO (texto, fecha, hora, importe,
 * número, enlace) con su selector— y se convierte a esa cadena al enviar. Una
 * fecha se manda escrita como se lee («30 de septiembre»): estandariza el
 * dato sin cambiar el contrato ni la plantilla.
 */
export type StaticType = "text" | "date" | "time" | "money" | "number" | "url";

export type OpeningHole =
  | { kind: "first_name" | "full_name" | "company_name" | "topic" }
  | { kind: "static"; type: StaticType; raw: string }
  | { kind: "custom_field"; code: string };

const STATIC_PREFIX = "static:";
const CUSTOM_FIELD_PREFIX = "custom_field:";
/** El servidor rechaza un texto fijo más largo. */
export const STATIC_TEXT_MAX = 200;

/** Lo que el operador ve en el selector de un hueco, en orden. */
export const OPENING_HOLE_CHOICES: ReadonlyArray<{
  value: string;
  label: string;
  group: "contacto" | "fijo" | "otros";
}> = [
  { value: "first_name", label: "Nombre del contacto", group: "contacto" },
  { value: "full_name", label: "Nombre completo", group: "contacto" },
  { value: "custom_field", label: "Campo del contacto", group: "contacto" },
  { value: "static:text", label: "Texto", group: "fijo" },
  { value: "static:date", label: "Fecha", group: "fijo" },
  { value: "static:time", label: "Hora", group: "fijo" },
  { value: "static:money", label: "Importe", group: "fijo" },
  { value: "static:number", label: "Número", group: "fijo" },
  { value: "static:url", label: "Enlace", group: "fijo" },
  { value: "company_name", label: "Tu empresa", group: "otros" },
  { value: "topic", label: "Tema (lo escribes una vez)", group: "otros" },
];

export const STATIC_TYPE_HINT: Record<StaticType, string> = {
  text: "Igual para todos",
  date: "Se escribe como se lee: «30 de septiembre»",
  time: "«3:00 p. m.»",
  money: "En pesos: «$ 120.000»",
  number: "«1.200»",
  url: "Un enlace completo, con https://",
};

/** Qué opción del selector corresponde a un hueco. */
export function choiceOfHole(hole: OpeningHole): string {
  if (hole.kind === "static") return `static:${hole.type}`;
  return hole.kind;
}

/** Un hueco nuevo a partir de la opción elegida (conserva lo escrito si sigue siendo un texto fijo). */
export function holeFromChoice(choice: string, previous?: OpeningHole): OpeningHole {
  if (choice.startsWith(STATIC_PREFIX)) {
    const type = choice.slice(STATIC_PREFIX.length) as StaticType;
    const raw = previous?.kind === "static" && previous.type === type ? previous.raw : "";
    return { kind: "static", type, raw };
  }
  if (choice === "custom_field") {
    return { kind: "custom_field", code: previous?.kind === "custom_field" ? previous.code : "" };
  }
  return { kind: choice as "first_name" | "full_name" | "company_name" | "topic" };
}

/**
 * Sugerencia inicial: {{1}} el nombre, {{2}} el tema (las tres plantillas
 * sugeridas de axi son así) y el resto texto fijo VACÍO — un hueco sin decidir,
 * que bloquea hasta que el operador lo rellene. Adivinar aquí sale caro: un
 * valor plausible pero equivocado se manda a cientos de personas sin releerse.
 */
export function defaultOpeningHoles(count: number): OpeningHole[] {
  return Array.from({ length: count }, (_, index) =>
    index === 0
      ? { kind: "first_name" }
      : index === 1
        ? { kind: "topic" }
        : { kind: "static", type: "text", raw: "" },
  );
}

/** Ajusta la lista al número de huecos de otra plantilla, conservando lo ya decidido. */
export function resizeOpeningHoles(holes: readonly OpeningHole[], count: number): OpeningHole[] {
  const fresh = defaultOpeningHoles(count);
  return fresh.map((hole, index) => holes[index] ?? hole);
}

/** Lo que se manda por ese hueco, ya formateado; `null` si todavía no vale. */
export function staticValue(type: StaticType, raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;
  switch (type) {
    case "text":
      return /[\r\n\t]/.test(value) || value.length > STATIC_TEXT_MAX ? null : value;
    case "date": {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (match === null) return null;
      const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
      if (Number.isNaN(date.getTime())) return null;
      const sameYear = date.getFullYear() === new Date().getFullYear();
      return date.toLocaleDateString("es-CO", {
        day: "numeric",
        month: "long",
        ...(sameYear ? {} : { year: "numeric" }),
      });
    }
    case "time": {
      const match = /^(\d{2}):(\d{2})$/.exec(value);
      if (match === null) return null;
      const date = new Date(2000, 0, 1, Number(match[1]), Number(match[2]));
      return date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
    }
    case "money": {
      const cents = parseMoneyToCents(value);
      return cents === null ? null : formatMoney(cents);
    }
    case "number": {
      const number = Number(value.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(number) ? number.toLocaleString("es-CO") : null;
    }
    case "url":
      return /^https?:\/\/\S+$/.test(value) ? value : null;
  }
}

/** Por qué un hueco todavía no se puede mandar; `null` si está resuelto. */
export function holeIssue(hole: OpeningHole, topic: string): string | null {
  switch (hole.kind) {
    case "topic":
      return topic.trim().length >= 2 ? null : "Escribe el tema";
    case "custom_field":
      return hole.code === "" ? "Elige el campo" : null;
    case "static":
      if (hole.raw.trim() === "") return "Falta el valor";
      return staticValue(hole.type, hole.raw) === null ? "El valor no vale" : null;
    default:
      return null;
  }
}

/** Los `{{n}}` (desde 1) que aún no tienen valor. */
export function unresolvedHoles(holes: readonly OpeningHole[], topic: string): number[] {
  return holes.flatMap((hole, index) => (holeIssue(hole, topic) === null ? [] : [index + 1]));
}

/** Los `params` que viajan al servidor. Solo tiene sentido con `unresolvedHoles` vacío. */
export function encodeOpeningHoles(holes: readonly OpeningHole[]): OpeningTemplateParam[] {
  return holes.map((hole) => {
    if (hole.kind === "static") return `${STATIC_PREFIX}${staticValue(hole.type, hole.raw) ?? ""}`;
    if (hole.kind === "custom_field") return `${CUSTOM_FIELD_PREFIX}${hole.code}`;
    return hole.kind;
  });
}

/** De vuelta desde lo guardado (editar una tarea). Un `static:` vuelve como texto. */
export function decodeOpeningParams(params: readonly string[]): OpeningHole[] {
  return params.map((param): OpeningHole => {
    if (param.startsWith(STATIC_PREFIX)) {
      return { kind: "static", type: "text", raw: param.slice(STATIC_PREFIX.length) };
    }
    if (param.startsWith(CUSTOM_FIELD_PREFIX)) {
      return { kind: "custom_field", code: param.slice(CUSTOM_FIELD_PREFIX.length) };
    }
    if (param === "first_name" || param === "full_name" || param === "company_name" || param === "topic") {
      return { kind: param };
    }
    return { kind: "static", type: "text", raw: "" };
  });
}

export interface HoleValueSources {
  first_name: string | null;
  full_name: string | null;
  company_name: string;
  topic: string;
  /** La ficha del contacto (`custom_fields` + columnas como `city`). */
  custom_fields?: Record<string, unknown> | null;
}

/**
 * Lo que sale por un hueco para ESTE contacto, o `null` si falta. Misma regla
 * de relleno que el servidor: el primer nombre cae al completo y este a «Hola».
 */
export function holeValue(hole: OpeningHole, sources: HoleValueSources): string | null {
  const firstName =
    sources.first_name?.trim() || sources.full_name?.trim().split(/\s+/)[0] || "Hola";
  switch (hole.kind) {
    case "first_name":
      return firstName;
    case "full_name":
      return sources.full_name?.trim() || firstName;
    case "company_name":
      return sources.company_name;
    case "topic":
      return sources.topic.trim() || null;
    case "static":
      return staticValue(hole.type, hole.raw);
    case "custom_field": {
      if (hole.code === "") return null;
      const raw = sources.custom_fields?.[hole.code];
      const text = typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "";
      return text === "" ? null : text;
    }
  }
}

/** La vista previa con los huecos resueltos; los que faltan salen como «…». */
export function renderOpeningPreview(
  body: string,
  holes: readonly OpeningHole[],
  sources: HoleValueSources,
): PreviewSegment[] {
  return renderHsmPreview(body, (index) => {
    const hole = holes[index - 1];
    return hole === undefined ? null : (holeValue(hole, sources) ?? "…");
  });
}
