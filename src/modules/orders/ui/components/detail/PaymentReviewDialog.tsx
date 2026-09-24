"use client";

import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useEffect, useState } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
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
import { PriceInput } from "@/shared/components/features/price-input";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  formatMoney,
  PAYMENT_STATE_LABELS,
  type OrderDTO,
  type OrderPaymentDTO,
} from "@/modules/orders/domain/order";
import { reviewPayment } from "@/modules/orders/infrastructure/services/order-payments-service.adapter";

export type PaymentReview = { payment: OrderPaymentDTO; action: "verify" | "reject" };

/**
 * Verificación humana del pago (F3 del programa Cobros).
 *
 * Deja de ser un formulario: el monto es obligatorio —de él salen el saldo del
 * cliente y, con planes de pago, sus cuotas— y debajo se ve en qué queda el
 * pedido ANTES de confirmar. Un abono lo deja `confirmed` + `partially_paid`;
 * solo el saldo lo cierra. Rechazar usa `destructive` (nunca coral, DESIGN §3.4).
 */
export function PaymentReviewDialog({
  orderId,
  order,
  review,
  onOpenChange,
  onDone,
}: {
  orderId: string;
  /** El pedido en curso: de aquí salen el saldo y la moneda. */
  order: OrderDTO | null;
  review: PaymentReview | null;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const { showAlert } = useAlert();
  const [notes, setNotes] = useState("");
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [acceptOverpayment, setAcceptOverpayment] = useState(false);
  const [touched, setTouched] = useState(false);

  const payment = review?.payment ?? null;
  const verifying = review?.action === "verify";
  const currency = order?.currency ?? payment?.currency ?? "COP";
  const balance = order?.balance_cents ?? 0;

  // El pago suele traer su monto (lo dijo quien lo reportó). Si NO lo trae, no
  // se propone nada: precargar el saldo convertía un monto mal escrito al
  // reportar en un «Pagado» sin rastro (QA real F3); el operador escribe la
  // cifra que ve en el banco, y «Usar el saldo completo» sigue a un clic.
  //
  // El efecto se ancla al PAGO, no al saldo: el saldo se repinta en vivo cuando
  // otro operador verifica un pago del mismo pedido, y tenerlo en las
  // dependencias le borraba a este lo que estaba escribiendo y le bajaba el
  // interruptor del sobrepago a media revisión. El saldo sigue actualizándose
  // en el texto de apoyo; lo que no puede es reiniciar el formulario.
  const paymentId = payment?.id ?? null;
  useEffect(() => {
    if (paymentId === null) return;
    setAmountCents(payment?.amount_cents ?? null);
    setAcceptOverpayment(false);
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- el saldo se lee al abrir, no re-suscribe
  }, [paymentId]);

  if (review === null || payment === null) return null;

  const amount = amountCents ?? 0;
  const missing = verifying && amount <= 0;
  const excess = Math.max(0, amount - balance);
  const willBePaid = amount >= balance;
  // Solo VERIFICAR es una decisión de dinero: rechazar un reporte mayor que el
  // saldo no puede quedarse mudo porque «sobra» (QA real F3).
  const blocked = verifying && (missing || (excess > 0 && !acceptOverpayment));
  const unreported = payment.amount_cents === null;

  async function submit() {
    if (review === null) return;
    setTouched(true);
    if (blocked) return;
    setSubmitting(true);
    try {
      await reviewPayment(orderId, review.payment.id, {
        action: review.action,
        notes: notes.trim() !== "" ? notes.trim() : undefined,
        notify_customer: notifyCustomer,
        ...(review.action === "verify"
          ? {
              amount_cents: amount,
              ...(excess > 0 ? { accept_overpayment: true } : {}),
            }
          : {}),
      });
      onOpenChange(false);
      setNotes("");
      onDone();
      // §9.4: el título dice qué pasó; la cifra va al cuerpo.
      showAlert({
        tone: verifying ? "success" : "info",
        title: verifying ? (willBePaid ? "Pago verificado" : "Abono verificado") : "Pago rechazado",
        ...(verifying
          ? {
              description: willBePaid
                ? "El pedido quedó pagado."
                : `Faltan ${formatMoney(balance - amount, currency)} para completar el pedido.`,
            }
          : {}),
      });
    } catch (err) {
      // El backend revalida el saldo bajo su propio lock: si otro operador
      // verificó mientras tanto, este monto puede haber dejado de caber.
      const stale = isHttpError(err) && err.is(API_ERROR_CODES.paymentExceedsBalance);
      showAlert({
        tone: "error",
        title: stale ? "El saldo cambió mientras revisabas" : "No se pudo verificar",
        description: stale
          ? "Otro pago se verificó antes que este. Cierra y vuelve a abrirlo para ver el saldo real."
          : errorMessage(err),
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
            {payment.reference !== null ? ` · Ref. ${payment.reference}` : ""}
            {verifying ? "" : ". El pedido vuelve a su estado anterior."}
          </DialogDescription>
        </DialogHeader>

        {verifying ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="review-amount">Monto verificado</Label>
              <PriceInput
                id="review-amount"
                value={amountCents}
                currency={currency}
                aria-invalid={touched && blocked}
                onChange={(cents) => {
                  setAmountCents(cents);
                  setTouched(true);
                }}
              />
              {unreported && amountCents === null && !(touched && missing) ? (
                // §9.4: un estado que dura mientras falte la cifra es `Alert`, no texto ámbar (≈3:1).
                <Alert variant="warning">
                  <TriangleAlert aria-hidden="true" />
                  <AlertDescription>
                    <span>El cliente no indicó monto: escribe el que ves en el banco.</span>
                  </AlertDescription>
                </Alert>
              ) : null}
              {touched && missing ? (
                <p className="text-sm text-destructive">
                  Escribe cuánto estás verificando. De esa cifra sale el saldo del cliente.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    Saldo del pedido: {formatMoney(balance, currency)}
                  </span>
                  {amount !== balance && balance > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() => {
                        setAmountCents(balance);
                        setTouched(true);
                      }}
                    >
                      Usar el saldo completo
                    </Button>
                  ) : null}
                </div>
              )}
            </div>

            {excess > 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Aceptar el pago de más</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Son {formatMoney(excess, currency)} por encima del saldo.
                  </p>
                </div>
                <Switch
                  checked={acceptOverpayment}
                  aria-label="Aceptar el pago de más"
                  onCheckedChange={setAcceptOverpayment}
                />
              </div>
            ) : null}

            {!missing ? (
              <div className="rounded-xl bg-secondary px-3.5 py-3">
                <p className="text-xs text-muted-foreground">Después de verificar</p>
                <div className="mt-2 flex items-baseline justify-between gap-3 text-sm">
                  <span>Cobrado</span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney((order?.paid_cents ?? 0) + amount, currency)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3 text-sm text-muted-foreground">
                  <span>{excess > 0 ? "Sobra" : "Falta"}</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(excess > 0 ? excess : balance - amount, currency)}
                  </span>
                </div>
                <p className="mt-2.5 flex items-center gap-2 border-t border-border/60 pt-2.5 text-xs">
                  {willBePaid ? (
                    <CircleCheck aria-hidden="true" className="size-4 shrink-0 text-success" />
                  ) : (
                    <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-warning" />
                  )}
                  <span>
                    El pedido queda{" "}
                    <strong className="font-medium">
                      {willBePaid ? PAYMENT_STATE_LABELS.paid : `Confirmado · ${PAYMENT_STATE_LABELS.partially_paid}`}
                    </strong>
                    {willBePaid ? "." : ". Se cierra cuando el saldo llegue a cero."}
                  </span>
                </p>
              </div>
            ) : null}
          </>
        ) : null}

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
            disabled={submitting || (verifying && blocked)}
          >
            {submitting ? <LoaderCircle className="size-4 animate-spin" /> : null}
            {verifying ? `Verificar ${formatMoney(amount, currency)}` : "Rechazar pago"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
