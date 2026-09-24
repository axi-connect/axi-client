"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, StickyNote } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { PLAN_NOTE_MAX } from "@/modules/collections/domain/promise";
import { addPlanNote } from "@/modules/collections/infrastructure/services/collections-service.adapter";

/**
 * La nota del plan (F4b): una sola pregunta. Lo que el equipo debe saber para
 * cobrar este plan, que el cliente no ve. El servidor la guarda como historial
 * y la pantalla enseña la última: «editar» es escribir la siguiente.
 */
export function PlanNoteDialog({
  planId,
  current,
  open,
  onOpenChange,
  onDone,
}: {
  planId: string;
  /** La nota vigente, para partir de ella. */
  current: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const { showAlert } = useAlert();
  const [note, setNote] = useState(current ?? "");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setNote(current ?? "");
  }, [open, current]);

  const trimmed = note.trim();
  const canSubmit =
    trimmed !== "" && trimmed !== (current ?? "").trim() && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addPlanNote(planId, trimmed);
      onOpenChange(false);
      onDone?.();
      showAlert({
        tone: "success",
        title: "Nota guardada",
        description: "La ve el equipo en el pedido; el cliente no.",
      });
    } catch (caught) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar",
        description: errorMessage(caught),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <StickyNote
              aria-hidden="true"
              className="size-5 text-muted-foreground"
            />
            Nota del plan
          </DialogTitle>
          <DialogDescription>
            Lo que el equipo debe saber para cobrar este plan. La ve el equipo,
            no el cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Textarea
            aria-label="Nota del plan"
            value={note}
            rows={4}
            maxLength={PLAN_NOTE_MAX}
            placeholder="Ej. cobra el 20; llamar antes de escribir"
            onChange={(event) => setNote(event.target.value)}
          />
          <p className="text-right text-[11.5px] text-muted-foreground tabular-nums">
            {note.length} / {PLAN_NOTE_MAX}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Una nota nueva reemplaza a la anterior en pantalla; el historial se
          conserva. Lo que quieras que el cliente lea va en un recordatorio, no
          aquí.
        </p>
        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Volver
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            Guardar nota
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
