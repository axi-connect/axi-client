import { OrderDetailRoute } from "@/modules/orders/ui/OrderDetailRoute";

/** Navegación soft a /orders/[orderId]: el detalle abre como rail derecho. */
export default async function InterceptedOrderDetail({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <OrderDetailRoute orderId={orderId} closeBehavior="back" />;
}
