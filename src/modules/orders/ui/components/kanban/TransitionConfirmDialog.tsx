"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { formatMoney, orderNumberLabel, type OrderRow } from "@/modules/orders/domain/order";
import {
  useOrdersStore,
  type TransitionAction,
} from "@/modules/orders/infrastructure/stores/orders.store";

export type TransitionRequest = { order: OrderRow; action: TransitionAction };

const COPY: Record<TransitionAction, { title: string; cta: string; description: string }> = {
  confirm: {
    title: "Confirmar pedido",
    cta: "Confirmar pedido",
    description: "Se descuenta el inventario de los productos del pedido.",
  },
  fulfill: {
    title: "Marcar como entregado",
    cta: "Marcar entregado",
    description: "El pedido queda cerrado como entregado.",
  },
  cancel: {
    title: "Cancelar pedido",
    cta: "Cancelar pedido",
    description: "Si el pedido estaba confirmado, el inventario se repone.",
  },
};

/**
 * Confirmación de transición (drop del kanban, menú o detalle) con el toggle
 * "Notificar al cliente" (mockup: dialog glass con CTA de ancho protagonista).
 * Cancelar usa `destructive` — el coral es acción positiva (DESIGN §3.4).
 */
export function TransitionConfirmDialog({
  request,
  onOpenChange,
}: {
  request: TransitionRequest | null;
  onOpenChange: (open: boolean) => void;
}) {
  const transition = useOrdersStore((s) => s.transition);
  const { showAlert } = useAlert();
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (request === null) return null;
  const { order, action } = request;
  const copy = COPY[action];
  const destructive = action === "cancel";

  async function submit() {
    if (request === null) return;
    setSubmitting(true);
    const result = await transition(request.order.id, request.action, {
      notify_customer: notifyCustomer,
      reason: request.action === "cancel" && reason.trim().length > 0 ? reason.trim() : undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      onOpenChange(false);
      setReason("");
      setNotifyCustomer(true);
    } else {
      showAlert({
        tone: "error",
        title: "No se pudo completar la acción",
        description: result.message,
        open: true,
      });
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {copy.title} {orderNumberLabel(order.order_number)}
          </DialogTitle>
          <DialogDescription>
            {order.contact_name} · {formatMoney(order.total_cents, order.currency)}.{" "}
            {copy.description}
          </DialogDescription>
        </DialogHeader>

        {destructive ? (
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Motivo (opcional)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              maxLength={500}
              placeholder="Ej. el cliente desistió de la compra"
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}

        <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
          <Label htmlFor="notify-customer" className="text-sm">
            Notificar al cliente por WhatsApp
          </Label>
          <Switch
            id="notify-customer"
            checked={notifyCustomer}
            onCheckedChange={setNotifyCustomer}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {copy.cta}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
