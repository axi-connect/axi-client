"use client";

import { useState } from "react";
import { formatMoney, parseMoneyToCents } from "@/core/lib/format";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import { Textarea } from "@/shared/components/ui/textarea";
import type { DealDTO } from "@/modules/crm/domain/deal";
import { useBoardStore } from "@/modules/crm/infrastructure/stores/board.store";

export type WinLoseRequest = { deal: DealDTO; action: "win" | "lose" };

/**
 * Confirmación de Ganado/Perdido (win/lose son STATUS, nunca columnas).
 * Win permite el ajuste final del valor (edición humana — la IA jamás fija
 * `value_cents`); lose acepta un motivo opcional. Optimista vía board.store.
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
  const [valueDraft, setValueDraft] = useState(
    request.deal.value_cents !== null ? String(request.deal.value_cents / 100) : "",
  );
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isWin = request.action === "win";
  const parsedCents = valueDraft.trim() === "" ? undefined : parseMoneyToCents(valueDraft);
  const valueInvalid = isWin && valueDraft.trim() !== "" && parsedCents === null;

  const handleConfirm = async () => {
    setSubmitting(true);
    const result = await transition(request.deal.id, request.action, {
      value_cents: isWin && parsedCents !== null ? parsedCents : undefined,
      reason: !isWin && reason.trim() !== "" ? reason.trim() : undefined,
    });
    setSubmitting(false);
    if (result.ok) {
      showAlert({
        tone: "success",
        title: isWin ? "Oportunidad ganada 🎉" : "Oportunidad marcada como perdida",
        open: true,
      });
      onOpenChange(false);
    } else {
      showAlert({ tone: "error", title: result.message, open: true });
    }
  };

  return (
    <Modal
      open={true}
      onOpenChange={onOpenChange}
      config={{
        title: isWin ? "Marcar como ganada" : "Marcar como perdida",
        description: isWin
          ? `“${request.deal.title}” — el contacto pasará a Cliente automáticamente.`
          : `“${request.deal.title}” — podrás reabrirla más adelante si cambia la situación.`,
        className: "sm:max-w-md",
        actions: [],
      }}
    >
      <div className="space-y-4">
        {isWin ? (
          <div className="space-y-1.5">
            <label htmlFor="win-value" className="text-xs font-medium text-muted-foreground">
              Valor final (opcional)
            </label>
            <Input
              id="win-value"
              inputMode="decimal"
              value={valueDraft}
              onChange={(e) => setValueDraft(e.target.value)}
              placeholder={
                request.deal.value_cents !== null
                  ? formatMoney(request.deal.value_cents, request.deal.currency)
                  : "350000"
              }
              aria-invalid={valueInvalid}
            />
            {valueInvalid && (
              <p className="text-xs text-destructive">Ingresa un monto válido</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="lose-reason" className="text-xs font-medium text-muted-foreground">
              Motivo (opcional)
            </label>
            <Textarea
              id="lose-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Se fue con la competencia, precio, sin respuesta…"
              rows={3}
            />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant={isWin ? "default" : "destructive"}
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
