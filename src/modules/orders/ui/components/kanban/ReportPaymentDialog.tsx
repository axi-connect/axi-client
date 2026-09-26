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
import { PriceInput } from "@/shared/components/features/price-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { cn } from "@/core/lib/utils";
import { formatMoney, orderNumberLabel, type OrderRow } from "@/modules/orders/domain/order";
import { reportPayment } from "@/modules/orders/infrastructure/services/order-payments-service.adapter";
// El dueño del recurso es el slice payments: se consume por su barrel (§3.3).
import { listPaymentMethods, type PaymentMethodDTO } from "@/modules/payments/public";
import { useOrdersStore } from "@/modules/orders/infrastructure/stores/orders.store";

/**
 * Registro manual de pago (operador): método configurado del tenant, monto,
 * referencia y nota. El pedido pasa a `payment_reported` — la verificación
 * sigue siendo un paso humano aparte.
 *
 * QA real F3: el monto se lee con el MISMO `PriceInput` + `parseMoneyToCents`
 * que la verificación («1.000.000» es un millón, no NaN), un monto que no se
 * entiende frena el envío con mensaje en vez de mandarse vacío, y se propone
 * el SALDO, no el total: tras un abono nadie paga otra vez el pedido entero.
 *
 * Cobros premium P4: con plan de pagos, el rail pasa la cuota que toca y el
 * reparto. Aparecen los atajos «La cuota», «Otro monto» y «Todo», se propone
 * la cuota y se ve cómo caería el abono en las cuotas antes de registrarlo.
 * Sin plan (el kanban, un pedido de contado) el diálogo es el de siempre.
 */
export function ReportPaymentDialog({
  order,
  onOpenChange,
  installment,
  allocation,
}: {
  order: OrderRow | null;
  onOpenChange: (open: boolean) => void;
  /** La cuota que toca: su nombre y lo que le falta. */
  installment?: { label: string; cents: number } | null;
  /** Cómo se repartiría el monto escrito (lo pinta collections). */
  allocation?: (amountCents: number | null) => React.ReactNode;
}) {
  const refreshOrder = useOrdersStore((s) => s.refreshOrder);
  const fetchStats = useOrdersStore((s) => s.fetchStats);
  const { showAlert } = useAlert();

  const [methods, setMethods] = useState<PaymentMethodDTO[]>([]);
  const [methodId, setMethodId] = useState<string>("");
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [custom, setCustom] = useState(false);
  const suggested = installment != null && installment.cents > 0 ? installment : null;

  useEffect(() => {
    if (order === null) return;
    setCustom(false);
    setAmountCents(suggested !== null ? suggested.cents : order.balance_cents > 0 ? order.balance_cents : null);
    setAmountInvalid(false);
    listPaymentMethods()
      .then((res) => setMethods(res.data.filter((method) => method.is_active)))
      .catch(() => setMethods([]));
    // La cuota sugerida solo decide el valor inicial; cambiarla no pisa lo escrito.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order]);

  if (order === null) return null;

  const shortcut: "installment" | "custom" | "all" | null =
    suggested === null
      ? null
      : custom
        ? "custom"
        : amountCents === suggested.cents
          ? "installment"
          : amountCents === order.balance_cents
            ? "all"
            : "custom";
  const shortcuts =
    suggested === null
      ? []
      : ([
          { key: "installment", label: `${suggested.label} · ${formatMoney(suggested.cents, order.currency)}` },
          { key: "custom", label: "Otro monto" },
          { key: "all", label: `Todo · ${formatMoney(order.balance_cents, order.currency)}` },
        ] as const);

  function pick(key: "installment" | "custom" | "all") {
    if (order === null) return;
    setAmountInvalid(false);
    if (key === "custom") {
      setCustom(true);
      document.getElementById("payment-amount")?.focus();
      return;
    }
    setCustom(false);
    setAmountCents(key === "installment" && suggested !== null ? suggested.cents : order.balance_cents);
  }

  async function submit() {
    if (order === null || amountInvalid) return;
    setSubmitting(true);
    try {
      await reportPayment(order.id, {
        payment_method_id: methodId !== "" ? methodId : undefined,
        amount_cents: amountCents !== null && amountCents > 0 ? amountCents : undefined,
        reference: reference.trim() !== "" ? reference.trim() : undefined,
      });
      await Promise.all([refreshOrder(order.id), fetchStats()]);
      onOpenChange(false);
      // §9.4: el título dice qué pasó; el monto y el medio van al cuerpo.
      const method = methods.find((one) => one.id === methodId)?.label;
      showAlert({
        tone: "success",
        title: "Pago registrado",
        description:
          amountCents !== null && amountCents > 0
            ? `${formatMoney(amountCents, order.currency)}${method !== undefined ? ` por ${method}` : ""}. Queda por verificar.`
            : "Sin monto: quien lo verifique escribe la cifra que ve en el banco.",
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo registrar el pago",
        description: errorMessage(err),
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
            {order.paid_cents > 0 ? ` · saldo ${formatMoney(order.balance_cents, order.currency)}` : ""}
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

          {shortcuts.length > 0 ? (
            <div role="group" aria-label="Cuánto pagó" className="flex flex-wrap gap-1.5">
              {shortcuts.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  aria-pressed={shortcut === option.key}
                  onClick={() => pick(option.key)}
                  className={cn(
                    "h-9 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    shortcut === option.key
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card hover:bg-accent",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payment-amount">Monto</Label>
              <PriceInput
                id="payment-amount"
                value={amountCents}
                currency={order.currency}
                aria-invalid={amountInvalid}
                onChange={(cents) => {
                  setAmountCents(cents);
                  if (suggested !== null) setCustom(true);
                }}
                onInvalidChange={setAmountInvalid}
              />
              {amountInvalid ? (
                <p role="alert" className="text-xs text-destructive">
                  No entendí el monto. Escríbelo como 1.000.000 o 1000000.
                </p>
              ) : amountCents !== null && order.balance_cents > 0 && amountCents > order.balance_cents ? (
                // Más que el saldo: se puede reportar (el cliente pagó de más),
                // pero se dice lo que pasará al verificar (QA real F3).
                <p className="text-xs text-foreground tabular-nums">
                  = {formatMoney(amountCents, order.currency)} · son{" "}
                  {formatMoney(amountCents - order.balance_cents, order.currency)} más que el saldo; al
                  verificar tendrás que aceptar el sobrepago.
                </p>
              ) : amountCents !== null && amountCents > 0 ? (
                // Lo que se va a registrar, en la moneda del pedido: en USD, «350.00»
                // se lee como 35.000 (el punto es de miles) y aquí se ve ANTES de enviar.
                <p className="text-xs text-muted-foreground tabular-nums">
                  = {formatMoney(amountCents, order.currency)}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Vacío si el cliente no dijo cuánto.</p>
              )}
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

          {allocation !== undefined && !amountInvalid ? allocation(amountCents) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Volver
          </Button>
          <Button onClick={() => void submit()} disabled={submitting || amountInvalid}>
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Registrar pago
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
