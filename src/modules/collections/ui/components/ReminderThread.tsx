"use client";

import { BellOff, CheckCheck, Clock } from "lucide-react";

import {
  renderReminderPreview,
  type ReminderTemplates,
} from "@/modules/collections/domain/reminder";

/**
 * La vista previa de la cadencia: el HILO, no un calendario.
 *
 * El dueño no está configurando un cron; está decidiendo qué le llega por
 * WhatsApp a una persona que le debe dinero. Enseñarlo como conversación hace
 * visible de un vistazo lo que una rejilla de ajustes esconde: que apagar una
 * plantilla deja un hueco ese día, y que sin plantilla aprobada de Meta el
 * aviso de mora no sale nunca — justo a quien más hay que perseguir.
 */
export function ReminderThread({
  templates,
  hasOverdueHsm,
  channelsOff,
}: {
  templates: ReminderTemplates;
  /** Sin HSM de mora, el aviso fuera de la ventana de 24 h no sale. */
  hasOverdueHsm: boolean;
  channelsOff: boolean;
}) {
  return (
    <aside className="rounded-[20px] border border-border bg-background p-5 pb-6">
      <p className="text-[12.5px] text-muted-foreground">
        Lo que le va a llegar a
      </p>
      <p className="mt-0.5 text-[15.5px] font-semibold tracking-[-0.01em]">
        Laura Gómez · cuota 2 de 3
      </p>

      {channelsOff ? (
        <Gap icon={<BellOff aria-hidden="true" className="size-4 shrink-0" />}>
          Con WhatsApp y correo apagados no sale{" "}
          <b className="font-medium text-foreground">ningún</b> aviso, por mucha
          cadencia que haya. La cartera se sigue viendo; nadie recibe nada.
        </Gap>
      ) : (
        <div className="mt-5 flex flex-col gap-3.5">
          <When>9 de octubre · 7 días antes</When>
          <Step template={templates.due_soon} stage="antes de vencer" />

          <When>16 de octubre · el día del vencimiento</When>
          <Step
            template={templates.due_today}
            stage="del día del vencimiento"
          />

          <When>17 de octubre · 1 día de mora</When>
          {hasOverdueHsm || !templates.overdue.enabled ? (
            <Step template={templates.overdue} stage="de mora" />
          ) : (
            <Gap
              icon={<Clock aria-hidden="true" className="size-4 shrink-0" />}
            >
              Si Laura lleva días sin escribir, la ventana de 24 horas de
              WhatsApp está cerrada y este aviso{" "}
              <b className="font-medium text-foreground">no sale</b>. Es justo a
              quien hay que perseguir. Con una plantilla aprobada de Meta, sí
              saldría.
            </Gap>
          )}
        </div>
      )}
    </aside>
  );
}

function Step({
  template,
  stage,
}: {
  template: ReminderTemplates[keyof ReminderTemplates];
  stage: string;
}) {
  if (!template.enabled) {
    return (
      <Gap icon={<BellOff aria-hidden="true" className="size-4 shrink-0" />}>
        Ese día{" "}
        <b className="font-medium text-foreground">no se escribe nada</b>: el
        aviso {stage} está apagado. Queda anotado en el historial del plan con
        su razón, para que se sepa que fue una decisión y no un fallo.
      </Gap>
    );
  }
  return (
    <div className="max-w-[88%] self-end rounded-[16px] rounded-br-[5px] bg-secondary px-3.5 py-2.5 text-[13px] leading-relaxed">
      {renderReminderPreview(template.body)}
      <span className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <CheckCheck aria-hidden="true" className="size-3" />
        WhatsApp · entregado
      </span>
    </div>
  );
}

function When({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[11.5px] tabular-nums text-muted-foreground">
      {children}
    </p>
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
    <div className="mt-5 flex items-start gap-2.5 rounded-[14px] border border-dashed border-border px-3.5 py-2.5 text-[12.5px] leading-relaxed text-muted-foreground">
      {icon}
      <span>{children}</span>
    </div>
  );
}
