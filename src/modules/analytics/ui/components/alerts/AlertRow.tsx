"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { relativeTime } from "@/core/lib/relative-time";
import { cn } from "@/core/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  alertDescription,
  alertRuleLabel,
} from "@/modules/analytics/domain/labels";
import type { AlertRowDTO } from "@/modules/analytics/domain/analytics";

/** `payload` es unknown en el wire: extrae `conversation_id` si viene. */
function conversationIdOf(alert: AlertRowDTO): string | null {
  if (!alert.payload || typeof alert.payload !== "object") return null;
  const id = (alert.payload as Record<string, unknown>).conversation_id;
  return typeof id === "string" ? id : null;
}

/**
 * Fila de alerta: regla traducida + frase natural valor vs umbral + acciones.
 * El ack es optimista (el padre saca la fila con colapso `fade.fast`).
 */
export function AlertRow({
  alert,
  agentName,
  canManage,
  onAck,
}: {
  alert: AlertRowDTO;
  /** Nombre del agente si `subject_type=agent` y se pudo resolver. */
  agentName: string | null;
  canManage: boolean;
  onAck: (alertId: string) => Promise<void>;
}) {
  const [acking, setAcking] = useState(false);
  const conversationId = conversationIdOf(alert);
  const triggered = alert.status === "triggered";

  const ack = async () => {
    setAcking(true);
    try {
      await onAck(alert.id);
    } finally {
      setAcking(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <CircleAlert
          aria-hidden
          className={cn(
            "size-4 shrink-0",
            triggered ? "text-destructive" : "text-muted-foreground",
          )}
        />
        <span className="text-sm font-semibold">{alertRuleLabel(alert.rule)}</span>
        {agentName && (
          <span className="text-sm text-muted-foreground">· Agente: {agentName}</span>
        )}
        <time
          dateTime={alert.created_at}
          className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground"
        >
          {relativeTime(alert.created_at)}
        </time>
      </div>
      <p className="pl-6 text-sm text-muted-foreground">
        {alertDescription(alert.rule, alert.value_at_trigger, alert.threshold)}
      </p>
      <div className="flex flex-wrap items-center gap-2 pl-6">
        {triggered && canManage && (
          <Button size="sm" variant="outline" onClick={() => void ack()} disabled={acking}>
            {acking ? (
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
            ) : (
              <Check aria-hidden className="size-4" />
            )}
            Marcar como atendida
          </Button>
        )}
        {conversationId ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/workspace/inbox/${conversationId}`}>
              Ver conversación
              <ArrowRight aria-hidden className="size-4" />
            </Link>
          </Button>
        ) : (
          alert.subject_type === "agent" && (
            <Button asChild size="sm" variant="ghost">
              <Link href="/admin/agents">
                Ver agente
                <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Button>
          )
        )}
      </div>
    </div>
  );
}
