"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarClock,
  Check,
  CircleCheck,
  Handshake,
  MessageCircle,
  StickyNote,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/core/lib/utils";

import { isHttpError } from "@/core/api/problem";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import {
  installmentPending,
  INSTALLMENT_STATUS_LABELS,
  planInstallmentLabel,
  type InstallmentDTO,
  type PlanDetailDTO,
} from "@/modules/collections/domain/payment-plan";
import {
  canPromise,
  canReschedule,
  promiseCard,
  promiseHistory,
  type PromiseTone,
} from "@/modules/collections/domain/promise";
import { daysUntil } from "@/modules/collections/domain/receivable";
import { getPlanByOrder } from "@/modules/collections/infrastructure/services/collections-service.adapter";
import { PlanNoteDialog } from "./PlanNoteDialog";
import { PromiseDialog } from "./PromiseDialog";
import { ReminderHistory } from "./ReminderHistory";
import { RescheduleDialog } from "./RescheduleDialog";
import { SendReminderDialog } from "./SendReminderDialog";

const PROMISE_ICON: Record<
  PromiseTone,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>
> = { info: Handshake, success: CircleCheck, warning: TriangleAlert };

/**
 * El plan de pagos dentro del pedido (F4; calendario con riel en Cobros
 * premium P4).
 *
 * Arriba, «Lo próximo»: la cuota que toca, como isla si el pedido no tiene
 * otra cosa más urgente (un comprobante por revisar es la isla del rail, y
 * hay una por pantalla). Debajo, el calendario vertical —un nodo por cuota
 * unido por el riel— y, al pie, la nota del equipo y de dónde salió el
 * calendario: es la pregunta que sigue a «¿por qué tres cuotas?». Las cifras
 * del pedido (total, cobrado, falta) no se repiten: las dice el bloque de
 * cobro justo encima.
 *
 * Un pedido sin plan no pinta nada. No es un error ni un vacío que explicar:
 * el negocio puede no tener la función, o el pedido puede ser anterior.
 *
 * F4b: la promesa de pago como frase con icono en tres estados (viva,
 * cumplida, rota), su historial bajo las cuotas, la nota del plan al pie y
 * las acciones —anotar promesa, reprogramar, nota— solo con
 * `collections:manage`.
 */
/** Reintentos cuando el plan aún no existe: nace en segundo plano ~0,4 s después de confirmar. */
const PLAN_RETRY_MS = [800, 1600, 3200];

export function PaymentPlanBlock({
  orderId,
  contactName = "el cliente",
  refreshKey,
  onLoaded,
  island = true,
  onRegisterPayment,
}: {
  orderId: string;
  /** Para los diálogos: a quién se le anota o se le escribe. */
  contactName?: string;
  /**
   * Cambia cuando el pedido cambia (su `updated_at`): al confirmar, el plan
   * nace en segundo plano y esta sección tiene que aparecer sin recargar
   * (QA real F5). Con un 404 se reintenta unas veces con espera creciente.
   */
  refreshKey?: string | null;
  /**
   * El plan que se acaba de leer (o `null`): el rail lo usa para saber cuándo
   * se reprogramó y marcar el contrato como desactualizado (QA real F8).
   */
  onLoaded?: (plan: PlanDetailDTO | null) => void;
  /**
   * «Lo próximo» como isla. El rail lo apaga cuando ya muestra la del
   * comprobante por revisar: una isla por pantalla (§9.5).
   */
  island?: boolean;
  /** La acción de la isla; sin ella (sin permiso) la isla solo informa. */
  onRegisterPayment?: () => void;
}) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("collections:manage");
  const [plan, setPlan] = useState<PlanDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<
    "promise" | "reschedule" | "note" | "write" | null
  >(null);
  const [reloads, setReloads] = useState(0);
  const reload = useCallback(() => setReloads((count) => count + 1), []);
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const attempt = (round: number) => {
      getPlanByOrder(orderId)
        .then((result) => {
          if (!alive) return;
          setPlan(result);
          onLoadedRef.current?.(result);
        })
        .catch((error: unknown) => {
          if (!alive) return;
          setPlan(null);
          onLoadedRef.current?.(null);
          // 404 «sin plan» y 403 «sin la función» son el mismo silencio para el
          // operador: esta sección no existe para este pedido, y explicárselo
          // sería ruido. Cualquier OTRA cosa —un 500, la red caída— también deja
          // la sección en blanco, pero al menos deja rastro: si no, el fallo es
          // invisible para él y para nosotros.
          const status = isHttpError(error) ? error.status : 0;
          if (status !== 404 && status !== 403) {
            console.error(
              "No se pudo cargar el plan de pagos del pedido",
              error,
            );
          }
          // Un 404 justo tras confirmar suele ser «todavía no»: el plan lo crea
          // un job en segundo plano. Se vuelve a pedir unas pocas veces.
          const wait = PLAN_RETRY_MS[round];
          if (status === 404 && wait !== undefined) {
            timer = setTimeout(() => attempt(round + 1), wait);
          }
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };
    attempt(0);
    return () => {
      alive = false;
      if (timer !== null) clearTimeout(timer);
    };
  }, [orderId, reloads, refreshKey]);

  if (loading) return <Skeleton className="h-40 w-full rounded-3xl" />;
  if (plan === null) return null;

  const next = plan.installments.find(
    (installment) =>
      installment.status !== "paid" && installment.status !== "waived",
  );
  const card = promiseCard(plan);
  const history = promiseHistory(plan);
  const note = plan.notes[0] ?? null;
  const CardIcon = card === null ? Handshake : PROMISE_ICON[card.tone];

  return (
    <section aria-label="Plan de pagos" className="flex flex-col gap-4">
      {plan.collapsed ? (
        // No hubo tiempo que repartir: se dice, no se disimula (QA real F5).
        <Alert variant="info" className="rounded-2xl">
          <CalendarClock aria-hidden="true" />
          <AlertDescription className="text-[13px] leading-relaxed">
            <span>
              <b className="font-medium text-foreground">
                {plan.service_date !== null
                  ? `La salida es el ${formatShortDate(plan.service_date)}: no hubo tiempo para cuotas.`
                  : "No hubo tiempo para cuotas."}
              </b>{" "}
              Todo vence en un solo pago, sin anticipo, aunque la política del
              negocio reparta en cuotas.
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {next !== undefined && card?.tone !== "info" ? (
        <NextDue
          installment={next}
          label={planInstallmentLabel(next, plan.installments)}
          currency={plan.currency}
          island={island}
          onRegisterPayment={onRegisterPayment}
        />
      ) : null}

      {card !== null ? (
        // §9.4: un estado que dura es Alert en línea; el color va en el icono.
        <Alert variant={card.tone} className="rounded-2xl">
          <CardIcon aria-hidden="true" />
          <AlertDescription className="text-[13px] leading-relaxed">
            <span>
              <b className="font-medium text-foreground">{card.title}</b>{" "}
              {card.detail}
            </span>
            {card.note !== null ? (
              <span className="text-muted-foreground">
                <b className="font-medium text-foreground">Nota:</b> {card.note}
              </span>
            ) : null}
            {canManage && card.actions.length > 0 ? (
              <span className="mt-1 flex flex-wrap gap-2">
                {card.actions.includes("promise_again") ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[30px] rounded-full px-3 text-xs"
                    onClick={() => setDialog("promise")}
                  >
                    <Handshake className="size-3.5" /> Anotar otra promesa
                  </Button>
                ) : null}
                {card.actions.includes("write") ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-[30px] rounded-full px-3 text-xs"
                    onClick={() => setDialog("write")}
                  >
                    <MessageCircle className="size-3.5" /> Escribir
                  </Button>
                ) : null}
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-border bg-card">
        <p className="flex min-h-6 items-center justify-between gap-3 px-5 pt-4 pb-2 text-xs text-muted-foreground">
          Plan de pagos
          {canManage && canReschedule(plan) ? (
            <button
              type="button"
              className="min-h-6 rounded-md text-[13px] font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={() => setDialog("reschedule")}
            >
              Reprogramar
            </button>
          ) : null}
        </p>
        <ol aria-label="Cuotas" className="m-0 list-none px-5 pb-2">
          {plan.installments.map((installment, index) => (
            <InstallmentRow
              key={installment.id}
              installment={installment}
              label={planInstallmentLabel(installment, plan.installments)}
              currency={plan.currency}
              isNext={installment.id === next?.id}
              last={index === plan.installments.length - 1}
            />
          ))}
        </ol>
        {history.length > 0 ? (
          <ul
            aria-label="Historial de promesas"
            className="m-0 list-none border-t border-border/60 p-0"
          >
            {history.map((line) => {
              const Icon = PROMISE_ICON[line.tone];
              return (
                <li
                  key={line.id}
                  className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-[12.5px] text-muted-foreground"
                >
                  <Icon
                    aria-hidden="true"
                    className={`size-3.5 justify-self-center ${
                      line.tone === "success"
                        ? "text-success"
                        : line.tone === "warning"
                          ? "text-warning"
                          : "text-info"
                    }`}
                  />
                  <span>{line.text}</span>
                  <time
                    dateTime={line.at}
                    className="whitespace-nowrap tabular-nums"
                  >
                    {formatShortDate(line.at)}
                  </time>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 border-t border-border/60 px-5 py-3.5 text-[12.5px] leading-relaxed text-muted-foreground">
          <StickyNote
            aria-hidden="true"
            className="mt-0.5 size-3.5 justify-self-center"
          />
          <span>
            {note !== null ? (
              <>
                <b className="font-medium text-foreground">Nota del plan:</b>{" "}
                {note.note}
              </>
            ) : (
              "Sin nota. Lo que el equipo debe saber para cobrar este plan; el cliente no la ve."
            )}
          </span>
          {canManage ? (
            <button
              type="button"
              className="min-h-6 rounded-md font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              onClick={() => setDialog("note")}
            >
              {note !== null ? "Editar" : "Añadir"}
            </button>
          ) : null}
        </div>
      </div>

      {canManage && canPromise(plan) && card?.tone !== "warning" ? (
        <Button
          variant="outline"
          className="h-11 w-full rounded-full"
          onClick={() => setDialog("promise")}
        >
          <Handshake className="size-4" /> Anotar promesa de pago
        </Button>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        {plan.collapsed
          ? "El plan se creó al confirmar el pedido; con la salida encima, la política no tuvo tiempo que repartir. "
          : "El plan se creó al confirmar el pedido, con la política del negocio. "}
        Las cuotas dicen <b className="font-medium text-foreground">cuándo</b>{" "}
        tocaba cada parte; lo cobrado sale del pedido. La promesa y la nota son
        del equipo: el cliente no las ve.
      </p>

      <div>
        <p className="px-1 pb-1 text-[12.5px] text-muted-foreground">
          Historial de avisos
        </p>
        <ReminderHistory
          planId={plan.id}
          settled={plan.status === "settled" || plan.balance_cents <= 0}
        />
      </div>

      {canManage ? (
        <>
          <PromiseDialog
            orderId={orderId}
            contactName={contactName}
            open={dialog === "promise"}
            onOpenChange={(open) => {
              if (!open) setDialog(null);
            }}
            onDone={reload}
          />
          <RescheduleDialog
            orderId={orderId}
            contactName={contactName}
            open={dialog === "reschedule"}
            onOpenChange={(open) => {
              if (!open) setDialog(null);
            }}
            onDone={reload}
          />
          <PlanNoteDialog
            planId={plan.id}
            current={note?.note ?? null}
            open={dialog === "note"}
            onOpenChange={(open) => {
              if (!open) setDialog(null);
            }}
            onDone={reload}
          />
          {dialog === "write" ? (
            <SendReminderDialog
              open
              orderId={orderId}
              contactName={contactName}
              onOpenChange={(open) => {
                if (!open) setDialog(null);
              }}
              onSent={reload}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}

/** «Faltan 6 días» · «Vence hoy» · «Venció hace 3 días»: el hecho que urge la cuota. */
function dueFact(
  installment: InstallmentDTO,
): { label: string; value: string } | null {
  const days = daysUntil(installment.due_at);
  if (days === null) return null;
  if (installment.status === "overdue" || days < 0) {
    const late = Math.abs(days);
    return {
      label: "Venció",
      value:
        late === 0 ? "hoy" : late === 1 ? "ayer" : `hace ${String(late)} días`,
    };
  }
  if (days === 0) return { label: "Vence", value: "hoy" };
  return {
    label: "Faltan",
    value: days === 1 ? "1 día" : `${String(days)} días`,
  };
}

function NextDue({
  installment,
  label,
  currency,
  island,
  onRegisterPayment,
}: {
  installment: InstallmentDTO;
  label: string;
  currency: string;
  island: boolean;
  onRegisterPayment?: () => void;
}) {
  const late = installment.status === "overdue";
  const pending = installmentPending(installment);
  const fact = dueFact(installment);

  if (island) {
    return (
      <InkIsland label="Lo próximo" className="gap-3 p-5">
        <Kicker>Lo próximo</Kicker>
        <p className="font-heading text-xl leading-tight font-bold tracking-tight">
          {label}, el {formatShortDate(installment.due_at)}
        </p>
        <p className="font-heading text-4xl leading-none font-bold tracking-tight whitespace-nowrap tabular-nums">
          {formatMoney(pending, currency)}
        </p>
        <dl className="flex flex-col text-[13px]">
          {fact !== null ? (
            <div className="flex justify-between gap-3 border-t border-border py-2">
              <dt className="text-muted-foreground">{fact.label}</dt>
              <dd className="font-medium">{fact.value}</dd>
            </div>
          ) : null}
          {installment.paid_cents > 0 ? (
            <div className="flex justify-between gap-3 border-t border-border py-2">
              <dt className="text-muted-foreground">Ya abonó</dt>
              <dd className="tabular-nums">
                {formatMoney(installment.paid_cents, currency)} de{" "}
                {formatMoney(installment.amount_cents, currency)}
              </dd>
            </div>
          ) : null}
        </dl>
        {onRegisterPayment !== undefined ? (
          <Button
            variant="contrast"
            className="w-full"
            onClick={onRegisterPayment}
          >
            Registrar el abono
          </Button>
        ) : null}
      </InkIsland>
    );
  }

  return (
    <div className="flex items-center gap-3.5 rounded-2xl bg-muted px-4 py-3.5">
      {late ? (
        // Una alerta, no un avión: en la cartera el avión significa «ya viajó»,
        // que es el OTRO eje. El mismo icono con dos significados a dos
        // pantallas de distancia es una trampa para quien las lee seguidas.
        <TriangleAlert
          aria-hidden="true"
          className="size-[18px] shrink-0 text-destructive"
        />
      ) : (
        <CalendarClock
          aria-hidden="true"
          className="size-[18px] shrink-0 text-muted-foreground"
        />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {late
            ? overdueLabel(Math.abs(daysUntil(installment.due_at) ?? 0))
            : fact === null
              ? "Próxima cuota"
              : fact.label === "Venció"
                ? // Vencida pero aún en la gracia: el estado sigue `pending`.
                  `Venció ${fact.value}`
                : fact.label === "Vence"
                  ? "Vence hoy"
                  : `Próxima cuota en ${fact.value}`}
        </p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground tabular-nums">
          {label} · {formatMoney(pending, currency)} ·{" "}
          {formatShortDate(installment.due_at)}
        </p>
      </div>
    </div>
  );
}

/** El nodo del riel: hecho (check), vencido, el que toca, o por venir. */
const NODE_CLASS = {
  paid: "border-foreground bg-foreground text-background",
  overdue: "border-destructive text-foreground ring-4 ring-destructive/15",
  next: "border-warning text-foreground ring-4 ring-warning/15",
  later: "border-border text-muted-foreground",
} as const;

function InstallmentRow({
  installment,
  label,
  currency,
  isNext,
  last,
}: {
  installment: InstallmentDTO;
  label: string;
  currency: string;
  isNext: boolean;
  last: boolean;
}) {
  const paid = installment.status === "paid";
  const node = paid
    ? NODE_CLASS.paid
    : installment.status === "overdue"
      ? NODE_CLASS.overdue
      : isNext
        ? NODE_CLASS.next
        : NODE_CLASS.later;
  return (
    <li className="relative grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-3 py-3">
      {last ? null : (
        // El riel: une este nodo con el siguiente. Hecho en tinta, por venir en gris.
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-[42px] bottom-[-6px] left-[13px] w-0.5 rounded-full",
            paid ? "bg-foreground" : "bg-border",
          )}
        />
      )}
      <span
        aria-hidden="true"
        className={cn(
          "relative mt-0.5 grid size-7 place-items-center rounded-full border-2 bg-card text-[11px] font-semibold tabular-nums",
          node,
        )}
      >
        {paid ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : (
          installment.seq
        )}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">
          {paid && installment.paid_at !== null ? "Pagada el " : "Vence el "}
          <span className="whitespace-nowrap">
            {formatShortDate(
              paid && installment.paid_at !== null
                ? installment.paid_at
                : installment.due_at,
            )}
          </span>
          {!paid && installment.paid_cents > 0
            ? ` · abonó ${formatMoney(installment.paid_cents, currency)}`
            : null}
        </p>
      </div>
      <p className="text-right text-sm font-semibold whitespace-nowrap tabular-nums">
        {formatMoney(installment.amount_cents, currency)}
        {paid ? null : (
          <span className="mt-0.5 block text-[11.5px] font-normal text-muted-foreground">
            {INSTALLMENT_STATUS_LABELS[installment.status]}
          </span>
        )}
      </p>
    </li>
  );
}

/** «Venció ayer» y no «hace 1 días»: la misma gramática que usa la cartera. */
function overdueLabel(days: number): string {
  if (days <= 0) return "Vencida hoy";
  return days === 1 ? "Venció ayer" : `Venció hace ${String(days)} días`;
}
