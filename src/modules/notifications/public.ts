/**
 * Superficie pública del slice `notifications` (architecture §3.3.5).
 *
 * Nace con el módulo de facturación, que necesita silenciar los toasts de su
 * propia familia mientras su vista está montada. Se publica el **hook** y no el
 * store: lo que se publica queda acoplado, y exponer el store entero dejaría a
 * cualquier slice mutando la campanita.
 *
 * Deuda conocida: `orders/ui/OrdersView.tsx` hace el mismo par
 * suppress/unsuppress importando el store por ruta profunda. Debería pasar por
 * este hook — no se toca aquí para no meter cambios ajenos a facturación.
 */
export { useSuppressToasts } from "./ui/hooks/use-suppress-toasts";
export { notificationTarget } from "./domain/notification-target";
