/**
 * Las piezas de una plantilla de Meta en el cliente: cabecera, pie y botones.
 *
 * **Espeja a `template_components.ts` del servidor**
 * (`channels/application/ports/template_components.ts`), que es quien valida de
 * verdad. Aquí solo vive lo que la interfaz necesita para no dejar construir lo
 * imposible: los topes por tipo —para apagar el botón de añadir— y la regla de
 * agrupación. Si tocas una, toca la otra.
 *
 * Deliberadamente NO se repiten los mensajes de error: los escribe el servidor,
 * que es el único que sabe cuál de las diez reglas se incumplió. Repetirlos aquí
 * sería tener dos versiones de la misma verdad, con la del cliente
 * quedándose vieja sin que nadie se entere.
 */

export type TemplateHeader =
  | { format: "text"; text: string; example?: string }
  | { format: "image"; handle: string };

export type TemplateButton =
  | { type: "quick_reply"; text: string }
  | { type: "url"; text: string; url: string }
  | { type: "phone_number"; text: string; phone_number: string }
  | { type: "copy_code"; example: string };

export type ButtonKind = TemplateButton["type"];

/** Los topes de Meta, verificados contra su documentación. */
export const BUTTON_LIMITS: Record<ButtonKind, number> = {
  quick_reply: 10,
  url: 2,
  phone_number: 1,
  copy_code: 1,
};

export const BUTTONS_MAX = 10;
export const HEADER_MAX = 60;
export const FOOTER_MAX = 60;
export const BUTTON_LABEL_MAX = 25;

export const BUTTON_LABELS: Record<ButtonKind, string> = {
  quick_reply: "Respuesta rápida",
  url: "Enlace",
  phone_number: "Llamar",
  copy_code: "Copiar código",
};

/** Si se puede añadir uno más de ese tipo, con el total y su tope propio. */
export function canAddButton(buttons: readonly TemplateButton[], kind: ButtonKind): boolean {
  if (buttons.length >= BUTTONS_MAX) return false;
  return buttons.filter((button) => button.type === kind).length < BUTTON_LIMITS[kind];
}

/** Un botón nuevo del tipo pedido, vacío y listo para escribir encima. */
export function emptyButton(kind: ButtonKind): TemplateButton {
  switch (kind) {
    case "quick_reply":
      return { type: "quick_reply", text: "" };
    case "url":
      return { type: "url", text: "", url: "" };
    case "phone_number":
      return { type: "phone_number", text: "", phone_number: "" };
    case "copy_code":
      return { type: "copy_code", example: "" };
  }
}

/**
 * Las rápidas primero y las acciones después, conservando el orden dentro de
 * cada grupo.
 *
 * Meta **exige** que las rápidas vayan juntas: «rápida, enlace, rápida» es lo
 * que su API llama «invalid combination». Reordenar al guardar hace que esa
 * combinación no se pueda ni construir, que es mejor que validarla y avisar.
 *
 * Los dos grupos valen en cualquier orden para Meta; aquí se fija uno para que
 * el resultado sea predecible, y es una decisión nuestra, no un límite suyo.
 */
export function groupButtons(buttons: readonly TemplateButton[]): TemplateButton[] {
  return [
    ...buttons.filter((button) => button.type === "quick_reply"),
    ...buttons.filter((button) => button.type !== "quick_reply"),
  ];
}

/**
 * Lo que WhatsApp enseñará de verdad: con más de tres botones solo se ven dos y
 * el resto se esconde tras «Ver todas las opciones». La previa lo imita porque
 * enseñar cinco botones bonitos cuando el cliente verá dos es peor que no
 * tener previa.
 */
export function visibleButtons(buttons: readonly TemplateButton[]): {
  shown: TemplateButton[];
  hidden: number;
} {
  if (buttons.length <= 3) return { shown: [...buttons], hidden: 0 };
  return { shown: buttons.slice(0, 2), hidden: buttons.length - 2 };
}

/**
 * Si esta combinación **no se podrá ver en WhatsApp de escritorio**: cuatro o
 * más botones, o una rápida mezclada con otro tipo. A quien la reciba ahí se le
 * pedirá abrirla en el celular, y es un dato que cambia la decisión de quien va
 * a escribir a ochocientas personas.
 */
export function breaksDesktop(buttons: readonly TemplateButton[]): boolean {
  if (buttons.length >= 4) return true;
  const hasQuick = buttons.some((button) => button.type === "quick_reply");
  const hasOther = buttons.some((button) => button.type !== "quick_reply");
  return hasQuick && hasOther;
}

/**
 * Las piezas que ya tiene una plantilla, leídas de sus `components`.
 *
 * Hace falta para que EDITAR las cargue en el formulario: si se abriera vacío,
 * guardar las borraría — editar reemplaza todos los componentes en Meta. El
 * servidor tiene la misma cautela por su lado; esto es para que el operador vea
 * lo que hay antes de tocarlo.
 */
export function readTemplatePieces(components: unknown): {
  header: string | null;
  footer: string | null;
  buttons: TemplateButton[];
} {
  const empty = { header: null, footer: null, buttons: [] as TemplateButton[] };
  if (!Array.isArray(components)) return empty;

  let header: string | null = null;
  let footer: string | null = null;
  let buttons: TemplateButton[] = [];

  for (const raw of components) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    const type = typeof item.type === "string" ? item.type.toUpperCase() : "";
    const text = typeof item.text === "string" ? item.text : "";
    // Una cabecera de media no se puede editar todavía: se deja fuera del
    // formulario para no prometer algo que no se puede guardar.
    if (type === "HEADER" && String(item.format ?? "text").toLowerCase() === "text") header = text;
    if (type === "FOOTER") footer = text;
    if (type === "BUTTONS" && Array.isArray(item.buttons)) {
      buttons = item.buttons
        .map(readButton)
        .filter((button): button is TemplateButton => button !== null);
    }
  }
  return { header, footer, buttons };
}

function readButton(raw: unknown): TemplateButton | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const type = typeof item.type === "string" ? item.type.toUpperCase() : "";
  const text = typeof item.text === "string" ? item.text : "";
  switch (type) {
    case "QUICK_REPLY":
      return { type: "quick_reply", text };
    case "URL":
      return { type: "url", text, url: typeof item.url === "string" ? item.url : "" };
    case "PHONE_NUMBER":
      return {
        type: "phone_number",
        text,
        phone_number: typeof item.phone_number === "string" ? item.phone_number : "",
      };
    case "COPY_CODE":
      return { type: "copy_code", example: typeof item.example === "string" ? item.example : "" };
    default:
      return null;
  }
}
