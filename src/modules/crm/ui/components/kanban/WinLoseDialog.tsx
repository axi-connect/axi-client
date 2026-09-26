"use client";

import { RotateCcw, TrendingUp, UserRound } from "lucide-react";
import { useState } from "react";

import { formatMillions, formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import type { DealDTO } from "@/modules/crm/domain/deal";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { Textarea } from "@/shared/components/ui/textarea";

import { PERIOD_LABELS } from "../PipelineSummary";

export type WinLoseRequest = { deal: DealDTO; action: "win" | "lose" };

/** Motivos rápidos: rellenan el `lost_reason` (texto libre en el servidor). */
export const LOSE_REASONS = ["Precio", "Se fue con otro", "Sin respuesta", "Cambió de planes", "Otro motivo"] as const;

/** El motivo que se guarda: «Sin respuesta · detalle». «Otro motivo» no se escribe: lo dice el detalle. */
export function composeLostReason(reason: string | null, detail: string): string {
  const text = detail.trim();
  if (reason === null || reason === "Otro motivo") return text;
  return text === "" ? reason : `${reason} · ${text}`;
}

function Outcome({ icon: Icon, title, detail }: { icon: typeof TrendingUp; title: string; detail: string }) {
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-3 border-t border-border py-2.5 first:border-t-0">
      <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-pretty">{title}</p>
        <p className="text-xs text-pretty text-muted-foreground">{detail}</p>
      </div>
    </li>
  );
}

/**
 * Ganar o perder (win/lose son STATUS, nunca columnas; lienzo CRM premium F1,
 * tableros 5 y 6). Diálogo sólido, como los de Cobros.
 *
 * - Ganar deja ajustar el valor final (edición humana: la IA jamás fija
 *   `value_cents`) y dice qué pasa al confirmar.
 * - Perder ofrece motivos en un toque, un detalle opcional y enseña el motivo
 *   tal como quedará guardado.
 */
export function WinLoseDialog({
  request,
  onOpenChange,
}: {
  request: WinLoseRequest;
  onOpenChange: (open: boolean) => void;
}) {
  const { showAlert } = useAlert();
  const transition = useBoardStore((s) => s.transition);
  const stats = useBoardStore((s) => s.stats);
  const statsPeriod = useBoardStore((s) => s.statsPeriod);
  const { deal } = request;
  const [valueDraft, setValueDraft] = useState(deal.value_cents !== null ? (deal.value_cents / 100).toLocaleString("es-CO", { maximumFractionDigits: 2 }) : "");
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isWin = request.action === "win";
  const contactName = deal.contact.full_name ?? deal.contact.phone ?? "El contacto";
  const parsedCents = valueDraft.trim() === "" ? undefined : parseMoneyToCents(valueDraft);
  const valueInvalid = isWin && valueDraft.trim() !== "" && parsedCents === null;
  const finalCents = parsedCents ?? deal.value_cents ?? 0;
  const lostReason = composeLostReason(reason, detail);

  const handleConfirm = async () => {
    setSubmitting(true);
    const result = await transition(deal.id, request.action, {
      value_cents: isWin && parsedCents !== null ? parsedCents : undefined,
      reason: !isWin && lostReason !== "" ? lostReason : undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      showAlert({
        tone: "success",
        title: isWin ? "Oportunidad ganada" : "Oportunidad marcada como perdida",
        description: isWin
          ? `${contactName} ya es cliente${finalCents > 0 ? ` · ${formatMoney(finalCents, deal.currency)}` : ""}.`
          : "Queda en Perdidas con su motivo.",
      });
      onOpenChange(false);
    } else {
      showAlert({ tone: "error", title: result.message });
    }
  };

  const wonAfter =
    stats !== null && finalCents > 0
      ? `Las ganadas de ${PERIOD_LABELS[statsPeriod].toLowerCase()} quedan en ${stats.won_count + 1} · ${formatMillions(stats.won_value_cents + finalCents, stats.currency)}`
      : "Deja de contar en el pronóstico de las abiertas";

  return (
    <Modal
      open={true}
      onOpenChange={onOpenChange}
      config={{
        title: isWin ? "Marcar como ganada" : "Marcar como perdida",
        description: `${deal.title} · ${contactName}`,
        className: "sm:max-w-[32rem]",
        // Sin la X de 16 px: «Cancelar» y Escape ya cierran (objetivo ≥ 24 px, §11).
        showCloseButton: false,
        actions: [],
      }}
    >
      <div className="min-w-0 space-y-5">
        {isWin ? (
          <>
            <div className="space-y-1.5">
              <label htmlFor="win-value" className="text-xs font-medium text-muted-foreground">
                Valor final
              </label>
              <Input
                id="win-value"
                inputMode="decimal"
                value={valueDraft}
                onChange={(e) => setValueDraft(e.target.value)}
                placeholder={deal.value_cents !== null ? formatMoney(deal.value_cents, deal.currency) : "350.000"}
                aria-invalid={valueInvalid}
                aria-describedby="win-value-hint"
                className="h-12 rounded-xl font-heading text-xl font-bold tabular-nums"
              />
              {valueInvalid ? (
                <p id="win-value-hint" className="text-xs text-destructive">
                  Escribe un monto válido, por ejemplo 8.900.000.
                </p>
              ) : (
                <p id="win-value-hint" className="text-xs text-pretty text-muted-foreground">
                  Si cerró por otro monto, cámbialo aquí: es el que suma a Ganadas. Axi nunca fija el valor.
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Al confirmar</p>
              <ul className="mt-1.5">
                <Outcome icon={UserRound} title={`${contactName} pasa a Cliente`} detail="Su etapa de contacto cambia sola" />
                <Outcome icon={TrendingUp} title="Sale del tablero y suma a Ganadas" detail={wonAfter} />
                <Outcome icon={RotateCcw} title="Puedes reabrirla si hace falta" detail="Desde su detalle, con todo su historial" />
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <p id="lose-q" className="text-xs font-medium text-muted-foreground">
                ¿Qué pasó?
              </p>
              <div role="radiogroup" aria-labelledby="lose-q" className="flex flex-wrap gap-2">
                {LOSE_REASONS.map((option) => {
                  const checked = reason === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => setReason(checked ? null : option)}
                      className={cn(
                        "h-9 rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        checked
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lose-detail" className="text-xs font-medium text-muted-foreground">
                Detalle (opcional)
              </label>
              <Textarea
                id="lose-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Qué dijo, con quién se fue, qué haría falta para retomarla…"
                rows={3}
                maxLength={500}
                className="max-h-40 resize-y rounded-xl"
              />
            </div>
            {lostReason !== "" && (
              <div className="rounded-2xl bg-muted px-4 py-3">
                <p className="text-xs text-muted-foreground">Así queda el motivo</p>
                <p className="mt-0.5 text-sm text-pretty break-words">{lostReason}</p>
              </div>
            )}
            <p className="text-xs text-pretty text-muted-foreground">
              Queda en Perdidas con su motivo. Si {contactName} vuelve a escribir, la reabres desde su detalle.
            </p>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={isWin ? "default" : "destructive"}
            className="rounded-full"
            disabled={submitting || valueInvalid}
            onClick={() => void handleConfirm()}
          >
            {submitting ? "Guardando…" : isWin ? "Marcar ganada" : "Marcar perdida"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
