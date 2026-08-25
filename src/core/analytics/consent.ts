/**
 * Consentimiento de analítica y publicidad.
 *
 * Por qué existe: la Ley 1581 de 2012 y el Decreto 1377 de 2013 exigen
 * autorización previa e informada para tratar datos personales, y la IP más el
 * recorrido de navegación que se entregan a Google y a Meta lo son. El riesgo
 * real no es GA4 —que puede operar sin cookies con Consent Mode— sino el píxel
 * de Meta, que es publicidad y remarketing: por eso ese no se carga hasta que
 * hay un sí explícito.
 *
 * Se guarda en `localStorage` y no en una cookie a propósito: no hace falta en
 * el servidor, y poner una cookie para registrar que alguien rechaza cookies es
 * exactamente lo que la norma no quiere.
 */
export type ConsentStatus = "granted" | "denied";

/**
 * Clave versionada: si mañana cambian las finalidades del tratamiento, subir a
 * `v2` vuelve a preguntar a todo el mundo en vez de asumir un sí antiguo para
 * un uso nuevo.
 */
export const CONSENT_STORAGE_KEY = "axi.consent.v1";

/** Evento interno para que los oyentes reaccionen sin recargar la página. */
const CONSENT_EVENT = "axi:consent:change";

function isStatus(value: string | null): value is ConsentStatus {
  return value === "granted" || value === "denied";
}

/** Decisión guardada, o `null` si el visitante aún no ha respondido. */
export function readConsent(): ConsentStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return isStatus(raw) ? raw : null;
  } catch {
    // Modo privado de Safari, almacenamiento bloqueado por política, cuota
    // llena: sin persistencia se pregunta otra vez, que es el lado seguro.
    return null;
  }
}

export function writeConsent(status: ConsentStatus): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // Se ignora: la decisión sigue valiendo para esta sesión vía el evento.
  }
  window.dispatchEvent(new CustomEvent<ConsentStatus>(CONSENT_EVENT, { detail: status }));
}

/** Suscripción a cambios de consentimiento. Devuelve la función de limpieza. */
export function onConsentChange(handler: (status: ConsentStatus) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (event: Event) => handler((event as CustomEvent<ConsentStatus>).detail);
  window.addEventListener(CONSENT_EVENT, listener);
  return () => window.removeEventListener(CONSENT_EVENT, listener);
}
