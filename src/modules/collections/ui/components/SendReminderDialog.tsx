"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Send } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatMoney, formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
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
  planInstallmentLabel,
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
 *
 * Cobros premium P5: el texto que toca va arriba, en una frase, y el canal se
 * elige con dos tarjetas (patrón F9). Sin datos de alcance del contacto en
 * esta lectura, las tarjetas no prometen nada que el servidor no confirme: si
 * no puede salir, vuelve `skipped` y se dice.
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
  const [channel, setChannel] = useState<ReminderChannel>("whatsapp");
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
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl font-bold tracking-tight">
            Escribir a {contactName}
          </DialogTitle>
          <DialogDescription>
            {plan === null || target === null
              ? "Buscando la cuota que toca…"
              : `${planInstallmentLabel(target, plan.installments)} · ${formatMoney(
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
            <p className="rounded-2xl bg-muted px-4 py-3 text-[13px] leading-relaxed">
              Toca el texto{" "}
              <b className="font-semibold">
                «{REMINDER_TEMPLATE_LABELS[stage ?? "due_soon"]}»
              </b>
              {STAGE_NOTES[stage ?? "due_soon"]}
            </p>

            <div className="flex flex-col gap-2">
              <p id="reminder-body-label" className="text-sm font-semibold">
                Texto que va a salir
              </p>
              <textarea
                rows={4}
                value={body}
                aria-label="Texto del recordatorio"
                aria-describedby="reminder-body-hint"
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
                className="w-full resize-y rounded-2xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed focus:border-primary focus:ring-3 focus:ring-primary/20 focus:outline-none"
              />
              <p
                id="reminder-body-hint"
                className="text-[12.5px] leading-relaxed text-muted-foreground"
              >
                {stage === "overdue" ? (
                  <>
                    La cuota{" "}
                    <b className="font-medium text-foreground">ya venció</b>,
                    así que el texto que sale es el de mora.
                  </>
                ) : (
                  <>
                    La cuota{" "}
                    <b className="font-medium text-foreground">
                      todavía no ha vencido
                    </b>
                    , así que no sale el texto de mora: decirle «tienes una
                    cuota pendiente desde el {formatShortDate(target.due_at)}» a
                    alguien cuya fecha aún no ha llegado se lee como un cobro
                    agresivo.
                  </>
                )}{" "}
                Déjalo en blanco para mandar tu plantilla tal cual; lo que
                escribas vale solo para esta vez.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Por dónde"
              className="grid gap-2"
            >
              {CHANNELS.map((option) => {
                const checked = channel === option.key;
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setChannel(option.key)}
                    className={cn(
                      "flex min-h-14 items-center gap-3 rounded-2xl border bg-card px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      checked
                        ? "border-foreground ring-1 ring-foreground"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted"
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-semibold">
                        {REMINDER_CHANNEL_LABELS[option.key]}
                      </span>
                      <span className="text-xs text-pretty text-muted-foreground">
                        {option.hint}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px]",
                        checked ? "border-foreground" : "border-foreground/30",
                      )}
                    >
                      {checked ? (
                        <span className="size-2 rounded-full bg-foreground" />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
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
            Enviar ahora por {REMINDER_CHANNEL_LABELS[channel]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Por qué toca ese texto, pegado a su nombre: «… · aún no vence». */
const STAGE_NOTES: Record<ReminderTemplateKey, string> = {
  due_soon: " · aún no vence.",
  due_today: " · vence hoy.",
  overdue: " · ya vencida.",
};

const CHANNELS = [
  {
    key: "whatsapp",
    icon: MessageCircle,
    hint: "Por el chat del pedido; fuera de las 24 h, con la plantilla aprobada",
  },
  { key: "email", icon: Mail, hint: "Al correo de su ficha" },
] as const satisfies readonly {
  key: ReminderChannel;
  icon: typeof Mail;
  hint: string;
}[];
