"use client";

import { MessageCircle, Star } from "lucide-react";

import { cn } from "@/core/lib/utils";
import { CopyButton } from "@/shared/components/features/field-list";
import { StatePill } from "@/shared/components/features/bento";

import {
  EMAIL_TYPE_LABELS,
  PHONE_TYPE_LABELS,
  readablePhone,
  waySourceLabel,
  type ContactPointsDTO,
  type EmailWayDTO,
  type PhoneWayDTO,
} from "../../domain/lead";

/** Una etiqueta pequeña: el tipo del dato o un rasgo suyo. */
export function WayTag({
  children,
  outline = false,
}: {
  children: React.ReactNode;
  outline?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] whitespace-nowrap",
        outline ? "border-border text-muted-foreground border" : "bg-muted",
      )}
    >
      {children}
    </span>
  );
}

/**
 * Un correo o un teléfono: el dato, y UNA línea secundaria con su tipo, su
 * estado y de dónde salió. El dato se corta con difuminado; copiar copia el
 * valor entero.
 */
export function WayItem({
  value,
  display,
  copyLabel,
  best = false,
  children,
  source,
}: {
  value: string;
  /** Lo que se lee, si no es el valor tal cual (un teléfono agrupado). */
  display?: string;
  copyLabel: string;
  best?: boolean;
  /** Las etiquetas de la línea secundaria. */
  children: React.ReactNode;
  source: string | null;
}) {
  return (
    <li className="border-border-soft grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 border-t py-2.5 first:border-t-0">
      <span className={cn("truncate font-mono text-[12.5px]", best ? "font-semibold" : "font-medium")} title={value}>
        {display ?? value}
      </span>
      <CopyButton value={value} label={copyLabel} />
      <span className="text-muted-foreground col-span-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        {children}
        {source !== null && <span className="text-pretty">{source}</span>}
      </span>
    </li>
  );
}

function PrincipalTag() {
  return (
    <WayTag outline>
      <Star aria-hidden className="size-3" />
      Principal
    </WayTag>
  );
}

export function EmailWay({
  email,
  verification = null,
  showPrimary = true,
}: {
  email: EmailWayDTO;
  /** Solo se conoce la del principal (la señal del índice de calidad). */
  verification?: "verified" | "undeliverable" | null;
  showPrimary?: boolean;
}) {
  return (
    <WayItem value={email.value} copyLabel="correo" best={email.primary} source={waySourceLabel(email)}>
      <WayTag>{EMAIL_TYPE_LABELS[email.type]}</WayTag>
      {email.primary && verification === "verified" && <StatePill tone="success">Buzón verificado</StatePill>}
      {email.primary && verification === "undeliverable" && <StatePill tone="destructive">No recibe correo</StatePill>}
      {showPrimary && email.primary && <PrincipalTag />}
    </WayItem>
  );
}

export function PhoneWay({ phone, showPrimary = true }: { phone: PhoneWayDTO; showPrimary?: boolean }) {
  return (
    <WayItem
      value={phone.value}
      display={readablePhone(phone.value)}
      copyLabel="teléfono"
      best={phone.primary}
      source={waySourceLabel(phone)}
    >
      <WayTag>{PHONE_TYPE_LABELS[phone.type]}</WayTag>
      {phone.whatsapp ? (
        <WayTag>
          <MessageCircle aria-hidden className="text-logo-whatsapp size-3" />
          Tiene WhatsApp
        </WayTag>
      ) : (
        // De un celular sin enlace publicado no se sabe: se dice así, no «sin WhatsApp».
        phone.type === "celular" && <WayTag outline>WhatsApp sin confirmar</WayTag>
      )}
      {showPrimary && phone.primary && <PrincipalTag />}
    </WayItem>
  );
}

/**
 * «Correos · N» y «Teléfonos · N» de la ficha del lead: todos los que se
 * hallaron, el principal primero. Sin ninguno no pinta nada.
 */
export function ContactPointGroups({
  points,
  emailVerification,
}: {
  points: ContactPointsDTO;
  emailVerification: "verified" | "undeliverable" | null;
}) {
  return (
    <>
      {points.emails.length > 0 && (
        <div className="border-border flex flex-col gap-1.5 border-t pt-3.5">
          <h3 className="text-muted-foreground font-sans text-xs font-normal">
            Correos · {points.emails.length}
          </h3>
          <ul className="flex flex-col">
            {points.emails.map((email) => (
              <EmailWay key={email.value} email={email} verification={emailVerification} />
            ))}
          </ul>
        </div>
      )}
      {points.phones.length > 0 && (
        <div className="border-border flex flex-col gap-1.5 border-t pt-3.5">
          <h3 className="text-muted-foreground font-sans text-xs font-normal">
            Teléfonos · {points.phones.length}
          </h3>
          <ul className="flex flex-col">
            {points.phones.map((phone) => (
              <PhoneWay key={phone.value} phone={phone} />
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
