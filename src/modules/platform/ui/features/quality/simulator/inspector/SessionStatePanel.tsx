"use client";

/**
 * Pestaña «Estado» del inspector (quality_premium_plan F2): arriba la isla
 * «Ahora» —qué está pasando y qué te toca—; debajo gasto de la sesión y del
 * día en tramos lineales, la ficha de la conversación (modo, estado,
 * intención), el aviso si otro agente respondió (H3) y las acciones:
 * finalizar, nueva sesión igual, convertir en escenario, purgar.
 */
import Link from "next/link";
import { RotateCcw, ShieldAlert, Square, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  END_REASON_LABELS,
  formatUsd,
  sessionStatusKey,
  spendPercent,
  type SessionDetail,
} from "../../../../../domain/quality-sessions";
import { ConvertToScenarioButton } from "../../shared/ConvertToScenarioButton";
import { BigFigure, InkPanel, Kicker, Meter, QualityStatus } from "../../shared/premium";

type SessionStatePanelProps = {
  session: SessionDetail;
  onEnd: () => void;
  onPurge: () => void;
  ending: boolean;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border py-2.5 text-sm first:border-t-0">
      <span className="whitespace-nowrap text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 text-right tabular-nums">{children}</span>
    </div>
  );
}

/** Qué pasa y qué le toca al operador, en una frase. Solo con datos del contrato. */
function nowCopy(session: SessionDetail): { title: string; detail: string } {
  const agent = session.agent?.name ?? "El agente";
  if (session.status !== "active") {
    return {
      title: END_REASON_LABELS[session.ended_reason ?? "operator"],
      detail: session.purged
        ? "Los datos de esta sesión ya se purgaron."
        : "Puedes convertirla en escenario o purgar sus datos. Se borran solos a los 14 días.",
    };
  }
  switch (session.agent_state) {
    case "thinking":
      return { title: `${agent} está escribiendo`, detail: "Tu mensaje ya entró al pipeline real; la respuesta aparece en el chat." };
    case "escalated":
      return { title: "Pasó a un humano", detail: "El agente ya no responde y ningún operador lo verá: lo simulado no entra al inbox del tenant. Finaliza la sesión." };
    case "closed":
      return { title: "El agente cerró la conversación", detail: "Finaliza la sesión para liberar el cupo y revisar el resultado." };
    default:
      return { title: "Tu turno", detail: `Escribe como el cliente o toca una opción. Se cierra sola tras ${session.limits.idle_timeout_min} min sin actividad.` };
  }
}

function SpendFigure({ label, spent, cap }: { label: string; spent: number | null | undefined; cap: number }) {
  const pct = spendPercent(spent, cap);
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-border p-3.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <BigFigure value={formatUsd(spent ?? 0)} size="sm" />
      <Meter value={(pct ?? 0) / 100} tone={pct !== null && pct >= 80 ? "warning" : "default"} label={`${label}: ${pct ?? 0} % del tope`} />
      <span className="text-[11px] text-muted-foreground tabular-nums">de {formatUsd(cap)}</span>
    </div>
  );
}

export function SessionStatePanel({ session, onEnd, onPurge, ending }: SessionStatePanelProps) {
  const active = session.status === "active";
  const now = nowCopy(session);
  const modeLabel =
    session.conversation?.mode === "ai_active" ? "IA activa" : session.conversation?.mode === "human_queued" ? "En cola humana" : session.conversation?.mode === "human_active" ? "Con operador" : "—";

  return (
    <div className="space-y-4">
      <InkPanel label="Ahora" className="p-4">
        <div className="flex items-center justify-between gap-2">
          <Kicker>Ahora</Kicker>
          <span className="text-xs tabular-nums opacity-70">
            {session.operator_turns} {session.operator_turns === 1 ? "turno" : "turnos"}
          </span>
        </div>
        <p className="font-heading text-xl leading-tight font-bold tracking-tight" aria-live="polite">
          {now.title}
        </p>
        <p className="text-xs leading-relaxed opacity-80">{now.detail}</p>
      </InkPanel>

      <div className="grid grid-cols-2 gap-2.5">
        <SpendFigure label="Gasto de la sesión" spent={session.spend.spent_usd} cap={session.spend.cap_usd} />
        <SpendFigure label="Gasto de hoy" spent={session.spend.daily_spent_usd} cap={session.spend.daily_cap_usd} />
      </div>

      {session.agent_changed && (
        <p className="flex items-start gap-2 rounded-2xl border border-border bg-secondary px-3 py-2.5 text-xs">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <span>
            Un turno lo respondió <b>otro agente</b> distinto del fijado ({session.agent?.name ?? "—"}). El clasificador de intención re-asignó la conversación; la traza dice quién respondió cada turno.
          </span>
        </p>
      )}

      <section aria-label="Conversación">
        <Row label="Sesión">
          <QualityStatus status={sessionStatusKey(session)} />
        </Row>
        <Row label="Modo">{modeLabel}</Row>
        <Row label="Estado">{session.conversation?.status ?? "—"}</Row>
        <Row label="Intención">
          {session.conversation?.intention ? (
            <>
              <span className="truncate font-mono text-xs">{session.conversation.intention.code}</span>
              {session.conversation.intention.confidence !== null && (
                <span className="text-muted-foreground">· {session.conversation.intention.confidence.toFixed(2)}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">sin clasificar</span>
          )}
        </Row>
        <Row label="Agente fijado">
          <span className="truncate">{session.agent?.name ?? "—"}</span>
        </Row>
        {session.conversation?.closed_reason && (
          <Row label="Cierre">
            <span className="truncate font-mono text-xs">{session.conversation.closed_reason}</span>
          </Row>
        )}
      </section>

      <section aria-label="Acciones" className="space-y-2">
        {active ? (
          <Button variant="outline" className="w-full" onClick={onEnd} disabled={ending}>
            <Square aria-hidden="true" />
            {ending ? "Finalizando…" : "Finalizar sesión"}
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full">
            <Link
              href={`/platform/quality/simulator?company=${session.company_id}&agent=${session.agent?.id ?? ""}`}
              prefetch={false}
            >
              <RotateCcw aria-hidden="true" />
              Nueva sesión igual
            </Link>
          </Button>
        )}
        {!active && !session.purged && session.conversation_id && (
          <ConvertToScenarioButton companyId={session.company_id} conversationId={session.conversation_id} className="w-full" />
        )}
        {!active && !session.purged && (
          <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={onPurge}>
            <Trash2 aria-hidden="true" />
            Purgar datos
          </Button>
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Datos del tenant con marca de simulados: no entran a analytics ni al inbox y se purgan aquí o a los 14 días.
        </p>
      </section>
    </div>
  );
}
