import { ANALYTICS_ENABLED, GA_MEASUREMENT_ID } from "@/core/config/env";

/**
 * Punto de la página desde el que se disparó la acción. Sirve para separar en
 * el informe el CTA del hero del que está al final de la landing, que convierten
 * de forma muy distinta.
 */
export type CtaLocation =
  | "hero"
  | "final_cta"
  | "nav"
  | "pricing"
  | "cases"
  | "integrations"
  | "contact"
  | "demo_form"
  | "footer"
  | "modules"
  | "signup"
  | "unknown";

export type AnalyticsEvent =
  | { name: "whatsapp_click"; params: { location: CtaLocation; path: string } }
  | { name: "demo_anchor_click"; params: { location: CtaLocation; path: string } }
  | { name: "demo_form_submit"; params: { volume: string } }
  // Funnel de registro autoservicio (/comenzar). `offer_codes` va como cadena
  // separada por comas: GA4 y Meta solo aceptan parámetros escalares.
  // `offer_volume` y `offer_period` son los otros dos ejes del precio: sin
  // ellos no se puede saber qué tramo convierte, que es justo el dato con el
  // que se fijan las tarifas del catálogo. Van vacíos cuando el enlace no los
  // trae (un CTA fuera de la sección de precios).
  | {
      name: "signup_start_click"
      params: {
        offer_codes: string
        offer_volume: string
        offer_period: string
        location: CtaLocation
        path: string
      }
    }
  | { name: "signup_step_view"; params: { step: string } }
  | { name: "signup_completed"; params: { offer_codes: string } };

/**
 * Traducción de cada evento del dominio a los dos destinos.
 *
 * GA4 y Meta tienen vocabularios distintos y ninguno es el nuestro: el nombre
 * interno describe lo que hizo el visitante, y esta tabla lo traduce. Así, si
 * mañana entra un tercer destino, se añade una columna y no se toca ni un
 * `track()` de los que hay repartidos por la app.
 *
 * `Contact` y `Lead` son eventos estándar de Meta (no `trackCustom`), lo que
 * permite optimizar campañas por ellos. `generate_lead` es el estándar de GA4.
 */
const EVENT_MAP: Record<
  AnalyticsEvent["name"],
  { ga: string; meta: { method: "track" | "trackCustom"; name: string } | null }
> = {
  whatsapp_click: { ga: "whatsapp_click", meta: { method: "track", name: "Contact" } },
  demo_anchor_click: { ga: "demo_anchor_click", meta: { method: "trackCustom", name: "DemoAnchorClick" } },
  demo_form_submit: { ga: "generate_lead", meta: { method: "track", name: "Lead" } },
  signup_start_click: { ga: "signup_start_click", meta: { method: "trackCustom", name: "SignupStart" } },
  signup_step_view: { ga: "signup_step_view", meta: null },
  // `sign_up` y `CompleteRegistration` son los estándar de GA4 y de Meta.
  signup_completed: { ga: "sign_up", meta: { method: "track", name: "CompleteRegistration" } },
};

/**
 * Única salida hacia GA4 y Meta. No-op silencioso si la analítica está apagada
 * (desarrollo, o producción sin ids configurados) o si el visitante rechazó el
 * seguimiento: en ese caso `window.fbq` ni siquiera existe, y `gtag` respeta el
 * estado de Consent Mode por su cuenta.
 */
export function track(event: AnalyticsEvent): void {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;

  const mapping = EVENT_MAP[event.name];
  window.gtag?.("event", mapping.ga, event.params);
  if (mapping.meta) {
    window.fbq?.(mapping.meta.method, mapping.meta.name, event.params);
  }
}

/**
 * Vista de página manual.
 *
 * Es manual porque el `config` de GA se inicializa con `send_page_view: false`:
 * en el App Router una navegación cliente no recarga la página, así que el
 * pageview automático solo contaría la primera vista de la sesión.
 */
export function pageview(url: string): void {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;

  if (GA_MEASUREMENT_ID) {
    window.gtag?.("event", "page_view", {
      page_path: url,
      page_location: window.location.href,
      page_title: document.title,
    });
  }
  window.fbq?.("track", "PageView");
}
