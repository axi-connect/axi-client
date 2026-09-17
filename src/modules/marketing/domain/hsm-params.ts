/**
 * Qué va en cada hueco `{{n}}` de la plantilla de Meta de una campaña.
 *
 * **Espeja a `hsm_param_mapping.ts` del servidor**
 * (`axi-server/src/modules/marketing/application/hsm_param_mapping.ts`). El
 * formato que viaja es el mismo, `[{ index, source }]`, y las etiquetas de
 * `source` tienen que coincidir literalmente: si tocas una, toca la otra o el
 * alta devolverá 422.
 *
 * El servidor admite además `custom_field:<código>`. Aquí no se ofrece todavía
 * porque no hay catálogo de códigos que enseñar, y pedirle al operador que lo
 * escriba a mano es el mismo error que este trabajo viene a quitar.
 */

export type HsmParamEntry = { index: number; source: string };

export const HSM_STATIC_PREFIX = "static:";

/** Lo que el operador puede elegir para un hueco, en el orden en que se ofrece. */
export const HSM_PARAM_CHOICES = [
  { value: "contact_first_name", label: "Nombre del contacto" },
  { value: "contact_name", label: "Nombre completo" },
  { value: "company_name", label: "Nombre de tu empresa" },
  { value: HSM_STATIC_PREFIX, label: "Texto fijo" },
] as const;

export type HsmParamChoice = (typeof HSM_PARAM_CHOICES)[number]["value"];

/** Qué opción del selector corresponde a un `source` ya guardado. */
export function choiceOf(source: string): HsmParamChoice | null {
  if (source.startsWith(HSM_STATIC_PREFIX)) return HSM_STATIC_PREFIX;
  const match = HSM_PARAM_CHOICES.find((choice) => choice.value === source);
  return match === undefined ? null : match.value;
}

/** El texto de un `static:…`; cadena vacía si aún no se ha escrito. */
export function staticTextOf(source: string): string {
  return source.startsWith(HSM_STATIC_PREFIX) ? source.slice(HSM_STATIC_PREFIX.length) : "";
}

/**
 * Sugerencia inicial: el primer hueco casi siempre es el nombre, y el resto se
 * deja en texto fijo vacío — que es un hueco SIN decidir, y por eso bloquea.
 * Adivinar de más aquí sale caro: un valor plausible pero equivocado se manda
 * a 800 personas sin que nadie lo relea.
 */
export function defaultHsmMapping(count: number): HsmParamEntry[] {
  return Array.from({ length: count }, (_, position) => ({
    index: position + 1,
    source: position === 0 ? "contact_first_name" : HSM_STATIC_PREFIX,
  }));
}

/** Ajusta un mapeo existente al número de huecos de OTRA plantilla. */
export function resizeHsmMapping(mapping: readonly HsmParamEntry[], count: number): HsmParamEntry[] {
  return defaultHsmMapping(count).map((fallback) => {
    const kept = mapping.find((entry) => entry.index === fallback.index);
    return kept === undefined ? fallback : { ...kept };
  });
}

/** Un hueco está decidido si su origen es conocido y, si es texto fijo, no está vacío. */
export function isEntryResolved(entry: HsmParamEntry): boolean {
  const choice = choiceOf(entry.source);
  if (choice === null) return false;
  return choice === HSM_STATIC_PREFIX ? staticTextOf(entry.source).trim().length > 0 : true;
}

/** Los huecos que faltan por decidir, como `{{n}}`, para nombrarlos en el aviso. */
export function unresolvedHsmSlots(mapping: readonly HsmParamEntry[]): string[] {
  return mapping.filter((entry) => !isEntryResolved(entry)).map((entry) => `{{${entry.index}}}`);
}

/** Lo que se verá en ese hueco, o `null` si todavía no se ha decidido. */
export function hsmPreviewValue(
  source: string,
  sample: { first_name: string; full_name: string; company_name: string },
): string | null {
  const choice = choiceOf(source);
  switch (choice) {
    case "contact_first_name":
      return sample.first_name;
    case "contact_name":
      return sample.full_name;
    case "company_name":
      return sample.company_name;
    case HSM_STATIC_PREFIX: {
      const text = staticTextOf(source).trim();
      return text.length === 0 ? null : text;
    }
    default:
      return null;
  }
}
