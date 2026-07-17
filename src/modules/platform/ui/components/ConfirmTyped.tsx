"use client";

/**
 * Confirmación fuerte para acciones de alto costo (suspender tenant,
 * migrate-data en FE4): expone las consecuencias y exige escribir el nombre
 * exacto para habilitar el botón destructivo — rojo semántico, nunca coral
 * (DESIGN.md mandamiento 8). Construido sobre el `Dialog` compartido.
 */
import { useEffect, useState } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
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

type ConfirmTypedProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Consecuencias de la acción, en claro y con tuteo. */
  description: React.ReactNode;
  /** Texto que el usuario debe escribir exactamente (p.ej. el nombre del tenant). */
  confirmText: string;
  /** Verbo del botón destructivo («Suspender», «Migrar datos»). */
  actionLabel: string;
  onConfirm: () => void | Promise<void>;
  /** Deshabilita todo mientras la mutación está en vuelo. */
  pending?: boolean;
};

export function ConfirmTyped({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  actionLabel,
  onConfirm,
  pending = false,
}: ConfirmTypedProps) {
  const [typed, setTyped] = useState("");
  const matches = typed === confirmText;

  // El texto escrito no debe sobrevivir entre aperturas (re-confirmar siempre).
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-md" showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TriangleAlert aria-hidden="true" className="size-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">{description}</div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <label htmlFor="confirm-typed-input" className="text-sm">
            Escribe <span className="font-semibold text-foreground">{confirmText}</span> para confirmar:
          </label>
          <Input
            id="confirm-typed-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmText}
            autoComplete="off"
            spellCheck={false}
            disabled={pending}
            aria-describedby="confirm-typed-hint"
          />
          <p id="confirm-typed-hint" className="sr-only">
            El botón {actionLabel} se habilita al escribir el texto exacto.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!matches || pending}
            onClick={() => void onConfirm()}
          >
            {pending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
