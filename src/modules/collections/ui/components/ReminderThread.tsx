"use client";

import { BellOff, Clock } from "lucide-react";

import { InkIsland, Kicker } from "@/shared/components/features/bento";
import {
  reminderThread,
  renderReminderPreview,
  REMINDER_TEMPLATE_LABELS,
  SAMPLE_DUE_DATE,
  SAMPLE_REMINDER_VARS,
  type CollectionsPolicyDTO,
} from "@/modules/collections/domain/reminder";
import { formatShortDate } from "@/core/lib/format";

/**
 * «Así le escribimos» (Cobros premium P5): la cadencia como CONVERSACIÓN, no
 * como calendario — la isla de la pestaña.
 *
 * El dueño no está configurando un cron; está decidiendo qué le llega por
 * WhatsApp a una persona que le debe dinero. Un mensaje por desfase, con el
 * texto que toca ese día y los datos de una cuota de ejemplo. Lo que un ajuste
 * esconde, la conversación lo enseña: apagar un texto deja un hueco ese día, y
 * sin plantilla aprobada de Meta la mora no sale fuera de las 24 horas.
 */
export function ReminderThread({
  policy,
  channelsOff,
}: {
  policy: Pick<
    CollectionsPolicyDTO,
    | "reminder_days_before"
    | "overdue_reminder_days"
    | "templates"
    | "hsm_templates"
    | "pause_on_promise"
    | "reminder_channels"
  >;
  channelsOff: boolean;
}) {
  const { entries, maxMessages } = reminderThread(policy);
  const firstName = SAMPLE_REMINDER_VARS.contact_name.split(" ")[0];
  const stops = policy.pause_on_promise
    ? "en cuanto pague o prometa"
    : "en cuanto pague";
  // Cuenta avisos (días), no mensajes por canal: con los dos canales encendidos
  // cada aviso sale por WhatsApp y por correo, y se dice.
  const both =
    policy.reminder_channels.whatsapp && policy.reminder_channels.email;
  const count =
    maxMessages === 0
      ? "Con esto no le escribiríamos nunca."
      : `${maxMessages === 1 ? "Un aviso" : `${String(maxMessages)} avisos`} como mucho${
          both ? ", cada uno por WhatsApp y por correo" : ""
        }: ${maxMessages === 1 ? "para" : "paran"} ${stops}.`;

  return (
    <InkIsland label="Así le escribimos" className="gap-4 xl:sticky xl:top-6">
      <div className="flex flex-col gap-1.5">
        <Kicker>Así le escribimos</Kicker>
        <p className="font-heading text-xl leading-tight font-bold tracking-tight md:text-2xl">
          {firstName}, por la cuota del {formatShortDate(SAMPLE_DUE_DATE)}
        </p>
        {channelsOff ? null : (
          <p className="text-[12.5px] text-muted-foreground">{count}</p>
        )}
      </div>

      {channelsOff ? (
        <Gap icon={<BellOff aria-hidden="true" className="size-4 shrink-0" />}>
          Con WhatsApp y correo apagados no sale{" "}
          <b className="font-medium text-foreground">ningún</b> aviso, por mucha
          cadencia que haya. La cartera se sigue viendo; nadie recibe nada.
        </Gap>
      ) : entries.length === 0 ? (
        <Gap icon={<BellOff aria-hidden="true" className="size-4 shrink-0" />}>
          Sin días en la cadencia no hay a qué día escribirle.
        </Gap>
      ) : (
        <ol
          aria-label="Mensajes de ejemplo"
          className="m-0 flex list-none flex-col gap-3 p-0"
        >
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1.5">
              <p className="text-center text-[11.5px] text-muted-foreground tabular-nums">
                {entry.when}
              </p>
              {entry.disabled ? (
                <Gap
                  icon={
                    <BellOff aria-hidden="true" className="size-4 shrink-0" />
                  }
                >
                  Ese día{" "}
                  <b className="font-medium text-foreground">
                    no se escribe nada
                  </b>
                  : el texto «
                  {REMINDER_TEMPLATE_LABELS[entry.template].toLowerCase()}» está
                  apagado. Queda anotado en el historial del plan con su razón.
                </Gap>
              ) : (
                <>
                  <p className="max-w-[92%] self-end rounded-[18px] rounded-br-[6px] bg-card px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm">
                    {renderReminderPreview(
                      policy.templates[entry.template].body,
                    )}
                  </p>
                  {entry.whatsappNeedsHsm ? (
                    <Gap
                      icon={
                        <Clock aria-hidden="true" className="size-4 shrink-0" />
                      }
                    >
                      Si {firstName} lleva más de 24 horas sin escribir, por
                      WhatsApp{" "}
                      <b className="font-medium text-foreground">no sale</b>:
                      este texto no tiene plantilla aprobada de Meta.
                    </Gap>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </InkIsland>
  );
}

function Gap({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-dashed border-border px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
      {icon}
      <span>{children}</span>
    </div>
  );
}
