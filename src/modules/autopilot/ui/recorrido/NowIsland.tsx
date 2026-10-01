"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CircleCheck, LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Kicker, StatePill } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";

import { funnelOf, itemTitle, RUN_STATUS_META, type BatchItem, type Routine, type RunDetail } from "../../domain/autopilot";
import { decideBatch } from "../../infrastructure/autopilot-service.adapter";

export interface NowIslandProps {
  run: RunDetail;
  routine: Routine | null;
  /** «Ahora» y «Después», ya dichos (`copy.nowLine` / `copy.nextLine`). */
  now: { title: string; detail: string };
  next: string | null;
  /** El lote, si la ejecución espera tu aprobación. */
  batch: BatchItem[] | null;
  /** «Correo», «Llamada del agente»: por dónde se contacta. */
  channels: string[];
  sequenceName: string | null;
  canManage: boolean;
  onDecided: () => void;
}

/**
 * La isla «Ahora» de una ejecución (U1): qué hace el piloto en este momento,
 * qué viene, las tres cifras y el tope de créditos. Cuando la ejecución espera
 * tu aprobación, la isla SE CONVIERTE en el lote: mismas casillas, mismo
 * «Aprobar N y contactar», y debajo por dónde se contacta.
 */
export function NowIsland(props: NowIslandProps) {
  const { run, batch } = props;
  const waiting = run.status === "awaiting_approval" && batch !== null;
  const status = RUN_STATUS_META[run.status];
  return (
    <Island
      as="section"
      aria-label={waiting ? "El lote espera tu aprobación" : "Ahora"}
      glow={waiting ? "none" : "brand"}
      className={cn("flex min-w-0 flex-col gap-4 p-5", waiting && "ring-warning/60 ring-[1.5px]")}
    >
      <header className="flex min-w-0 items-start justify-between gap-3">
        <Kicker>{waiting ? "El lote espera tu aprobación" : "Ahora"}</Kicker>
        {waiting ? (
          <StatePill tone="warning">{String(batch.length)} cuentas</StatePill>
        ) : (
          <StatePill tone={status.tone}>{status.label}</StatePill>
        )}
      </header>
      {waiting ? <BatchBody {...props} items={batch} /> : <NowBody {...props} />}
    </Island>
  );
}

function NowBody({ run, routine, now, next }: NowIslandProps) {
  const perRun = routine?.budget.per_run ?? null;
  const spent = run.credits_spent;
  const atCap = perRun !== null && spent >= perRun;
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <p className="font-heading text-lg leading-snug font-bold text-pretty">{now.title}</p>
        <p className={cn("text-sm text-pretty", run.status === "failed" ? "text-destructive" : "text-muted-foreground")}>{now.detail}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        {funnelOf(run.counters).map((entry) => (
          <div key={entry.key} className="bg-background/70 ring-border flex min-w-0 flex-col rounded-2xl px-3 py-2.5 ring-1">
            <dt className="text-muted-foreground order-2 mt-1 text-xs">{entry.label}</dt>
            <dd className="font-heading order-1 text-2xl leading-none font-bold tabular-nums">{String(entry.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1.5">
        <p className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-sm">
          <span className="whitespace-nowrap">{atCap ? "Llegó al tope" : "Dentro del tope"}</span>
          <span className="font-mono text-xs tabular-nums">
            {perRun === null
              ? `${String(spent)} créditos`
              : `${String(spent)} de ${String(perRun)} créditos · ${String(Math.max(0, perRun - spent))} de reserva`}
          </span>
        </p>
        {perRun !== null && (
          <div
            role="meter"
            aria-label="Créditos de esta ejecución"
            aria-valuemin={0}
            aria-valuemax={perRun}
            aria-valuenow={Math.min(spent, perRun)}
            className="bg-muted h-1.5 overflow-hidden rounded-full"
          >
            <span
              className={cn("block h-full rounded-full", atCap ? "bg-warning" : "bg-foreground")}
              style={{ width: `${String(perRun === 0 ? 0 : Math.min(100, (spent / perRun) * 100))}%` }}
            />
          </div>
        )}
        <p className="text-muted-foreground text-xs text-pretty">
          Solo cuesta revelar: 1 crédito el correo y 8 el celular, de tu saldo en Apollo y solo si lo encuentra.
        </p>
      </div>

      {next !== null && (
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <ArrowRight aria-hidden className="size-4 shrink-0" />
          {next}
        </p>
      )}
      {routine !== null && (
        <p className="text-muted-foreground text-xs text-pretty">
          {routine.mode === "assisted"
            ? "Asistido · te pide aprobar el lote antes de escribirle a nadie."
            : "Autónomo · contacta sin esperar, siempre dentro de tu política y tus topes."}
        </p>
      )}
    </>
  );
}

/**
 * El lote de un piloto ASISTIDO: la ejecución se detuvo antes de contactar y
 * espera a que el dueño apruebe a quién. Lo que no se aprueba se omite.
 */
function BatchBody({
  run,
  now,
  items,
  channels,
  sequenceName,
  canManage,
  onDecided,
}: NowIslandProps & { items: BatchItem[] }) {
  const { showAlert } = useAlert();
  const [approved, setApproved] = useState<ReadonlySet<string>>(() => new Set(items.map((item) => item.id)));
  const [sending, setSending] = useState(false);
  const skipped = useMemo(() => items.filter((item) => !approved.has(item.id)).map((item) => item.id), [items, approved]);

  async function decide() {
    setSending(true);
    try {
      await decideBatch(run.id, { approve: [...approved], skip: skipped });
      onDecided();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se guardó la decisión", description: errorMessage(caught) });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <p className="text-muted-foreground text-sm text-pretty">{now.detail}</p>
      <ul className="divide-border divide-y">
        {items.map((item) => (
          <li key={item.id}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm">
              <Checkbox
                checked={approved.has(item.id)}
                disabled={!canManage}
                aria-label={`Aprobar ${itemTitle(item)}`}
                onChange={(event) =>
                  setApproved((current) => {
                    const next = new Set(current);
                    if (event.target.checked) next.add(item.id);
                    else next.delete(item.id);
                    return next;
                  })
                }
              />
              {/* Aprobar exige leer a quién: el nombre va completo, no cortado. */}
              <span className="min-w-0 flex-1 font-medium text-pretty break-words">{itemTitle(item)}</span>
              {item.score !== null && (
                <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">Puntaje {String(item.score)}</span>
              )}
            </label>
          </li>
        ))}
      </ul>
      {canManage && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button className="rounded-full" disabled={sending} onClick={() => void decide()}>
            {sending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <CircleCheck aria-hidden className="size-4" />}
            Aprobar {String(approved.size)} y contactar
          </Button>
          <span className="text-muted-foreground text-xs">
            {String(skipped.length)} {skipped.length === 1 ? "se omite" : "se omiten"}
          </span>
        </div>
      )}
      {(channels.length > 0 || sequenceName !== null) && (
        <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs text-pretty">
          {channels.length > 0 && <span>Se contacta por</span>}
          {channels.map((channel) => (
            <span key={channel} className="bg-muted text-foreground rounded-full px-2.5 py-0.5 font-medium">
              {channel}
            </span>
          ))}
          {sequenceName !== null && <span>{channels.length > 0 ? "y sigue" : "Sigue"} «{sequenceName}».</span>}
        </p>
      )}
    </>
  );
}
