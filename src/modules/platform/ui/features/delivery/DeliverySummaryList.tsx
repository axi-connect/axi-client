"use client";

import { Check, Copy } from "lucide-react";
import { formatDayTime } from "../../../domain/dates";
import {
  DELIVERY_STATUS_LABELS,
  formatZonedDay,
  inviteExpiresAt,
  latestOwnerAttempt,
  shortMessageId,
} from "../../../domain/delivery";
import type { DeliveryDetailWire } from "../../../infrastructure/api/delivery.dto";
import { useCopy } from "../../hooks/use-copy";

const STATUS_TONE: Record<DeliveryDetailWire["status"], string> = {
  draft: "text-warning",
  committed: "text-info",
  mail_queued: "text-info",
  sent: "text-success",
  failed: "text-destructive",
};

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">
        {children}
        {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
      </dd>
    </div>
  );
}

/**
 * La entrega como ficha: etiqueta → valor, un solo indicador (el estado) y
 * una línea secundaria donde hace falta. La usan la tarjeta «Entrega» del
 * resumen del tenant y el estado «enviado» de «Preparar entrega».
 */
export function DeliverySummaryList({
  delivery,
  ownerEmail,
  compact = false,
}: {
  delivery: DeliveryDetailWire;
  ownerEmail?: string | null;
  /** En la tarjeta del resumen: sin citas ni copia. */
  compact?: boolean;
}) {
  const { copied, copy } = useCopy();
  const tz = delivery.trial_tz;
  const owner = latestOwnerAttempt(delivery.attempts);
  const sentAt = owner?.sent_at ?? delivery.created_at;
  const inviteEnds = inviteExpiresAt(delivery.attempts);
  const messageId = owner?.provider_message_id ?? null;

  return (
    <dl className="divide-y divide-border">
      <Row label="Estado" hint={delivery.status === "failed" && owner?.error ? owner.error : undefined}>
        <span className={`inline-flex items-center gap-1.5 font-medium ${STATUS_TONE[delivery.status]}`}>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {DELIVERY_STATUS_LABELS[delivery.status]}
        </span>
      </Row>
      <Row label="Enviada">
        {formatDayTime(sentAt, tz)} · por {delivery.advisor.name}
        {owner && owner.attempt > 1 ? ` · intento ${owner.attempt}` : ""}
      </Row>
      <Row label="Contraseña">
        {delivery.password_set_at ? (
          <span className="inline-flex items-center gap-1 text-success">
            <Check aria-hidden="true" className="size-3.5" />
            Creada el {formatDayTime(delivery.password_set_at, tz)}
          </span>
        ) : inviteEnds ? (
          <>
            <span className="font-medium">Aún sin crear</span> · el enlace vence el {formatDayTime(inviteEnds, tz)}
          </>
        ) : (
          <span className="font-medium">Aún sin crear</span>
        )}
      </Row>
      {delivery.trial_starts_at && delivery.trial_ends_at ? (
        <Row label="Prueba">
          {formatZonedDay(delivery.trial_starts_at, tz)} → {formatZonedDay(delivery.trial_ends_at, tz)}
        </Row>
      ) : null}
      {compact ? null : (
        <>
          <Row label="Citas">
            Día 2: {formatDayTime(delivery.call_day2_at, tz)}
            <br />
            Día 5: {formatDayTime(delivery.call_day5_at, tz)}
          </Row>
          <Row label="Para" hint={delivery.cc.length > 0 ? `Copia: ${delivery.cc.join(", ")}` : "Sin copia al equipo"}>
            {ownerEmail ?? "El dueño de la cuenta"}
          </Row>
        </>
      )}
      <Row label="Id del mensaje">
        {messageId ? (
          <button
            type="button"
            onClick={() => void copy(messageId)}
            aria-label={`Copiar el id del mensaje ${messageId}`}
            className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {shortMessageId(messageId)}
            {copied ? <Check aria-hidden="true" className="size-3 text-success" /> : <Copy aria-hidden="true" className="size-3" />}
          </button>
        ) : (
          <span className="text-muted-foreground">Aún no lo asigna el proveedor</span>
        )}
      </Row>
    </dl>
  );
}
