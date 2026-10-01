"use client";

import { useMemo, useState } from "react";
import { Check, LoaderCircle } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Kicker } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";

import type { BatchItem, Routine } from "../../domain/autopilot";
import { batchCopy } from "../../domain/copy";
import { decideBatch } from "../../infrastructure/autopilot-service.adapter";
import { StatusDot } from "./StatusDot";

/**
 * «Tu aprobación» (Piloto, R1): la isla de cristal del lote de una
 * piloto CON TU APROBACIÓN. La salida se detuvo antes de escribirles y espera a
 * que apruebes a quién; lo que no se aprueba se omite. Es la única isla de En
 * vivo: la frase de ahora ya encabeza el mapa.
 */
export function BatchIsland({
  runId,
  items,
  routine,
  sequenceName,
  canManage,
  onDecided,
}: {
  runId: string;
  items: BatchItem[];
  routine: Pick<Routine, "contact"> | null;
  sequenceName: string | null;
  canManage: boolean;
  onDecided: () => void;
}) {
  const { showAlert } = useAlert();
  const [approved, setApproved] = useState<ReadonlySet<string>>(() => new Set(items.map((item) => item.id)));
  const [sending, setSending] = useState(false);
  const skipped = useMemo(() => items.filter((item) => !approved.has(item.id)).map((item) => item.id), [items, approved]);
  const copy = batchCopy({
    total: items.length,
    approved: approved.size,
    routine: routine ?? { contact: { channels: [], agent_id: null, goal: "" } },
    sequenceName,
  });

  async function decide() {
    setSending(true);
    try {
      await decideBatch(runId, { approve: [...approved], skip: skipped });
      onDecided();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se guardó la decisión", description: errorMessage(caught) });
    } finally {
      setSending(false);
    }
  }

  return (
    <Island as="section" aria-label="Tu aprobación" className="flex min-w-0 flex-col p-[22px] sm:p-6">
      <div className="flex items-center justify-between gap-2.5">
        <Kicker>Tu aprobación</Kicker>
        <StatusDot tone="warning">{copy.pill}</StatusDot>
      </div>
      <h3 className="font-heading mt-2.5 text-[22px] leading-[1.15] font-bold tracking-[-0.02em] sm:text-2xl">{copy.title}</h3>
      <p className="text-muted-foreground mt-1.5 text-[13.5px] text-pretty">{copy.detail}</p>
      <ul className="mt-3.5 flex flex-col">
        {items.map((item) => {
          const name = item.display_name?.trim() || item.company_name?.trim() || "Cuenta sin nombre";
          const company = item.display_name?.trim() ? (item.company_name?.trim() ?? "") : "";
          const on = approved.has(item.id);
          return (
            <li key={item.id} className="border-foreground/[0.08] border-t first:border-t-0">
              <label className={cn("grid min-h-11 cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-2.5 py-[11px]", !canManage && "cursor-default")}>
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={on}
                  disabled={!canManage}
                  aria-label={`Aprobar ${[name, company].filter(Boolean).join(" · ")}`}
                  onChange={(event) =>
                    setApproved((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(item.id);
                      else next.delete(item.id);
                      return next;
                    })
                  }
                />
                <span
                  aria-hidden
                  className={cn(
                    "peer-focus-visible:outline-ring grid size-[22px] place-items-center rounded-md border-[1.5px] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2",
                    on ? "bg-foreground border-foreground text-background" : "border-foreground/40",
                  )}
                >
                  {on && <Check className="size-3" strokeWidth={3} />}
                </span>
                {/* Aprobar exige leer a quién: el nombre y la empresa van completos, en dos líneas. */}
                <span className="min-w-0">
                  <b className="block text-[13.5px] font-medium break-words">{name}</b>
                  {company !== "" && <span className="text-muted-foreground block text-xs break-words">{company}</span>}
                </span>
                {item.score !== null && (
                  <span title="Puntaje" className="bg-foreground/[0.06] rounded-full px-2 py-0.5 font-mono text-xs tabular-nums">
                    <span className="sr-only">Puntaje </span>
                    {String(item.score)}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      {canManage && (
        <div className="mt-4 flex flex-col items-stretch gap-2">
          <Button
            className="h-[42px] rounded-full text-[14.5px]"
            variant={approved.size === 0 ? "contrast" : "default"}
            disabled={sending}
            onClick={() => void decide()}
          >
            {sending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : approved.size > 0 && <Check aria-hidden className="size-4" />}
            {copy.cta}
          </Button>
          <span className="text-muted-foreground text-center text-[12.5px]">{copy.skippedNote}</span>
        </div>
      )}
    </Island>
  );
}
