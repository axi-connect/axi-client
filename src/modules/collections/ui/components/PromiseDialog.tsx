"use client";

import { useEffect, useMemo, useState } from "react";
import { Handshake, LoaderCircle, TriangleAlert } from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
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
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Textarea } from "@/shared/components/ui/textarea";
import type { PlanDetailDTO } from "@/modules/collections/domain/payment-plan";
import {
  dateChips,
  isoDay,
  PROMISE_NOTE_MAX,
  suggestedPromiseCents,
  type DateChip,
} from "@/modules/collections/domain/promise";
import {
  getPlanByOrder,
  recordPromise,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";

/**
 * «Le pago el 22» (F4b del programa Cobros).
 *
 * Una promesa es una frase con fecha, no un formulario: cuándo (chips que se
 * entienden, con su fecha real debajo), cuánto (opcional, con lo que falta de
 * la cuota vencida propuesto) y una nota para el equipo. Y ANTES de anotarla
 * el diálogo dice lo que pasará: los recordatorios se pausan hasta ese día y,
 * si pasa sin pago, la promesa se marca rota y vuelven solos. Escribirle a
 * mano sigue permitido siempre.
 *
 * Carga el plan del pedido como `SendReminderDialog`: quien lo abre solo sabe
 * el pedido y el nombre.
 */
export function PromiseDialog({
  orderId,
  contactName,
  open,
  onOpenChange,
  onDone,
}: {
  orderId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tras anotar (o al saber que ya había una viva): el que abrió relee. */
  onDone?: () => void;
}) {
  const { showAlert } = useAlert();
  const [plan, setPlan] = useState<PlanDetailDTO | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const chips = useMemo(() => dateChips(), []);
  const [chip, setChip] = useState<DateChip["key"]>("in3");
  const [otherDate, setOtherDate] = useState("");
  const [amountCents, setAmountCents] = useState<number | null>(null);
  const [amountInvalid, setAmountInvalid] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPlan(null);
    setLoadFailed(false);
    setChip("in3");
    setOtherDate("");
    setNote("");
    setError(null);
    getPlanByOrder(orderId)
      .then((loaded) => {
        if (!alive) return;
        setPlan(loaded);
        setAmountCents(suggestedPromiseCents(loaded));
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [open, orderId]);

  const promisedAt =
    chip === "other"
      ? otherDate
      : (chips.find((one) => one.key === chip)?.date ?? "");
  const today = isoDay(new Date());
  const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(promisedAt) && promisedAt > today;
  const canSubmit = plan !== null && dateOk && !amountInvalid && !submitting;

  async function submit() {
    if (plan === null || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordPromise(plan.id, {
        promised_at: promisedAt,
        ...(amountCents !== null && amountCents > 0
          ? { amount_cents: amountCents }
          : {}),
        ...(note.trim() !== "" ? { note: note.trim() } : {}),
      });
      onOpenChange(false);
      onDone?.();
      showAlert({
        tone: "success",
        title: "Promesa anotada",
        description: `Para el ${formatShortDate(promisedAt)}. Los recordatorios quedan en pausa hasta ese día.`,
      });
    } catch (caught) {
      if (isHttpError(caught) && caught.is(API_ERROR_CODES.promiseExists)) {
        // Alguien la anotó antes: no es un error de quien está aquí.
        onOpenChange(false);
        onDone?.();
        showAlert({
          tone: "info",
          title: "Ya hay una promesa viva",
          description: errorMessage(caught),
        });
      } else {
        setError(errorMessage(caught, "No se pudo anotar la promesa"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Handshake aria-hidden="true" className="size-5 text-info" />
            Anotar promesa de pago
          </DialogTitle>
          <DialogDescription>
            {contactName}
            {plan !== null ? (
              <>
                {" · "}
                <span className="tabular-nums">
                  debe {formatMoney(plan.balance_cents, plan.currency)}
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {plan === null && !loadFailed ? (
          <div
            className="space-y-3"
            role="status"
            aria-label="Cargando el plan"
          >
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : loadFailed ? (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden="true" />
            <AlertDescription>
              <span>No se pudo cargar el plan de pagos de este pedido.</span>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                ¿Cuándo dijo que paga?
              </legend>
              <div
                role="radiogroup"
                aria-label="Fecha prometida"
                className="flex flex-wrap gap-2"
              >
                {chips.map((one) => (
                  <button
                    key={one.key}
                    type="button"
                    role="radio"
                    aria-checked={chip === one.key}
                    onClick={() => setChip(one.key)}
                    className={cn(
                      "rounded-full border border-border bg-background px-3.5 py-1.5 text-left text-[13px] transition-colors",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      chip === one.key &&
                        "border-transparent bg-accent font-medium",
                    )}
                  >
                    <span className="block">{one.label}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">
                      {one.date === null ? "elegir" : formatShortDate(one.date)}
                    </span>
                  </button>
                ))}
              </div>
              {chip === "other" ? (
                <Input
                  type="date"
                  aria-label="Otra fecha"
                  min={today}
                  value={otherDate}
                  onChange={(event) => setOtherDate(event.target.value)}
                  className="max-w-[200px]"
                />
              ) : null}
              {chip === "other" && otherDate !== "" && !dateOk ? (
                <p className="text-xs text-destructive">
                  La fecha tiene que ser posterior a hoy.
                </p>
              ) : null}
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="promise-amount">
                Cuánto{" "}
                <span className="font-normal text-muted-foreground">
                  · opcional
                </span>
              </Label>
              <PriceInput
                id="promise-amount"
                value={amountCents}
                currency={plan?.currency ?? "COP"}
                aria-invalid={amountInvalid}
                onChange={setAmountCents}
                onInvalidChange={setAmountInvalid}
              />
              {amountInvalid ? (
                <p role="alert" className="text-xs text-destructive">
                  No entendí el monto. Escríbelo como 1.000.000 o 1000000.
                </p>
              ) : plan !== null ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-border px-3 py-1 text-xs",
                      amountCents === suggestedPromiseCents(plan) &&
                        "border-transparent bg-accent font-medium",
                    )}
                    onClick={() => setAmountCents(suggestedPromiseCents(plan))}
                  >
                    Lo que falta de la cuota ·{" "}
                    {formatMoney(suggestedPromiseCents(plan), plan.currency)}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "rounded-full border border-border px-3 py-1 text-xs",
                      amountCents === plan.balance_cents &&
                        "border-transparent bg-accent font-medium",
                    )}
                    onClick={() => setAmountCents(plan.balance_cents)}
                  >
                    Todo el saldo ·{" "}
                    {formatMoney(plan.balance_cents, plan.currency)}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="promise-note">
                Nota para el equipo{" "}
                <span className="font-normal text-muted-foreground">
                  · opcional
                </span>
              </Label>
              <Textarea
                id="promise-note"
                value={note}
                maxLength={PROMISE_NOTE_MAX}
                placeholder="Ej. cobra el 20 y paga ese mismo día"
                onChange={(event) => setNote(event.target.value)}
              />
              <p className="text-right text-[11.5px] text-muted-foreground tabular-nums">
                {note.length} / {PROMISE_NOTE_MAX}
              </p>
            </div>

            <Alert variant="info">
              <Handshake aria-hidden="true" />
              <AlertDescription>
                <span>
                  Mientras la promesa esté viva, los recordatorios automáticos
                  quedan{" "}
                  <b className="font-medium text-foreground">
                    en pausa
                    {dateOk ? ` hasta el ${formatShortDate(promisedAt)}` : ""}
                  </b>
                  . Si ese día pasa sin pago, la promesa se marca{" "}
                  <b className="font-medium text-foreground">rota</b> y los
                  recordatorios vuelven solos. Escribirle a mano sigue permitido
                  siempre.
                </span>
              </AlertDescription>
            </Alert>
          </>
        )}

        {error !== null ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Volver
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Handshake className="size-4" />
            )}
            Anotar promesa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
