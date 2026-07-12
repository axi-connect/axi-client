"use client";

import { useEffect, useState } from "react";
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { formatMoney, orderNumberLabel, type OrderRow } from "@/modules/orders/domain/order";
import {
  listPaymentMethods,
  reportPayment,
  type PaymentMethodDTO,
} from "@/modules/orders/infrastructure/services/order-payments-service.adapter";
import { useOrdersStore } from "@/modules/orders/infrastructure/stores/orders.store";

/**
 * Registro manual de pago (operador): método configurado del tenant, monto,
 * referencia y nota. El pedido pasa a `payment_reported` — la verificación
 * sigue siendo un paso humano aparte.
 */
export function ReportPaymentDialog({
  order,
  onOpenChange,
}: {
  order: OrderRow | null;
  onOpenChange: (open: boolean) => void;
}) {
  const refreshOrder = useOrdersStore((s) => s.refreshOrder);
  const fetchStats = useOrdersStore((s) => s.fetchStats);
  const { showAlert } = useAlert();

  const [methods, setMethods] = useState<PaymentMethodDTO[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order === null) return;
    setAmount(String(order.total_cents / 100));
    listPaymentMethods()
      .then((res) => setMethods(res.data.filter((method) => method.is_active)))
      .catch(() => setMethods([]));
  }, [order]);

  if (order === null) return null;

  async function submit() {
    if (order === null) return;
    setSubmitting(true);
    try {
      const amountCents = Math.round(Number(amount.replace(",", ".")) * 100);
      await reportPayment(order.id, {
        payment_method_id: methodId !== "" ? methodId : undefined,
        amount_cents: Number.isFinite(amountCents) && amountCents > 0 ? amountCents : undefined,
        reference: reference.trim() !== "" ? reference.trim() : undefined,
      });
      await Promise.all([refreshOrder(order.id), fetchStats()]);
      onOpenChange(false);
      showAlert({ tone: "success", title: "Pago registrado", open: true, autoCloseMs: 3000 });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo registrar el pago",
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
          <DialogTitle>Registrar pago · {orderNumberLabel(order.order_number)}</DialogTitle>
          <DialogDescription>
            {order.contact_name} · total {formatMoney(order.total_cents, order.currency)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Medio de pago</Label>
            <Select value={methodId} onValueChange={setMethodId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un medio de pago" />
              </SelectTrigger>
              <SelectContent>
                {methods.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Monto</Label>
              <Input
                id="payment-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payment-reference">Referencia</Label>
              <Input
                id="payment-reference"
                placeholder="N° de transacción"
                maxLength={120}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
