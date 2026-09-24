"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
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
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  manualStageOf,
  REMINDER_CHANNEL_LABELS,
  REMINDER_TEMPLATE_LABELS,
  renderReminderPreview,
  type ReminderChannel,
  type ReminderTemplateKey,
} from "@/modules/collections/domain/reminder";
import {
  installmentLabel,
  nextInstallment,
  type PlanDetailDTO,
} from "@/modules/collections/domain/payment-plan";
import {
  getPlanByOrder,
  sendReminder,
} from "@/modules/collections/infrastructure/services/collections-service.adapter";

/**
 * Escribirle AHORA a quien debe, saltándose la cadencia.
 *
 * Lo que el diálogo enseña antes de mandar —y es su razón de ser— es **qué
 * texto va a salir y por qué**. El envío manual salta la cadencia pero NO la
 * fecha de la cuota: a alguien cuya cuota vence dentro de cuatro días no se le
 * manda el texto de mora, que le diría «tienes una cuota pendiente desde el 20
 * de septiembre» con una fecha que todavía no ha llegado. Eso se lee como un
 * cobro agresivo y es, en realidad, un error de programa.
 */
export function SendReminderDialog({
  orderId,
  contactName,
  open,
  onOpenChange,
  onSent,
}: {
  orderId: string;
  contactName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSent?: () => void;
}) {
  const { showAlert } = useAlert();
  const [plan, setPlan] = useState<PlanDetailDTO | null>(null);
  const [body, setBody] = useState("");
  const [channel] = useState<ReminderChannel>("whatsapp");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlan(null);
    getPlanByOrder(orderId)
      .then(setPlan)
      .catch(() => setPlan(null));
  }, [open, orderId]);

  const target = plan === null ? null : nextInstallment(plan);
  const stage = target === null ? null : manualStageOf(target.due_at);

  async function send() {
    if (plan === null || target === null) return;
    setSending(true);
    try {
      const result = await sendReminder(plan.id, {
        installment_id: target.id,
        channel,
        ...(body.trim() === "" ? {} : { body }),
      });
      // `skipped` NO es un error de red: el servidor decidió no mandarlo y hay
      // que decir cuál de las dos cosas pasó, no un «listo» que miente.
      showAlert(
        result.outcome === "queued"
          ? {
              tone: "success",
              title: "Recordatorio enviado",
              autoCloseMs: 3000,
            }
          : {
              tone: "warning",
              title: "No se envió",
              description:
                "El servidor decidió no mandarlo. Queda anotado en el historial del plan con su razón.",
            },
      );
      onSent?.();
      onOpenChange(false);
      setBody("");
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo enviar",
        description: errorMessage(err),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Escribir a {contactName}</DialogTitle>
          <DialogDescription>
            {plan === null || target === null
              ? "Buscando la cuota que toca…"
              : `${installmentLabel(target, plan.installments.length)} · ${formatMoney(
                  target.amount_cents - target.paid_cents,
                  plan.currency,
                )} · vence el ${formatShortDate(target.due_at)}`}
          </DialogDescription>
        </DialogHeader>

        {plan === null ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : target === null ? (
          <p className="text-sm text-muted-foreground">
            Este plan no tiene cuotas pendientes. Escribirle sería pedirle
            dinero a quien no debe.
          </p>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border">
              <InfoRow
                label="Texto que va a salir"
                value={STAGE_LABELS[stage ?? "due_soon"]}
              />
              <InfoRow label="Por" value={REMINDER_CHANNEL_LABELS[channel]} />
            </div>

            <textarea
              rows={4}
              value={body}
              aria-label="Texto del recordatorio"
              placeholder={renderReminderPreview(
                `Hola {{contact_name}}, ${
                  stage === "overdue"
                    ? "tu pedido {{order_number}} tiene una cuota pendiente."
                    : "te recordamos que la cuota {{installment_seq}} vence el {{due_date}}."
                }`,
                {
                  contact_name: contactName,
                  order_number:
                    plan.order_number === null
                      ? "s/n"
                      : `#${String(plan.order_number)}`,
                  installment_seq: String(target.seq),
                  due_date: formatShortDate(target.due_at),
                },
              )}
              onChange={(event) => setBody(event.target.value)}
              className="w-full resize-y rounded-md border border-input bg-background px-2.5 py-2 text-sm leading-relaxed focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20"
            />

            <p className="text-[12.5px] leading-relaxed text-muted-foreground">
              {stage === "overdue" ? (
                <>
                  La cuota{" "}
                  <b className="font-medium text-foreground">ya venció</b>, así
                  que el texto que sale es el de mora.
                </>
              ) : (
                <>
                  La cuota{" "}
                  <b className="font-medium text-foreground">
                    todavía no ha vencido
                  </b>
                  , así que no sale el texto de mora: decirle «tienes una cuota
                  pendiente desde el {formatShortDate(target.due_at)}» a alguien
                  cuya fecha aún no ha llegado se lee como un cobro agresivo.
                </>
              )}{" "}
              Déjalo en blanco para mandar tu plantilla tal cual.
            </p>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => void send()}
            disabled={sending || target === null}
          >
            <Send aria-hidden="true" className="size-4" />
            Enviar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STAGE_LABELS: Record<ReminderTemplateKey, string> = {
  due_soon: `${REMINDER_TEMPLATE_LABELS.due_soon} · aún no vence`,
  due_today: `${REMINDER_TEMPLATE_LABELS.due_today} · vence hoy`,
  overdue: `${REMINDER_TEMPLATE_LABELS.overdue} · ya vencida`,
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative grid min-h-[52px] grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 [&+&]:before:absolute [&+&]:before:inset-x-4 [&+&]:before:top-0 [&+&]:before:h-px [&+&]:before:bg-border/60">
      <span className="text-sm">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
