/**
 * El vocabulario ÚNICO de las plantillas de Meta (F7, 2026-09-28).
 *
 * Hasta aquí la misma cosa tenía seis nombres según el módulo («Plantilla de
 * Meta», «Plantillas de WhatsApp», «plantilla HSM aprobada», «Plantilla
 * aprobada de Meta», «Plantilla de respaldo», «plantilla de apertura»), el
 * mismo motivo de omisión seis redacciones, el cobro tres versiones y la
 * palabra «24 h» nombraba dos cosas distintas (la ventana de servicio y el
 * cupo diario de conversaciones). Un operador que lee «plantilla HSM» en la
 * bandeja y «plantilla de respaldo» en documentos no sabe que son la misma
 * lista, que ahora vive en Configuración.
 *
 * Reglas:
 * - Se llama **plantilla de Meta**. «HSM» no se le dice al operador. Un
 *   adjetivo dice para qué se usa («plantilla de Meta de apertura»), nunca
 *   sustituye al nombre.
 * - La ventana es **«24 h»**, siempre con espacio y sin «horas». El cupo
 *   diario de Meta se llama **cupo diario de Meta**, nunca «24 h».
 * - El cobro: **Meta cobra solo las que entrega.**
 * - La categoría va en español con `HSM_CATEGORY_LABELS`: Marketing,
 *   Utilidad, Autenticación.
 */

/** Dónde se gestionan: en Configuración, porque las usa toda la plataforma. */
export const META_TEMPLATES_HREF = "/settings/meta-templates";

export const HSM_NOUN = "plantilla de Meta";
export const HSM_NOUN_PLURAL = "plantillas de Meta";
export const HSM_TITLE = "Plantillas de Meta";

/** Por qué NO salió (motivo de omisión), en una sola redacción para toda la app. */
export const HSM_WINDOW_REASON =
  "Pasaron más de 24 h desde su último mensaje: hace falta una plantilla de Meta";
/** La misma razón cuando la regla o el envío no la tenía elegida. */
export const HSM_WINDOW_REASON_NO_TEMPLATE =
  "Pasaron más de 24 h desde su último mensaje y no había plantilla de Meta";

/** La regla de WhatsApp, explicada una vez y en todas partes igual. */
export const HSM_WINDOW_RULE =
  "WhatsApp solo deja escribir libremente durante 24 h desde el último mensaje del cliente; después, solo con una plantilla de Meta.";

/** Lo que cuesta, en una frase que no promete ni más ni menos. */
export const HSM_COST_NOTE = "Meta cobra solo las que entrega.";

/** El cupo de conversaciones nuevas por día: NO es «24 h». */
export const META_DAILY_QUOTA_LABEL = "Cupo diario de Meta";
export const META_DAILY_QUOTA_HINT = "se renueva cada día";
