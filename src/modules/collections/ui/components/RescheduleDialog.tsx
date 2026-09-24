"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  LoaderCircle,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";

import { API_ERROR_CODES, isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatMoneyExact } from "@/core/lib/format";
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
import { PriceInput } from "@/shared/components/features/price-input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { PlanDetailDTO } from "@/modules/collections/domain/payment-plan";
import {
  pendingSchedule,
  scheduleCheck,
  type ScheduleLine,
} from "@/modules/collections/domain/promise";
import {
  getPlanByOrder,
  reschedulePlan,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";

/**
 * Reprogramar las cuotas (F4b; el diseño viene del mockup aprobado de F4).
 *
 * Solo lo pendiente: lo ya pagado no se toca. La regla del servidor —las
 * cuotas pendientes tienen que sumar exactamente el saldo— se comprueba
 * mientras se escribe y se dice ANTES de perder el trabajo; el 409
 * `schedule_mismatch` vuelve con las cifras del servidor si algo cambió
 * mientras tanto.
 */
export function RescheduleDialog({
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
  onDone?: () => void;
}) {
  const { showAlert } = useAlert();
  const [plan, setPlan] = useState<PlanDetailDTO | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [lines, setLines] = useState<ScheduleLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPlan(null);
    setLoadFailed(false);
    setServerError(null);
    getPlanByOrder(orderId)
      .then((loaded) => {
        if (!alive) return;
        setPlan(loaded);
        setLines(pendingSchedule(loaded));
      })
      .catch(() => {
        if (alive) setLoadFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [open, orderId]);

  const balance = plan?.balance_cents ?? 0;
  const check = scheduleCheck(lines, balance);
  const paidCount =
    plan?.installments.filter(
      (one) => one.status === "paid" || one.status === "waived",
    ).length ?? 0;

  // La diferencia a la última cuota: cubre los planes que nacieron con
  // centavos (antes de ed9abd83) y cualquier descuadre pequeño del operador.
  const lastLine = lines[lines.length - 1];
  const canAdjustLast =
    lastLine !== undefined &&
    check.diff !== 0 &&
    lastLine.amount_cents + check.diff > 0;
  function adjustLast() {
    if (lastLine === undefined) return;
    update(lines.length - 1, {
      amount_cents: lastLine.amount_cents + check.diff,
    });
  }

  function update(index: number, patch: Partial<ScheduleLine>) {
    setLines((current) =>
      current.map((line, at) => (at === index ? { ...line, ...patch } : line)),
    );
    setServerError(null);
  }

  async function submit() {
    if (plan === null || !check.valid || submitting) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await reschedulePlan(plan.id, lines);
      onOpenChange(false);
      onDone?.();
      showAlert({
        tone: "success",
        title: "Cuotas reprogramadas",
        description: `${String(lines.length)} ${lines.length === 1 ? "cuota pendiente" : "cuotas pendientes"} que suman ${formatMoney(balance, plan.currency)}.`,
      });
    } catch (caught) {
      // El servidor revalida contra el saldo de AHORA: si un pago entró
      // mientras tanto, las cifras que manda son las buenas.
      setServerError(
        isHttpError(caught) && caught.is(API_ERROR_CODES.scheduleMismatch)
          ? errorMessage(caught)
          : errorMessage(caught, "No se pudieron reprogramar las cuotas"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <CalendarClock aria-hidden="true" className="size-5 text-info" />
            Reprogramar cuotas
          </DialogTitle>
          <DialogDescription>
            {contactName} · solo lo pendiente
            {paidCount > 0
              ? `; ${String(paidCount)} ${paidCount === 1 ? "cuota pagada no se toca" : "cuotas pagadas no se tocan"}`
              : ""}
            .
          </DialogDescription>
        </DialogHeader>

        {plan === null && !loadFailed ? (
          <div
            className="space-y-3"
            role="status"
            aria-label="Cargando el plan"
          >
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
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
            <ol className="m-0 list-none divide-y divide-border/60 p-0">
              {lines.map((line, index) => (
                <li
                  key={index}
                  className="grid grid-cols-[20px_minmax(0,1fr)_150px_32px] items-center gap-3 py-2.5"
                >
                  <span className="text-center text-xs text-muted-foreground tabular-nums">
                    {paidCount + index + 1}
                  </span>
                  <Input
                    type="date"
                    aria-label={`Fecha de la cuota ${String(paidCount + index + 1)}`}
                    value={line.due_at}
                    onChange={(event) =>
                      update(index, { due_at: event.target.value })
                    }
                  />
                  <PriceInput
                    value={line.amount_cents}
                    currency={plan?.currency ?? "COP"}
                    aria-invalid={line.amount_cents <= 0}
                    onChange={(cents) =>
                      update(index, { amount_cents: cents ?? 0 })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-full text-muted-foreground"
                    aria-label={`Quitar la cuota ${String(paidCount + index + 1)}`}
                    disabled={lines.length <= 1}
                    onClick={() => {
                      setLines((current) =>
                        current.filter((_, at) => at !== index),
                      );
                      setServerError(null);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ol>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit rounded-full"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  {
                    due_at: current[current.length - 1]?.due_at ?? "",
                    amount_cents: Math.max(0, check.diff),
                  },
                ])
              }
            >
              <Plus className="size-3.5" /> Añadir cuota
            </Button>

            {check.valid ? (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-3.5 py-3 text-sm">
                <span>Las cuotas pendientes cuadran con el saldo</span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(balance, plan?.currency ?? "COP")}
                </span>
              </div>
            ) : (
              <Alert variant="destructive">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>
                  <span className="tabular-nums">
                    {check.diff !== 0 ? (
                      // Exacto: con centavos de por medio, «Faltan $ 0» sería
                      // una mentira con el botón bloqueado (QA real F4b).
                      <>
                        Suman{" "}
                        {formatMoneyExact(check.sum, plan?.currency ?? "COP")} y
                        el saldo es{" "}
                        {formatMoneyExact(balance, plan?.currency ?? "COP")}.{" "}
                        <b className="font-medium">
                          {check.diff > 0 ? "Faltan" : "Sobran"}{" "}
                          {formatMoneyExact(
                            Math.abs(check.diff),
                            plan?.currency ?? "COP",
                          )}
                        </b>
                        .
                        {canAdjustLast ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2 flex w-fit rounded-full"
                            onClick={adjustLast}
                          >
                            Ajustar la última cuota
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      "Cada cuota necesita una fecha y un monto mayor que cero."
                    )}
                  </span>
                </AlertDescription>
              </Alert>
            )}
            {serverError !== null ? (
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            ) : null}
            <p className="text-xs leading-relaxed text-muted-foreground">
              Desde que se reprograma a mano, mover la fecha de la salida ya no
              recalcula el saldo final solo: lo que pactó una persona no lo pisa
              un proceso.
            </p>
          </>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Volver
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={plan === null || !check.valid || submitting}
          >
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Guardar cuotas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
