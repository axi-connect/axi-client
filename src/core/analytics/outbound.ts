import { track, type CtaLocation } from "@/core/analytics/track";

/**
 * Instrumentación de los CTA por delegación de eventos.
 *
 * Por qué no un `onClick` en cada botón: los enlaces de WhatsApp se construyen
 * con `salesWhatsAppUrl()`, que devuelve un string para el `href` (es el único
 * punto que arma un `wa.me`, docs/architecture.md §13.1). Varios de sus
 * consumidores —`/precios`, `/contacto`, `/integraciones`— son Server
 * Components: añadirles un manejador los convertiría en componentes de cliente
 * y arrastraría su árbol entero al bundle, a cambio de nada.
 *
 * Un solo oyente en `document`, en fase de captura, cubre los siete CTA
 * actuales y cualquiera que se añada después sin tocar este archivo.
 */

/** Sección de la página → etiqueta de informe. */
const SECTION_TO_LOCATION: Record<string, CtaLocation> = {
  hero: "hero",
  demo: "final_cta",
  planes: "pricing",
  modulos: "modules",
  casos: "cases",
  faq: "unknown",
};

function locationFromAnchor(anchor: HTMLAnchorElement, path: string): CtaLocation {
  if (anchor.closest("header")) return "nav";
  if (anchor.closest("footer")) return "footer";

  const sectionId = anchor.closest("section[id]")?.id;
  if (sectionId && SECTION_TO_LOCATION[sectionId]) return SECTION_TO_LOCATION[sectionId];

  if (path.startsWith("/precios")) return "pricing";
  if (path.startsWith("/contacto")) return "contact";
  if (path.startsWith("/integraciones")) return "integrations";
  if (path.startsWith("/casos")) return "cases";
  return "unknown";
}

/**
 * Los tres ejes que puede llevar un CTA de registro:
 * `/comenzar?plan=escala&volumen=5000&periodo=annual` → los tres;
 * `/comenzar?modulo=calls,crm` → solo los códigos. Lo ausente va vacío.
 */
function offerFromHref(href: string): {
  offer_codes: string;
  offer_volume: string;
  offer_period: string;
} {
  const query = href.split("?")[1];
  if (!query) return { offer_codes: "", offer_volume: "", offer_period: "" };
  const params = new URLSearchParams(query);
  return {
    offer_codes: params.get("plan") ?? params.get("modulo") ?? "",
    offer_volume: params.get("volumen") ?? "",
    offer_period: params.get("periodo") ?? "",
  };
}

/**
 * Registra el oyente. `getPath` se pasa como función y no como valor para que
 * el oyente lea siempre la ruta actual sin volver a suscribirse en cada
 * navegación.
 */
export function attachOutboundTracking(getPath: () => string): () => void {
  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest("a");
    if (!anchor) return;

    // `getAttribute` y no `.href`: el DOM resuelve `#demo` a la URL absoluta,
    // y lo que hace falta distinguir es cómo lo escribió el autor.
    const href = anchor.getAttribute("href") ?? "";
    const path = getPath();

    if (href.startsWith("https://wa.me/")) {
      track({ name: "whatsapp_click", params: { location: locationFromAnchor(anchor, path), path } });
      return;
    }

    if (href.endsWith("#demo")) {
      track({ name: "demo_anchor_click", params: { location: locationFromAnchor(anchor, path), path } });
      return;
    }

    // CTA de registro: la oferta va en la query
    // (`?plan=escala&volumen=5000&periodo=annual`, `?modulo=calls,crm`).
    if (href.startsWith("/comenzar")) {
      track({
        name: "signup_start_click",
        params: { ...offerFromHref(href), location: locationFromAnchor(anchor, path), path },
      });
    }
  };

  // Captura: así se registra el clic aunque un manejador intermedio detenga la
  // propagación. Pasivo: no se llama a `preventDefault`, solo se observa.
  document.addEventListener("click", onClick, { capture: true, passive: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
}
