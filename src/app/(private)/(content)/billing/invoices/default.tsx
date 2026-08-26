import BillingInvoicesPage from "./page";

/**
 * Fallback del slot `children` cuando solo cambia `@sheet` — o cuando se
 * intercepta el detalle llegando desde otro segmento (p.ej. el deep-link de la
 * campanita): la lista se monta detrás del panel en vez de romper con un 404.
 */
export default function BillingInvoicesDefault() {
  return <BillingInvoicesPage />;
}
