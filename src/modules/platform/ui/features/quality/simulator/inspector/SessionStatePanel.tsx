"use client";

/**
 * Pestaña «Estado» del inspector: gasto vs tope (sesión y diario), turnos,
 * conversación (modo, estado, intención), aviso si otro agente respondió
 * (H3) y las acciones: finalizar, nueva sesión igual, purgar.
 */
import Link from "next/link";
import { RotateCcw, ShieldAlert, Square, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { StatTile } from "@/shared/components/features/stat-tile";
import {
  AGENT_STATE_LABELS,
  END_REASON_LABELS,
  formatUsd,
  SESSION_IDLE_TIMEOUT_MIN,
  spendPercent,
  type SessionDetail,
} from "../../../../../domain/quality-sessions";
import { StatusBadge } from "../../../../components/StatusBadge";

type SessionStatePanelProps = {
  session: SessionDetail;
  onEnd: () => void;
  onPurge: () => void;
  ending: boolean;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-1.5 text-sm last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-right font-medium tabular-nums">{children}</span>
    </div>
  );
}

export function SessionStatePanel({ session, onEnd, onPurge, ending }: SessionStatePanelProps) {
  const active = session.status === "active";
  const sessionPct = spendPercent(session.spend.spent_usd, session.spend.cap_usd);
  const dailyPct = spendPercent(session.spend.daily_spent_usd, session.spend.daily_cap_usd);
  const modeLabel =
    session.conversation?.mode === "ai_active" ? "IA activa" : session.conversation?.mode === "human_queued" ? "En cola humana" : session.conversation?.mode === "human_active" ? "Con operador" : "—";

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sesión</h3>
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            label="Gasto"
            value={formatUsd(session.spend.spent_usd ?? 0)}
            hint={`de ${formatUsd(session.spend.cap_usd)}${sessionPct !== null ? ` · ${sessionPct} %` : ""}`}
            tone={sessionPct !== null && sessionPct >= 80 ? "warning" : "default"}
          />
          <StatTile
            label="Diario"
            value={formatUsd(session.spend.daily_spent_usd ?? 0)}
            hint={`de ${formatUsd(session.spend.daily_cap_usd)}${dailyPct !== null ? ` · ${dailyPct} %` : ""}`}
            tone={dailyPct !== null && dailyPct >= 80 ? "warning" : "default"}
          />
          <StatTile label="Turnos" value={String(session.operator_turns)} hint="del operador" />
          <StatTile
            label="Agente"
            value={AGENT_STATE_LABELS[session.agent_state]}
            hint={active ? `cierre por inactividad a los ${SESSION_IDLE_TIMEOUT_MIN} min` : END_REASON_LABELS[session.ended_reason ?? "operator"]}
          />
        </div>
      </section>

      {session.agent_changed && (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-secondary px-3 py-2 text-xs">
          <ShieldAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
          <span>
            Un turno lo respondió <b>otro agente</b> distinto del fijado ({session.agent?.name ?? "—"}). El clasificador de intención re-asignó la conversación; la traza dice quién respondió cada turno.
          </span>
        </p>
      )}

      <section>
        <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Conversación</h3>
        <Row label="Modo">{modeLabel}</Row>
        <Row label="Estado">{session.conversation?.status ?? "—"}</Row>
        <Row label="Intención">
          {session.conversation?.intention ? (
            <>
              <span className="font-mono text-xs">{session.conversation.intention.code}</span>
              {session.conversation.intention.confidence !== null && (
                <span className="text-muted-foreground">· {session.conversation.intention.confidence.toFixed(2)}</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">sin clasificar</span>
          )}
        </Row>
        <Row label="Agente fijado">{session.agent?.name ?? "—"}</Row>
        {session.conversation?.closed_reason && <Row label="Cierre">{session.conversation.closed_reason}</Row>}
        <Row label="Sesión">
          <StatusBadge status={active ? "running" : session.ended_reason === "operator" || session.ended_reason === "closed_by_agent" ? "completed" : "canceled"} />
        </Row>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Acciones</h3>
        {active ? (
          <Button variant="outline" size="sm" className="w-full" onClick={onEnd} disabled={ending}>
            <Square aria-hidden="true" />
            {ending ? "Finalizando…" : "Finalizar sesión"}
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link
              href={`/platform/quality/simulator?company=${session.company_id}&agent=${session.agent?.id ?? ""}`}
              prefetch={false}
            >
              <RotateCcw aria-hidden="true" />
              Nueva sesión igual
            </Link>
          </Button>
        )}
        {!active && !session.purged && (
          <Button variant="ghost" size="sm" className="w-full text-destructive hover:text-destructive" onClick={onPurge}>
            <Trash2 aria-hidden="true" />
            Purgar datos
          </Button>
        )}
        <p className="text-[11px] text-muted-foreground">
          <ShieldAlert aria-hidden="true" className="mr-1 inline size-3" />
          Datos reales del tenant con marca <i>simulated</i>: no entran a analytics ni al inbox; se purgan aquí o a los 14 días.
        </p>
      </section>
    </div>
  );
}
