import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Los filtros de un listado, declarados como DATOS.
 *
 * `shared/` no puede importar de `modules/` (arquitectura §3.3, regla 7), así
 * que el panel no puede conocer ni un estado, ni un origen, ni una etiqueta:
 * el consumidor le pasa su esquema y aquí vive solo la mecánica. Es el mismo
 * principio de «configuración por datos, no por código» que ya rige
 * `DynamicForm`.
 *
 * Lo que este fichero aporta —y la razón de que las funciones sean puras y
 * estén probadas sueltas— es que la SERIALIZACIÓN es una trampa con historia:
 * `buildListParams` castea a `string | number | boolean | undefined` y
 * `http.ts` hace `String(value)`, así que un arreglo se convierte en `a,b,c`
 * **por accidente** y un objeto se convierte en `"[object Object]"` **en
 * silencio**. Aquí el arreglo se une explícitamente y nunca sale de esta capa.
 */

/**
 * Centinela de «sin filtro» para los controles que necesitan un valor de cadena
 * (los `Select` de Radix no aceptan `""` ni `null` como valor de ítem).
 *
 * Es UNO y solo uno a propósito: hoy en el repo conviven `"any"`, `"all"` y
 * `"__all__"` para la misma idea. Se adopta la ortografía mayoritaria
 * (`__all__`, 5 usos) en vez de inventar una cuarta.
 */
export const NO_FILTER_VALUE = "__all__";

export type FilterOption = {
  value: string;
  label: string;
  hint?: string;
  icon?: LucideIcon;
  /**
   * Clase literal de un diccionario CERRADO del consumidor. Nunca `bg-${x}`:
   * Tailwind v4 extrae las clases estáticamente del fuente, así que una clase
   * interpolada no genera CSS (misma trampa que los z-index).
   */
  dotClassName?: string;
};

type FilterDefBase = {
  key: string;
  label: string;
  description?: string;
  /** `id` de una sección de `FilterSchema.sections`. Sin sección va al principio. */
  section?: string;
  /** Nombre del parámetro en el alambre, cuando no coincide con `key`. */
  paramName?: string;
  /** Serialización propia. Devuelve un Record plano: el tipo prohíbe el arreglo. */
  serialize?: (value: unknown) => Record<string, string | number | boolean | undefined>;
  disabled?: boolean;
  /** El aviso que aparece SOLO al elegir. Devolver `null` cuando no aplica. */
  caution?: (value: unknown) => ReactNode | null;
};

export type FilterDef =
  | (FilterDefBase & { kind: "multi"; options: readonly FilterOption[]; layout?: "pills" | "cards" })
  | (FilterDefBase & {
      kind: "single";
      options: readonly FilterOption[];
      layout?: "pills" | "cards" | "select";
    })
  | (FilterDefBase & {
      kind: "steps";
      options: readonly { value: string | number | null; label: string }[];
    })
  | (FilterDefBase & { kind: "count"; max: number; noneLabel?: string })
  | (FilterDefBase & {
      kind: "flags";
      options: readonly FilterOption[];
      /** Presente ⇒ se pinta el conmutador todos/alguno. Ausente ⇒ AND. */
      modeKey?: string;
      modeLabels?: { all: string; any: string };
    })
  | (FilterDefBase & { kind: "switch" })
  | (FilterDefBase & { kind: "text"; placeholder?: string })
  | (FilterDefBase & { kind: "date"; mode?: "from" | "range" });

export type FilterSchema = {
  sections?: readonly { id: string; title: string; description?: string }[];
  filters: readonly FilterDef[];
};

export type FilterValues = Record<string, string | number | boolean | string[] | undefined>;

/** Modo del conjunto de datos exigidos. Por defecto `all` — o sea AND. */
export type FilterFlagsMode = "all" | "any";

/* ─────────────────────────── Lectura de valores ─────────────────────────── */

/**
 * Lee un valor multivalor.
 *
 * Acepta también la cadena suelta porque quien arma el estado desde la URL
 * entrega `?status=new` como cadena: negarlo obligaría a cada consumidor a
 * normalizar antes de pintar, y el primero que lo olvide pierde el filtro sin
 * que nada falle.
 */
function readList(value: FilterValues[string]): string[] {
  if (Array.isArray(value)) return value.filter((item) => item !== "");
  if (typeof value === "string" && value !== "") return [value];
  return [];
}

function readText(value: FilterValues[string]): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Lee un rango de fechas como `[desde, hasta]`.
 *
 * El valor canónico es un arreglo de 1 o 2 cadenas `YYYY-MM-DD`, pero una
 * cadena suelta se lee como «desde»: es lo que produce un `mode: "from"`
 * cableado a mano o recuperado de la URL.
 */
function readDates(value: FilterValues[string]): [string, string] {
  if (Array.isArray(value)) return [value[0] ?? "", value[1] ?? ""];
  if (typeof value === "string") return [value, ""];
  return ["", ""];
}

/** Nunca deja pasar un arreglo al alambre: es lo que este módulo existe para evitar. */
function readScalar(value: FilterValues[string]): string | number | boolean | undefined {
  if (Array.isArray(value)) return undefined;
  return value;
}

function readMode(values: FilterValues, modeKey: string | undefined): FilterFlagsMode {
  if (!modeKey) return "all";
  return values[modeKey] === "any" ? "any" : "all";
}

function optionLabel(options: readonly { value: unknown; label: string }[], value: unknown): string {
  const match = options.find((option) => String(option.value) === String(value));
  return match ? match.label : String(value);
}

/**
 * ¿Este filtro está puesto?
 *
 * Un interruptor en falso NO está puesto, y esa es la mitad del contrato de
 * serialización: un backend lee `verified_only=false` como «exijo que NO esté
 * verificado», que es lo contrario de «no me importa».
 */
function isActive(def: FilterDef, value: FilterValues[string]): boolean {
  switch (def.kind) {
    case "multi":
    case "flags":
      return readList(value).length > 0;
    case "single":
    case "steps":
      return (
        value !== undefined && value !== null && value !== "" && value !== NO_FILTER_VALUE
      );
    case "count":
      return value !== undefined && Number(value) > 0;
    case "switch":
      return value === true;
    case "text":
      return readText(value).length > 0;
    case "date": {
      const [after, before] = readDates(value);
      return after !== "" || before !== "";
    }
  }
}

/* ──────────────────────────── Funciones puras ──────────────────────────── */

/**
 * Cuántos filtros están puestos. Es el contador del botón «Filtros».
 *
 * Cuenta FILTROS, no valores: «tres estados» es un filtro, no tres. Y el
 * conmutador todos/alguno no cuenta nunca — es un matiz del filtro de datos,
 * no un filtro por su cuenta.
 */
export function countActive(schema: FilterSchema, values: FilterValues): number {
  return schema.filters.reduce(
    (total, def) => total + (isActive(def, values[def.key]) ? 1 : 0),
    0,
  );
}

/**
 * Quita todo lo que el esquema posee y **conserva lo que no**.
 *
 * Lo segundo importa: en el mismo objeto de estado viven `sort`, `page` y el
 * texto del buscador, que no son filtros y no deben irse con el «Limpiar».
 */
export function clearAll(schema: FilterSchema, values: FilterValues): FilterValues {
  const next = { ...values };
  for (const def of schema.filters) {
    delete next[def.key];
    if (def.kind === "flags" && def.modeKey) delete next[def.modeKey];
  }
  return next;
}

/** Quita UN filtro (y su conmutador de modo, que sin valores no significa nada). */
export function removeFilter(
  schema: FilterSchema,
  values: FilterValues,
  key: string,
): FilterValues {
  const next = { ...values };
  delete next[key];
  const def = schema.filters.find((candidate) => candidate.key === key);
  if (def?.kind === "flags" && def.modeKey) delete next[def.modeKey];
  return next;
}

/**
 * El texto de los chips que se pintan FUERA de la hoja.
 *
 * Deriva de aquí y no del consumidor a propósito: en cuanto alguien escribe
 * `«Ciudad: » + value` a mano, el chip y el filtro pueden decir cosas
 * distintas. La doctrina es la que dejó escrita `ContactFilters`: *el estado no
 * se esconde*.
 */
export function describeFilters(
  schema: FilterSchema,
  values: FilterValues,
): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = [];

  for (const def of schema.filters) {
    const value = values[def.key];
    if (!isActive(def, value)) continue;

    switch (def.kind) {
      case "multi": {
        const labels = readList(value).map((item) => optionLabel(def.options, item));
        chips.push({ key: def.key, label: `${def.label}: ${labels.join(", ")}` });
        break;
      }
      case "flags": {
        const labels = readList(value).map((item) => optionLabel(def.options, item));
        // El separador DICE el modo: «Instagram y correo» y «Instagram o correo»
        // son dos filtros distintos, y un chip que los pinte igual miente.
        const separator = readMode(values, def.modeKey) === "any" ? " o " : " y ";
        chips.push({ key: def.key, label: `${def.label}: ${labels.join(separator)}` });
        break;
      }
      case "single":
      case "steps":
        chips.push({ key: def.key, label: `${def.label}: ${optionLabel(def.options, value)}` });
        break;
      case "count":
        chips.push({ key: def.key, label: `${def.label}: ${value} de ${def.max}` });
        break;
      case "switch":
        // Un booleano no tiene valor que enseñar: el chip ES la etiqueta.
        chips.push({ key: def.key, label: def.label });
        break;
      case "text":
        chips.push({ key: def.key, label: `${def.label}: ${readText(value)}` });
        break;
      case "date": {
        const [after, before] = readDates(value);
        const range =
          after && before ? `${after} – ${before}` : after ? `desde ${after}` : `hasta ${before}`;
        chips.push({ key: def.key, label: `${def.label}: ${range}` });
        break;
      }
    }
  }

  return chips;
}

/**
 * El estado del panel → parámetros de consulta.
 *
 * | tipo | alambre |
 * |---|---|
 * | `multi` / `flags` | CSV `join(",")`; vacío ⇒ no viaja. `flags` con `modeKey` añade `${nombre}_mode` |
 * | `steps` / `count` | el valor crudo bajo `paramName ?? key`; `null` ⇒ no viaja |
 * | `switch` | **solo cuando es verdadero** |
 * | `text` | recortado; `""` ⇒ no viaja |
 * | `date` | `${nombre}_after` / `${nombre}_before` |
 *
 * El nombre base es `paramName ?? key` en TODOS los casos, `date` incluida:
 * un filtro que renombra su parámetro y sigue emitiendo `${key}_after` sería
 * un filtro renombrado a medias.
 *
 * Por convención, `modeKey` vale `${key}_mode` —así el hueco del borrador y el
 * nombre del parámetro son el mismo y no hay dos vocabularios.
 */
export function serializeFilters(
  schema: FilterSchema,
  values: FilterValues,
): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {};

  const put = (name: string, value: string | number | boolean | undefined) => {
    if (value !== undefined) params[name] = value;
  };

  for (const def of schema.filters) {
    const value = values[def.key];

    if (def.serialize) {
      // Quien declara su propia serialización decide también qué es «vacío»:
      // hay parámetros que solo tienen sentido en pareja.
      for (const [name, emitted] of Object.entries(def.serialize(value))) put(name, emitted);
      continue;
    }

    if (!isActive(def, value)) continue;
    const name = def.paramName ?? def.key;

    switch (def.kind) {
      case "multi":
        put(name, readList(value).join(","));
        break;
      case "flags":
        put(name, readList(value).join(","));
        if (def.modeKey) put(`${name}_mode`, readMode(values, def.modeKey));
        break;
      case "single":
      case "steps":
      case "count":
        put(name, readScalar(value));
        break;
      case "switch":
        put(name, true);
        break;
      case "text":
        put(name, readText(value));
        break;
      case "date": {
        const [after, before] = readDates(value);
        if (after) put(`${name}_after`, after);
        if (before) put(`${name}_before`, before);
        break;
      }
    }
  }

  return params;
}
