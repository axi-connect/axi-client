"use client";

/**
 * Confirmación según el riesgo (regla de todo el panel, decisión 5 de
 * Cristian). La decisión de qué pedir vive en `domain/risk.ts`:
 *
 * - `reversible` → sin diálogo: se hace, queda un aviso y «Deshacer».
 * - `important` → diálogo con lo que va a pasar y un botón con el verbo.
 * - `destructive` → lo mismo y, además, escribir el nombre exacto.
 *
 * Quien pide no cerrar es quien cierra (regla `modal-keepopen`): el diálogo
 * sigue abierto mientras la acción corre y si falla; solo se cierra cuando la
 * acción terminó bien. Un error nunca se traga: se pinta dentro del diálogo
 * (o en un aviso, en lo reversible).
 */
import { useCallback, useEffect, useId, useState } from "react";
import { CircleAlert, LoaderCircle, TriangleAlert } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { canConfirm, confirmationFor, type RiskLevel } from "../../domain/risk";
import { ProblemAlert } from "./ProblemAlert";

export type RiskConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: Exclude<RiskLevel, "reversible">;
  title: string;
  /** Una frase de contexto, en claro y con tuteo. */
  description?: React.ReactNode;
  /** «Lo que va a pasar», una línea por efecto. */
  consequences?: readonly React.ReactNode[];
  /** El verbo del botón final («Suspender», «Guardar la ruta»). */
  confirmLabel: string;
  /** En `destructive`: lo que hay que escribir (el nombre de la empresa, el número). */
  confirmText?: string;
  onConfirm: () => void | Promise<void>;
  /** Deshabilita todo mientras la acción está en vuelo. */
  pending?: boolean;
  /** El error de la última vez: se pinta dentro, el diálogo no se cierra. */
  error?: unknown;
};

export function RiskConfirmDialog({
  open,
  onOpenChange,
  level,
  title,
  description,
  consequences,
  confirmLabel,
  confirmText,
  onConfirm,
  pending = false,
  error,
}: RiskConfirmDialogProps) {
  const inputId = useId();
  const [typed, setTyped] = useState("");
  const typedKind = confirmationFor(level) === "typed";
  const ready = canConfirm(level, typed, confirmText);
  const Icon = level === "destructive" ? TriangleAlert : CircleAlert;

  // El texto escrito no sobrevive entre aperturas (re-confirmar siempre).
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2.5 font-heading text-lg leading-snug">
            <Icon
              aria-hidden="true"
              className={level === "destructive" ? "mt-1 size-5 shrink-0 text-destructive" : "mt-1 size-5 shrink-0 text-muted-foreground"}
            />
            <span className="min-w-0 [overflow-wrap:anywhere]">{title}</span>
          </DialogTitle>
          {description ? (
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
            </DialogDescription>
          ) : (
            <DialogDescription className="sr-only">Confirma la acción</DialogDescription>
          )}
        </DialogHeader>

        {consequences && consequences.length > 0 ? (
          <div className="rounded-2xl border border-border p-4">
            <p className="mb-2 text-xs text-muted-foreground">Lo que va a pasar</p>
            <ul className="space-y-1.5 text-sm">
              {consequences.map((line, index) => (
                <li key={index} className="grid grid-cols-[8px_minmax(0,1fr)] gap-2.5">
                  <span aria-hidden="true" className="mt-2 size-1.5 rounded-full bg-muted-foreground" />
                  <span className="[overflow-wrap:anywhere]">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {typedKind ? (
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="text-sm [overflow-wrap:anywhere]">
              Escribe <span className="font-semibold text-foreground">{confirmText}</span> para confirmar:
            </label>
            <Input
              id={inputId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={confirmText}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              aria-describedby={`${inputId}-hint`}
            />
            <p id={`${inputId}-hint`} className="sr-only">
              El botón {confirmLabel} se habilita al escribir el texto exacto.
            </p>
          </div>
        ) : null}

        {error !== undefined && error !== null ? <ProblemAlert error={error} /> : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant={level === "destructive" ? "destructive" : "default"}
            disabled={!ready || pending}
            onClick={() => void onConfirm()}
          >
            {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Lo que se le pide a `useRiskConfirm().request`. */
export type RiskAction = {
  level: RiskLevel;
  title: string;
  description?: React.ReactNode;
  consequences?: readonly React.ReactNode[];
  confirmLabel: string;
  confirmText?: string;
  run: () => Promise<unknown>;
  /** El aviso de éxito (obligatorio en `reversible`: es lo único que se ve). */
  done?: { title: string; description?: string };
  /** Solo `reversible`: cómo se deshace. Sin esto el aviso no ofrece «Deshacer». */
  undo?: () => Promise<unknown>;
};

/**
 * La regla en un hook: `request(action)` decide según `action.level`.
 * Devuelve el diálogo (`dialog`) para que la vista lo monte una vez.
 */
export function useRiskConfirm() {
  const { showAlert } = useAlert();
  const [action, setAction] = useState<RiskAction | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const announceDone = useCallback(
    (current: RiskAction) => {
      if (!current.done) return;
      const undo = current.undo;
      showAlert({
        tone: "success",
        title: current.done.title,
        description: current.done.description,
        actions: undo
          ? [
              {
                label: "Deshacer",
                onClick: () => {
                  undo().catch((undoError: unknown) =>
                    showAlert({ tone: "error", title: "No se pudo deshacer", description: errorMessage(undoError) }),
                  );
                },
              },
            ]
          : undefined,
      });
    },
    [showAlert],
  );

  const request = useCallback(
    (next: RiskAction) => {
      if (confirmationFor(next.level) === "none") {
        next
          .run()
          .then(() => announceDone(next))
          .catch((runError: unknown) =>
            showAlert({ tone: "error", title: "No se pudo completar", description: errorMessage(runError) }),
          );
        return;
      }
      setAction(next);
      setError(null);
      setOpen(true);
    },
    [announceDone, showAlert],
  );

  const confirm = useCallback(async () => {
    if (!action) return;
    setPending(true);
    setError(null);
    try {
      await action.run();
      setOpen(false);
      announceDone(action);
    } catch (runError) {
      setError(runError);
    } finally {
      setPending(false);
    }
  }, [action, announceDone]);

  const dialog =
    action && action.level !== "reversible" ? (
      <RiskConfirmDialog
        open={open}
        onOpenChange={setOpen}
        level={action.level}
        title={action.title}
        description={action.description}
        consequences={action.consequences}
        confirmLabel={action.confirmLabel}
        confirmText={action.confirmText}
        onConfirm={confirm}
        pending={pending}
        error={error ?? undefined}
      />
    ) : null;

  return { request, dialog };
}
