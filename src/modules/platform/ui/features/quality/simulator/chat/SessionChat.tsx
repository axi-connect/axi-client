"use client";

/**
 * Columna central del simulacro: cabecera (tenant · agente · estado · gasto
 * con barra · Finalizar), transcript tocable y compositor. Los toques y los
 * textos van por el mismo hook optimista; los 409 de negocio se explican en
 * un aviso sobre el compositor en vez de en un toast que se pierde.
 */
import { useState } from "react";
import { Bot, Square } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  AGENT_STATE_LABELS,
  canOperatorSend,
  describeSessionError,
  formatUsd,
  sessionStatusKey,
  spendPercent,
  tapSourceFor,
  type SessionDetail,
  type SessionInteractiveOption,
} from "../../../../../domain/quality-sessions";
import {
  dedupeOptimistic,
  useSendSessionMedia,
  useSendSessionMessage,
} from "../../../../../infrastructure/api/hooks/use-quality-sessions";
import { Meter, QualityStatus } from "../../shared/premium";
import { Composer } from "./Composer";
import { SessionTranscript } from "./SessionTranscript";

type SessionChatProps = {
  session: SessionDetail;
  onEnd: () => void;
  ending: boolean;
};

export function SessionChat({ session, onEnd, ending }: SessionChatProps) {
  const sendMessage = useSendSessionMessage(session.id);
  const sendMedia = useSendSessionMedia(session.id);
  const [pendingTapId, setPendingTapId] = useState<string | null>(null);
  const transcript = dedupeOptimistic(session.transcript);
  const active = session.status === "active";
  const canSend = canOperatorSend(session);
  const pct = spendPercent(session.spend.spent_usd, session.spend.cap_usd);

  const error = sendMessage.error ?? sendMedia.error;
  const problem = isHttpError(error) ? error.problem : null;
  const sendError = error ? describeSessionError(problem) ?? errorMessage(error) : null;

  const disabledReason = !active
    ? "La sesión terminó: no se pueden enviar más mensajes."
    : session.agent_state === "closed"
      ? "El agente cerró la conversación."
      : null;

  const onTap = (option: SessionInteractiveOption, options: SessionInteractiveOption[]) => {
    setPendingTapId(option.id);
    sendMessage.mutate(
      { kind: "tap", option_id: option.id, title: option.title, source: tapSourceFor(options) },
      { onSettled: () => setPendingTapId(null) },
    );
  };

  return (
    <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-3xl border border-border bg-card" aria-label="Conversación del simulacro">
      <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3.5">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background dark:border dark:border-border dark:bg-secondary dark:text-foreground">
          <Bot className="size-5" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold">
            {session.company_name}
            {session.agent ? ` · ${session.agent.name}` : ""}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session.agent ? <span className="whitespace-nowrap">{session.agent.model}</span> : "—"} ·{" "}
            <span className="whitespace-nowrap">canal simulador</span> · <span className="whitespace-nowrap">cobrado a plataforma</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <QualityStatus status={sessionStatusKey(session)} />
          {session.agent_state === "escalated" && <QualityStatus status="blocked" />}
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground tabular-nums" title={AGENT_STATE_LABELS[session.agent_state]}>
            <span className="whitespace-nowrap">
              <span className="font-medium text-foreground">{formatUsd(session.spend.spent_usd ?? 0)}</span> de {formatUsd(session.spend.cap_usd)}
            </span>
            <Meter value={(pct ?? 0) / 100} tone={(pct ?? 0) >= 80 ? "warning" : "default"} label="Gasto de la sesión" className="w-16" />
          </span>
          {active && (
            <Button variant="outline" size="sm" onClick={onEnd} disabled={ending}>
              <Square aria-hidden="true" />
              Finalizar
            </Button>
          )}
        </div>
      </header>

      <SessionTranscript session={session} transcript={transcript} canTap={canSend} onTap={onTap} pendingTapId={pendingTapId} />

      {session.agent_state === "escalated" && active && (
        <Alert variant="warning" className="mx-3 mt-2">
          <AlertDescription>
            La conversación pasó a un operador humano: el agente ya no responde. Puedes seguir escribiendo (irá a la cola humana) o finalizar la sesión.
          </AlertDescription>
        </Alert>
      )}
      {sendError && (
        <Alert variant="destructive" className="mx-3 mt-2">
          <AlertDescription>{sendError}</AlertDescription>
        </Alert>
      )}

      <Composer
        disabled={!canSend}
        disabledReason={disabledReason}
        pending={sendMessage.isPending || sendMedia.isPending}
        capUsd={session.spend.cap_usd}
        dailyCapUsd={session.spend.daily_cap_usd}
        onSend={(body) => sendMessage.mutate({ kind: "text", body })}
        onSendMedia={(input) => sendMedia.mutate(input)}
        onSendLocation={(location) => sendMessage.mutate({ kind: "location", location })}
      />
    </section>
  );
}
