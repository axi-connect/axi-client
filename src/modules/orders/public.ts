/**
 * SUPERFICIE PÚBLICA del slice `orders` (architecture.md §3.3). Lo que otros
 * slices necesitan de un pedido —listarlos por contacto, abrir su detalle,
 * pintar su estado— sale por aquí; nada importa rutas internas del slice.
 *
 * Nace en F8 del programa Cobros para la card «Pedidos y documentos» de la
 * ficha del contacto (`crm`), que estaba prevista desde F4 y nunca se
 * construyó.
 */
export {
  PAYMENT_STATE_LABELS,
  daysUntilService,
  formatMoney,
  orderNumberLabel,
  paymentProgress,
  type ListOrdersParams,
  type OrderDTO,
  type PaymentState,
} from "./domain/order";
export {
  getOrder,
  listOrders,
} from "./infrastructure/services/orders-service.adapter";
export { OrderStatusBadge } from "./ui/components/OrderStatusBadge";
