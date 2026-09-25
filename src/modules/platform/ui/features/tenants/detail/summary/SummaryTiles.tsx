"use client";

/**
 * Las tarjetas del Resumen del tenant (entrega_premium_plan.md, F1). Cada una
 * es una lista corta de UN tema: etiqueta arriba, una cifra o frase principal y
 * una línea secundaria. Solo pintan datos que el contrato trae; lo que no hay
 * se dice («Sin oferta guardada»), no se inventa.
 */
import Link from "next/link";
import { CalendarPlus, Check, Copy } from "lucide-react";
import {
  BentoFigure,
  BentoLink,
  BentoTile,
  InkIsland,
  Kicker,
  StatePill,
  type StatePillTone,
} from "@/shared/components/features/bento";
import { formatMoney } from "@/core/lib/format";
import { Button } from "@/shared/components/ui/button";
import { formatDayTime, formatShortDate } from "../../../../../domain/dates";
import {
  DELIVERY_STATUS_LABELS,
  deliveryRecipients,
  inviteExpiresAt,
  isDispatchedDelivery,
  latestOwnerAttempt,
  shortMessageId,
} from "../../../../../domain/delivery";
import { countdownParts, elapsedLabel, type NextMilestone } from "../../../../../domain/trial-journey";
import type { DeliveryContextWire, DeliveryDetailWire } from "../../../../../infrastructure/api/delivery.dto";
import { useCopy } from "../../../../hooks/use-copy";
import { ResendDeliveryButton } from "../../../delivery/ResendDeliveryButton";
import { downloadCallsIcs } from "../../../delivery/download-calls";

// Las piezas del bento viven en shared/components/features/bento (DESIGN-SYSTEM §9.5).
type Tone = StatePillTone;
const SummaryTile = BentoTile;
const BigFigure = BentoFigure;

// ------------------------------------------------------------------ acceso de la dueña

export function OwnerAccessTile({
  delivery,
  ownerEmail: fallbackEmail = null,
}: {
  delivery: DeliveryDetailWire | null;
  /** El correo del dueño según el contexto, si los intentos aún no lo traen. */
  ownerEmail?: string | null;
}) {
  const dispatched = isDispatchedDelivery(delivery);
  const owner = delivery ? latestOwnerAttempt(delivery.attempts) : null;
  const ownerEmail = delivery
    ? (deliveryRecipients(delivery, fallbackEmail).find((r) => r.role === "owner")?.email ?? fallbackEmail)
    : fallbackEmail;

  if (!delivery || !dispatched) {
    return (
      <SummaryTile label="Acceso del dueño" aside={<StatePill tone="neutral">Sin invitar</StatePill>}>
        <p className="text-sm font-medium">Aún sin invitación</p>
        <p className="text-sm text-muted-foreground">El enlace para crear la contraseña sale con la bienvenida.</p>
      </SummaryTile>
    );
  }

  if (delivery.password_set_at) {
    const elapsed = elapsedLabel(owner?.sent_at ?? null, delivery.password_set_at);
    return (
      <SummaryTile label="Acceso del dueño" aside={<StatePill tone="success">Activo</StatePill>}>
        {elapsed ? <BigFigure value={elapsed.value} unit={elapsed.unit} /> : <BigFigure value="Listo" />}
        <p className="text-sm text-muted-foreground">
          {elapsed ? "hasta crear su contraseña" : "Ya creó su contraseña"}
        </p>
        <OwnerLine email={ownerEmail ?? null} detail={formatDayTime(delivery.password_set_at, delivery.trial_tz)} />
      </SummaryTile>
    );
  }

  const expires = inviteExpiresAt(delivery.attempts);
  return (
    <SummaryTile label="Acceso del dueño" aside={<StatePill tone="warning">Esperando</StatePill>}>
      <p className="text-sm font-medium">Aún no crea su contraseña</p>
      <p className="text-sm text-muted-foreground">
        {expires ? `El enlace vence el ${formatDayTime(expires, delivery.trial_tz)}` : "El correo va en camino"}
      </p>
      <OwnerLine email={ownerEmail ?? null} detail={owner?.sent_at ? `Invitado el ${formatDayTime(owner.sent_at, delivery.trial_tz)}` : null} />
    </SummaryTile>
  );
}

function OwnerLine({ email, detail }: { email: string | null; detail: string | null }) {
  if (!email) return null;
  return (
    <div className="mt-auto flex min-w-0 items-center gap-2.5 pt-1">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase"
      >
        {email.slice(0, 2)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium" title={email}>
          {email}
        </span>
        {detail ? <span className="block truncate text-xs text-muted-foreground">{detail}</span> : null}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ oferta

export function OfferTile({
  offer,
  trialEndsAt,
  timeZone,
  entregaHref,
}: {
  offer: DeliveryContextWire["offer"] | undefined;
  trialEndsAt: string | null;
  timeZone: string;
  entregaHref: string;
}) {
  if (!offer) {
    return (
      <SummaryTile label="Al terminar la prueba">
        <p className="text-sm font-medium">Sin oferta guardada</p>
        <p className="text-sm text-muted-foreground">La oferta se guarda al enviar la bienvenida.</p>
        <BentoLink href={entregaHref} className="mt-auto">
          Preparar entrega
        </BentoLink>
      </SummaryTile>
    );
  }
  const discounted = offer.list_amount_cents > offer.amount_cents;
  const period = offer.billing_period === "annual" ? "año" : "mes";
  return (
    <SummaryTile label="Al terminar la prueba">
      <p className="flex items-baseline gap-1.5 whitespace-nowrap">
        <span className="font-heading text-3xl leading-none font-bold tracking-tight tabular-nums">
          {formatMoney(offer.amount_cents, offer.currency)}
        </span>
        <span className="text-sm text-muted-foreground">/ {period}</span>
      </p>
      <p className="min-w-0 text-sm">
        <span className="block truncate font-medium">{offer.plan_name}</span>
        {offer.volume_tier_label ? (
          <span className="block truncate text-muted-foreground">{offer.volume_tier_label}</span>
        ) : null}
      </p>
      <div className="mt-auto flex min-w-0 flex-col items-start gap-1.5">
        {offer.promotion_name ? (
          <span className="max-w-full truncate rounded-full bg-accent-violet/12 px-2.5 py-0.5 text-xs font-medium" title={offer.promotion_name}>
            {offer.promotion_name}
          </span>
        ) : null}
        {discounted ? (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            Antes <s className="tabular-nums">{formatMoney(offer.list_amount_cents, offer.currency)}</s>
          </span>
        ) : null}
        {trialEndsAt ? (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            Primer cobro el {formatShortDate(trialEndsAt, timeZone)}
          </span>
        ) : null}
      </div>
    </SummaryTile>
  );
}

// ------------------------------------------------------------------ bienvenida

const DELIVERY_TONE: Record<DeliveryDetailWire["status"], Tone> = {
  draft: "warning",
  committed: "warning",
  mail_queued: "warning",
  sent: "success",
  failed: "destructive",
};

export function WelcomeTile({
  tenantId,
  delivery,
  ownerEmail: fallbackEmail = null,
}: {
  tenantId: string;
  delivery: DeliveryDetailWire | null;
  ownerEmail?: string | null;
}) {
  const { copied, copy } = useCopy();
  const href = `/platform/tenants/${tenantId}/entrega`;

  if (!delivery) {
    return (
      <SummaryTile label="Bienvenida" className="md:col-span-2 xl:col-span-3 min-[1400px]:col-span-2">
        <p className="text-sm font-medium">Aún sin entregar</p>
        <p className="text-sm text-muted-foreground">
          La prueba de 7 días arranca cuando le envías la bienvenida: oferta, citas y el enlace para su contraseña.
        </p>
        <div className="mt-auto">
          <Button asChild size="sm">
            <Link href={href}>Preparar entrega</Link>
          </Button>
        </div>
      </SummaryTile>
    );
  }

  const dispatched = isDispatchedDelivery(delivery);
  const owner = latestOwnerAttempt(delivery.attempts);
  const recipients = deliveryRecipients(delivery, fallbackEmail);
  const ownerEmail = recipients.find((recipient) => recipient.role === "owner")?.email || fallbackEmail || "—";
  const copies = delivery.cc.length;
  const messageId = owner?.provider_message_id ?? null;

  return (
    <SummaryTile
      label="Bienvenida"
      className="md:col-span-2 xl:col-span-3 min-[1400px]:col-span-2"
      aside={<StatePill tone={DELIVERY_TONE[delivery.status]}>{DELIVERY_STATUS_LABELS[delivery.status]}</StatePill>}
    >
      <dl className="divide-y divide-border text-sm">
        <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="shrink-0 text-muted-foreground">{dispatched ? "Enviada" : "Empezada"}</dt>
          {/* Piezas que no se parten: en el celular la línea se corta entre ellas. */}
          <dd className="min-w-0 sm:truncate sm:text-right">
            <span className="whitespace-nowrap">{formatDayTime(owner?.sent_at ?? delivery.created_at, delivery.trial_tz)}</span>
            {"\u00a0· "}
            <span className="whitespace-nowrap">por {delivery.advisor.name}</span>
            {owner && owner.attempt > 1 ? (
              <>
                {"\u00a0· "}
                <span className="whitespace-nowrap">intento {owner.attempt}</span>
              </>
            ) : null}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <dt className="shrink-0 text-muted-foreground">Para</dt>
          <dd className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 sm:flex-nowrap sm:justify-end">
            <span className="min-w-0 break-all sm:truncate sm:break-normal" title={ownerEmail}>
              {ownerEmail}
            </span>
            <span className="shrink-0 whitespace-nowrap text-muted-foreground">
              {copies === 0 ? "· sin copia" : copies === 1 ? "+ 1 copia al equipo" : `+ ${copies} copias al equipo`}
            </span>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <dt className="shrink-0 text-muted-foreground">Id del mensaje</dt>
          <dd>
            {messageId ? (
              <button
                type="button"
                onClick={() => void copy(messageId)}
                aria-label={`Copiar el id del mensaje ${messageId}`}
                className="inline-flex h-6 items-center gap-1.5 rounded-md px-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {shortMessageId(messageId)}
                {copied ? <Check aria-hidden="true" className="size-3.5 text-success" /> : <Copy aria-hidden="true" className="size-3.5" />}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Aún no lo asigna el proveedor</span>
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {dispatched ? (
          <ResendDeliveryButton tenantId={tenantId} deliveryId={delivery.id} passwordSetAt={delivery.password_set_at} />
        ) : (
          <Button asChild size="sm">
            <Link href={href}>Retomar la entrega</Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link href={href}>Ver la entrega</Link>
        </Button>
      </div>
    </SummaryTile>
  );
}

// ------------------------------------------------------------------ lo próximo

/**
 * La isla de tinta del Resumen: la próxima cita con su cuenta atrás. En oscuro
 * es una tarjeta elevada con borde (una isla blanca sobre negro gritaría).
 */
export function NextStepCard({
  tenantId,
  businessName,
  delivery,
  milestone,
  now,
}: {
  tenantId: string;
  businessName: string;
  delivery: DeliveryDetailWire | null;
  milestone: NextMilestone | null;
  now: Date;
}) {
  const href = `/platform/tenants/${tenantId}/entrega`;
  const dispatched = isDispatchedDelivery(delivery);
  const tz = delivery?.trial_tz;

  let body: React.ReactNode;
  if (!delivery || !dispatched) {
    body = (
      <>
        <Kicker>Lo próximo</Kicker>
        <p className="font-heading text-2xl leading-tight font-bold tracking-tight">
          {delivery ? "Retomar la entrega" : "Preparar la entrega"}
        </p>
        <p className="text-sm opacity-80">Todo sale en un solo envío, y la prueba de 7 días arranca ese día.</p>
        <ol className="my-auto space-y-3 py-4">
          {["La oferta que se cobra al terminar", "La prueba con sus dos citas", "El correo con el enlace de su contraseña"].map(
            (label, index) => (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="flex size-7 shrink-0 items-center justify-center rounded-full border border-current/25 text-xs font-semibold tabular-nums"
                >
                  {index + 1}
                </span>
                {label}
              </li>
            ),
          )}
        </ol>
        <div className="mt-auto">
          <Button asChild variant="secondary" className="w-full">
            <Link href={href}>{delivery ? "Retomar la entrega" : "Preparar entrega"}</Link>
          </Button>
        </div>
      </>
    );
  } else if (milestone) {
    const parts = countdownParts(milestone.at, now);
    const target = milestone.kind === "decide" ? "para el cierre" : milestone.kind === "call" ? "para la llamada" : "para la reunión";
    body = (
      <>
        <Kicker>Lo próximo</Kicker>
        <p className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance">{milestone.title}</p>
        <p className="text-sm opacity-80">
          {formatDayTime(milestone.at, tz)}
          {milestone.minutes ? ` · ${milestone.minutes} min` : ""}
        </p>
        <div className="flex flex-1 flex-col items-center justify-center gap-1 py-6 text-center">
          <p className="font-heading leading-none font-bold whitespace-nowrap tabular-nums">
            <span className="text-5xl">{parts.major}</span>
            {parts.minor ? <span className="ml-2 text-2xl opacity-70">{parts.minor}</span> : null}
          </p>
          <p className="text-xs opacity-70">{target}</p>
        </div>
        <div className="space-y-3">
          <p className="text-sm opacity-80">
            {milestone.kind === "decide"
              ? "Ese día sale el primer cobro de la oferta, si decide seguir."
              : "La cita ya va en su correo como .ics. Añádela también a tu calendario."}
          </p>
          {milestone.kind === "decide" ? (
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/platform/tenants/${tenantId}/billing`}>Ver facturación</Link>
            </Button>
          ) : (
            <Button type="button" variant="secondary" className="w-full" onClick={() => downloadCallsIcs(delivery, businessName)}>
              <CalendarPlus aria-hidden="true" />
              Añadir las citas a mi calendario
            </Button>
          )}
        </div>
      </>
    );
  } else {
    body = (
      <>
        <Kicker>Lo próximo</Kicker>
        <p className="font-heading text-2xl leading-tight font-bold tracking-tight">La prueba terminó</p>
        <p className="text-sm opacity-80">Revisa si pasó a cobro o si hay que acompañar la decisión.</p>
        <div className="mt-auto">
          <Button asChild variant="secondary" className="w-full">
            <Link href={`/platform/tenants/${tenantId}/billing`}>Ver facturación</Link>
          </Button>
        </div>
      </>
    );
  }

  return (
    <InkIsland
      label="Lo próximo"
      className="min-h-80 md:col-span-2 xl:col-span-1 xl:col-start-3 xl:row-span-2 xl:row-start-1 min-[1400px]:col-start-4"
    >
      {body}
    </InkIsland>
  );
}

