"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShoppingCart, Sparkles, X } from "lucide-react";
import { spring } from "@/core/styles/motion";
import { Button } from "@/shared/components/ui/button";
import {
  useOrdersStore,
  type OrderToastEntry,
} from "@/modules/orders/infrastructure/stores/orders.store";

const AUTO_DISMISS_MS = 7000;

function Toast({ toast, onView, onDismiss }: {
  toast: OrderToastEntry;
  onView: () => void;
  onDismiss: () => void;
}) {
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <motion.div
      layout={!reducedMotion}
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 24 }}
      transition={reducedMotion ? { duration: 0.15 } : spring.snappy}
      className="glass pointer-events-auto flex w-80 items-start gap-3 rounded-2xl p-3.5"
      role="status"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        {toast.by_ai ? <Sparkles className="size-4" /> : <ShoppingCart className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{toast.title}</p>
        <p className="truncate text-xs text-muted-foreground">{toast.subtitle}</p>
        <Button size="sm" variant="link" className="h-auto px-0 text-xs" onClick={onView}>
          Ver pedido
        </Button>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Descartar notificación"
        className="size-6 shrink-0"
        onClick={onDismiss}
      >
        <X className="size-3.5" />
      </Button>
    </motion.div>
  );
}

/** Toasts propios del panel (glass, top-right). Fuera de /orders cubre el
 * NotificationToaster global — OrdersView suprime el prefijo `order.`. */
export function OrdersToaster({ onViewOrder }: { onViewOrder: (orderId: string) => void }) {
  const toasts = useOrdersStore((s) => s.toasts);
  const dismissToast = useOrdersStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none absolute top-4 right-4 z-40 flex flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onView={() => {
              dismissToast(toast.id);
              onViewOrder(toast.order_id);
            }}
            onDismiss={() => dismissToast(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
