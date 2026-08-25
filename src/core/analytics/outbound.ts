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
    }
  };

  // Captura: así se registra el clic aunque un manejador intermedio detenga la
  // propagación. Pasivo: no se llama a `preventDefault`, solo se observa.
  document.addEventListener("click", onClick, { capture: true, passive: true });
  return () => document.removeEventListener("click", onClick, { capture: true });
}
