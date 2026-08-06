"use client";

import { Check, CircleSlash, Radio } from "lucide-react";
import { AiBadge } from "@/shared/components/features/timeline";
import { relativeTime } from "@/core/lib/relative-time";
import { TRIGGER_LABELS } from "@/modules/marketing/domain/enums";
import { skipReasonLabel } from "@/modules/marketing/domain/skip-reasons";
import type { RecoveryFeedEntry } from "@/modules/marketing/infrastructure/stores/overview.store";

/**
 * Feed de decisiones de las reglas de recuperación, alimentado SOLO por el
 * WebSocket: no hay endpoint de "últimas ejecuciones", así que la lista empieza
 * vacía y se llena mientras la pantalla está abierta. La vista lo dice en vez
 * de fingir un histórico que no existe.
 *
 * Un descarte se muestra igual que un envío: saber por qué NO se escribió es
 * tan útil como saber que se escribió — y es lo que evita que el operador crea
 * que el módulo está roto cuando en realidad el anti-spam hizo su trabajo.
 */
export function RecoveryFeed({
  entries,
  connected,
}: {
  entries: RecoveryFeedEntry[];
  connected: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <Radio aria-hidden="true" className="size-7 text-muted-foreground" />
        <p className="text-sm font-medium">
          {connected ? "A la escucha" : "Sin conexión en tiempo real"}
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          {connected
            ? "Aquí verás cada decisión de tus reglas en cuanto ocurra: a quién le escribieron y a quién no."
            : "Se reintentará sola. Mientras tanto, las cifras de arriba siguen siendo correctas."}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/60">
      {entries.map((entry) => {
        const sent = entry.status === "sent";
        return (
          <li key={entry.execution_id} className="flex gap-2.5 px-5 py-3">
            <span
              aria-hidden="true"
              className={
                sent
                  ? "mt-0.5 flex size-6.5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success"
                  : "mt-0.5 flex size-6.5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
              }
            >
              {sent ? <Check className="size-3.5" /> : <CircleSlash className="size-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                {sent && <AiBadge />}
                <span className="text-muted-foreground">
                  {TRIGGER_LABELS[entry.trigger_type]}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {sent ? "Mensaje enviado" : `No se envió: ${skipReasonLabel(entry.skip_reason)}`}
              </p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {relativeTime(entry.received_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
