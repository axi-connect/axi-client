"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
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
import { formatMoney, type OrderPaymentDTO } from "@/modules/orders/domain/order";
import { reviewPayment } from "@/modules/orders/infrastructure/services/order-payments-service.adapter";

export type PaymentReview = { payment: OrderPaymentDTO; action: "verify" | "reject" };

/**
 * Verificación humana del pago: verify → pedido `paid`; reject → vuelve a su
 * estado anterior. Rechazar usa `destructive` (nunca coral, DESIGN §3.4).
 */
export function PaymentReviewDialog({
  orderId,
  review,
  onOpenChange,
  onDone,
}: {
  orderId: string;
  review: PaymentReview | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { showAlert } = useAlert();
  const [notes, setNotes] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  if (review === null) return null;
  const { payment, action } = review;
  const verifying = action === "verify";

  async function submit() {
    if (review === null) return;
    setSubmitting(true);
    try {
      await reviewPayment(orderId, review.payment.id, {
        action: review.action,
        notes: notes.trim() !== "" ? notes.trim() : undefined,
        notify_customer: notifyCustomer,
      });
      onOpenChange(false);
      setNotes("");
      onDone();
      showAlert({
        tone: verifying ? "success" : "info",
        title: verifying ? "Pago verificado: pedido pagado" : "Pago rechazado",
        open: true,
        autoCloseMs: 3000,
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo completar la verificación",
        description: errorMessage(err),
        open: true,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{verifying ? "Verificar pago" : "Rechazar pago"}</DialogTitle>
          <DialogDescription>
            {payment.method_label ?? "Pago"}
            {payment.amount_cents !== null
              ? ` · ${formatMoney(payment.amount_cents, payment.currency)}`
              : ""}
            {payment.reference !== null ? ` · Ref. ${payment.reference}` : ""}
            {verifying
              ? ". El pedido pasa a Pagado."
              : ". El pedido vuelve a su estado anterior."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="review-notes">Nota (opcional)</Label>
          <Textarea
            id="review-notes"
            value={notes}
            maxLength={1000}
            placeholder={verifying ? "Ej. consignación verificada en el banco" : "Ej. el comprobante no corresponde"}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2.5">
          <Label htmlFor="review-notify" className="text-sm">
            Notificar al cliente por WhatsApp
          </Label>
          <Switch id="review-notify" checked={notifyCustomer} onCheckedChange={setNotifyCustomer} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button
            variant={verifying ? "default" : "destructive"}
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {verifying ? "Verificar pago" : "Rechazar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
