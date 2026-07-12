"use client";

import { useRouter } from "next/navigation";
import { OrderDetailRail } from "./components/detail/OrderDetailRail";

/**
 * Adaptador de ruta → rail. `back` para la ruta interceptada (el atrás del
 * navegador cierra el sheet); `replace` para hard-nav (/orders/[id] directo).
 */
export function OrderDetailRoute({
  orderId,
  closeBehavior,
}: {
  orderId: string;
  closeBehavior: "back" | "replace";
}) {
  const router = useRouter();

  return (
    <div className="h-full shrink-0 lg:py-4 lg:pr-4">
      <OrderDetailRail
        orderId={orderId}
        onClose={() => {
          if (closeBehavior === "back") router.back();
          else router.push("/orders");
        }}
      />
    </div>
  );
}
