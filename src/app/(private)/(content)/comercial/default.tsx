import ComercialPage from "./page";

/**
 * Respaldo del slot `children` cuando la URL solo la resuelve un slot
 * paralelo: la ruta del mes se monta en vez de dar 404.
 *
 * La intercepción `(.)` del slot `@sheet` solo aplica en navegación SUAVE
 * dentro de `/comercial`. Desde `/cmo` (la tarjeta de Axel enlaza a
 * `/comercial/acciones/:id`) se llega a la página DURA `acciones/[id]/page.tsx`,
 * que ya monta la ruta del mes detrás del panel.
 */
export default function ComercialDefault() {
  return <ComercialPage />;
}
