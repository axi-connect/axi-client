import { OrdersView } from "@/modules/orders/ui/OrdersView";

/** Navegación hard / refresh: página completa con el rail ya abierto. */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrdersView initialOrderId={orderId} />;
}
