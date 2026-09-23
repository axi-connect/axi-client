import ComercialPage from "./page";

/**
 * Fallback del slot `children` cuando solo cambia `@sheet` — o cuando el
 * detalle se intercepta llegando desde otro segmento (la tarjeta de Axel en
 * /cmo enlaza a `/comercial/acciones/:id`): la ruta del mes se monta detrás
 * del panel en vez de dar 404.
 */
export default function ComercialDefault() {
  return <ComercialPage />;
}
