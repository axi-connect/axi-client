"use client";

/**
 * Diálogo de clonado: única vía de "editar" un escenario de sistema. Pide el
 * `code` nuevo (snake_case) y un nombre opcional; al 201 avisa al padre con
 * el id para abrir el clon en edición. 409 `scenario_code_taken` → error
 * inline sin cerrar.
 */
import { useState } from "react";
import { isHttpError } from "@/core/api/problem";
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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  CODE_MAX,
  CODE_MIN,
  SCENARIO_CODE_REGEX,
  type Scenario,
} from "../../../../domain/quality";
import { useCloneScenario } from "../../../../infrastructure/api/hooks/use-quality-scenarios";

type CloneScenarioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Escenario origen (null = cerrado). */
  scenario: Scenario | null;
  /** Recibe el id del clon recién creado (para abrirlo en edición). */
  onCloned?: (id: string) => void;
};

export function CloneScenarioDialog({ open, onOpenChange, scenario, onCloned }: CloneScenarioDialogProps) {
  const { showAlert } = useAlert();
  const cloneScenario = useCloneScenario();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  function reset() {
    setCode("");
    setName("");
    setCodeError(null);
  }

  async function submit() {
    if (!scenario) return;
    const trimmed = code.trim();
    if (trimmed.length < CODE_MIN || trimmed.length > CODE_MAX || !SCENARIO_CODE_REGEX.test(trimmed)) {
      setCodeError("Solo minúsculas, números y guion bajo (2–60); empieza por letra.");
      return;
    }
    try {
      const { id } = await cloneScenario.mutateAsync({
        id: scenario.id,
        body: { code: trimmed, ...(name.trim() ? { name: name.trim() } : {}) },
      });
      showAlert({
        tone: "success",
        title: "Escenario clonado",
        description: `«${trimmed}» ya es tuyo: ajústalo a tu gusto.`,
        autoCloseMs: 5000,
      });
      onOpenChange(false);
      reset();
      onCloned?.(id);
    } catch (error) {
      if (isHttpError(error) && error.is("quality/scenario_code_taken")) {
        setCodeError("Este código ya existe.");
        return;
      }
      showAlert({ tone: "error", title: "No se pudo clonar", description: errorMessage(error) });
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clonar «{scenario?.name ?? ""}»</DialogTitle>
          <DialogDescription>
            El clon copia persona, objetivo y criterios; queda como escenario propio y editable.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="clone-code">Código nuevo *</Label>
            <Input
              id="clone-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(null);
              }}
              placeholder={`${scenario?.code ?? "escenario"}_v2`}
              className="font-mono"
              autoComplete="off"
            />
            {codeError && (
              <p className="text-xs text-destructive" role="alert">
                {codeError}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clone-name">Nombre (opcional)</Label>
            <Input
              id="clone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={scenario ? `${scenario.name} (variante)` : ""}
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={cloneScenario.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={cloneScenario.isPending}>
            {cloneScenario.isPending ? "Clonando…" : "Clonar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
