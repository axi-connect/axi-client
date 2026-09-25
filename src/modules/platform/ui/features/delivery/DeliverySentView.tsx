"use client";

/**
 * «Bienvenida enviada» (entrega_premium_plan.md, F3): la línea de tiempo de lo
 * que pasó con la hora que registró el servidor, y a la derecha lo que sigue
 * (las dos citas) y qué hacer si no le llegó. Mientras el dueño no crea su
 * contraseña, la entrega se refresca sola (`useLatestDelivery`) y el último
 * paso queda «esperando».
 */
import { CalendarPlus, Check, CircleAlert, LoaderCircle, MailCheck, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { civilDateIn, endSentence, formatInstantTime, formatWeekdayDate } from "@/modules/welcome-kit/domain/formatters";
import { formatDayTime } from "../../../domain/dates";
import { deliveryTimeline, type TimelineState } from "../../../domain/delivery-timeline";
import { inviteExpiresAt, shortMessageId, latestOwnerAttempt } from "../../../domain/delivery";
import { CALL_DAY2_MINUTES, CALL_DAY2_TITLE, CALL_DAY5_MINUTES, CALL_DAY5_TITLE } from "../../../domain/trial-journey";
import type { DeliveryDetailWire } from "../../../infrastructure/api/delivery.dto";
import { latestDeliveryPollMs } from "../../../infrastructure/api/hooks/use-delivery";
import { downloadCallsIcs } from "./download-calls";
import { ResendDeliveryButton } from "./ResendDeliveryButton";

function TimelineDot({ state }: { state: TimelineState }) {
  if (state === "done") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-foreground text-background">
        <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (state === "failed") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full border-2 border-destructive bg-card text-destructive">
        <X aria-hidden="true" className="size-4" strokeWidth={2.5} />
      </span>
    );
  }
  if (state === "waiting") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full border-2 border-brand bg-card ring-4 ring-brand/15">
        <span className="size-2.5 rounded-full bg-brand motion-safe:animate-pulse" />
      </span>
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
      <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
    </span>
  );
}

const STATE_LABEL: Record<TimelineState, string> = {
  done: "hecho",
  failed: "falló",
  waiting: "esperando",
  active: "en curso",
};

function CallRow({ at, title, minutes, timeZone }: { at: string; title: string; minutes: number; timeZone: string }) {
  const civil = civilDateIn(at, timeZone);
  const weekday = formatWeekdayDate(at, timeZone).split(" ")[0] ?? "";
  return (
    <li className="flex items-center gap-4">
      <span
        aria-hidden="true"
        className="flex h-14 w-13 shrink-0 flex-col items-center justify-center rounded-2xl bg-muted leading-none"
      >
        <span className="text-[10px] font-semibold uppercase">{weekday}</span>
        <span className="mt-1 font-heading text-xl font-bold tabular-nums">{civil?.day ?? ""}</span>
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">
          {formatDayTime(at, timeZone)} · {minutes} min
        </span>
      </span>
    </li>
  );
}

export function DeliverySentView({
  tenantId,
  delivery,
  owner,
  businessName,
}: {
  tenantId: string;
  delivery: DeliveryDetailWire;
  owner: { name: string | null; email: string | null };
  businessName: string;
}) {
  const tz = delivery.trial_tz;
  const failed = delivery.status === "failed";
  const items = deliveryTimeline(delivery, owner);
  // «Se actualiza solo» solo si de verdad se está refrescando (A12).
  const polling = latestDeliveryPollMs({ delivery }) !== false;
  const firstName = owner.name?.trim().split(/\s+/)[0] || "el dueño";
  const inviteEnds = inviteExpiresAt(delivery.attempts);
  const messageId = latestOwnerAttempt(delivery.attempts)?.provider_message_id ?? null;
  const reached = items.filter((item) => item.state === "done").length;

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] [&>*]:min-w-0">
      <section aria-labelledby="delivery-sent-title" className="space-y-5">
        <header className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl",
              failed ? "border-2 border-destructive text-destructive" : "bg-foreground text-background dark:border dark:border-border dark:bg-card dark:text-foreground",
            )}
          >
            {failed ? <CircleAlert className="size-6" /> : <MailCheck className="size-6" />}
          </span>
          <div className="min-w-0 space-y-1">
            <h2 id="delivery-sent-title" className="text-2xl font-bold tracking-tight text-pretty sm:text-3xl">
              {failed ? "La bienvenida no salió" : `Bienvenida enviada a ${firstName}`}
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              {failed
                ? "La entrega quedó hecha (oferta, prueba y kit); lo que falló es el correo. Reenviar lo intenta de nuevo."
                : delivery.password_set_at
                  ? endSentence(`Ya creó su contraseña el ${formatDayTime(delivery.password_set_at, tz)}`)
                  : inviteEnds
                    ? endSentence(`Su enlace para crear la contraseña sirve una vez y vence el ${formatDayTime(inviteEnds, tz)}`)
                    : "Su correo con el enlace para crear la contraseña va en camino."}
            </p>
          </div>
        </header>

        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h3 className="font-sans text-xs font-normal text-muted-foreground">Qué pasó</h3>
            {polling ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success motion-safe:animate-pulse" />
                Se actualiza solo
              </span>
            ) : null}
          </div>
          <ol className="relative" aria-label={`Pasos de la entrega: ${reached} de ${items.length} hechos`}>
            {items.map((item, index) => {
              const last = index === items.length - 1;
              const nextDone = items[index + 1]?.state === "done";
              return (
                <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {last ? null : (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute top-8 bottom-0 left-4 w-0.5 -translate-x-1/2",
                        item.state === "done" && nextDone ? "bg-foreground" : "bg-border",
                      )}
                    />
                  )}
                  <span className="relative shrink-0">
                    <TimelineDot state={item.state} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold break-words">
                        {item.title}
                        <span className="sr-only"> ({STATE_LABEL[item.state]})</span>
                      </p>
                      {item.detail ? <p className="text-xs text-pretty text-muted-foreground">{item.detail}</p> : null}
                      {item.id === "owner_mail" && item.state === "done" && messageId ? (
                        <p className="font-mono text-xs text-muted-foreground">Id {shortMessageId(messageId)}</p>
                      ) : null}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-xs whitespace-nowrap tabular-nums",
                        item.state === "waiting" ? "font-medium text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item.at ? formatInstantTime(item.at, tz) : item.state === "waiting" ? "esperando" : ""}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {delivery.password_set_at ? (
          <Alert variant="info">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>Ya creó su contraseña; reenviar le permite cambiarla.</AlertDescription>
          </Alert>
        ) : null}
      </section>

      <aside className="grid gap-4 md:grid-cols-2 xl:block xl:space-y-4 xl:pt-20">
        <section aria-labelledby="sent-next-title" className="space-y-4 rounded-3xl border border-border bg-card p-5">
          <h3 id="sent-next-title" className="font-sans text-xs font-normal text-muted-foreground">
            Lo que sigue
          </h3>
          <ul className="space-y-3">
            <CallRow at={delivery.call_day2_at} title={CALL_DAY2_TITLE} minutes={CALL_DAY2_MINUTES} timeZone={tz} />
            <CallRow at={delivery.call_day5_at} title={CALL_DAY5_TITLE} minutes={CALL_DAY5_MINUTES} timeZone={tz} />
          </ul>
          <Button type="button" variant="outline" className="w-full" onClick={() => downloadCallsIcs(delivery, businessName)}>
            <CalendarPlus aria-hidden="true" />
            Añadir las dos a mi calendario
          </Button>
        </section>

        <section aria-labelledby="sent-resend-title" className="space-y-3 rounded-3xl border border-border bg-card p-5">
          <h3 id="sent-resend-title" className="font-sans text-xs font-normal text-muted-foreground">
            {failed ? "Intentar de nuevo" : "Si no le llegó"}
          </h3>
          <p className="text-sm text-pretty text-muted-foreground">
            Reenviar usa el mismo kit, emite un enlace de contraseña nuevo que anula el anterior y queda como un intento
            más en el historial.
          </p>
          <ResendDeliveryButton
            tenantId={tenantId}
            deliveryId={delivery.id}
            passwordSetAt={delivery.password_set_at}
            variant={failed ? "default" : "outline"}
            size="default"
          />
        </section>
      </aside>
    </div>
  );
}
