"use client";

import { useState } from "react";
import { LoaderCircle, PhoneOutgoing } from "lucide-react";
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
import { placeTestCall } from "@/modules/calls/infrastructure/services/calls-service.adapter";

/**
 * Banco de pruebas (gated `calls:place`): origina una llamada REAL al número
 * dado por el MISMO camino productivo — cuesta minutos del plan. La llamada
 * aparece en el Monitoreo al conectar (evento `call.started`).
 */
export function TestCallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { showAlert } = useAlert();
  const [to, setTo] = useState("");
  const [objective, setObjective] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (to.trim().length < 7 || submitting) return;
    setSubmitting(true);
    try {
      await placeTestCall({
        to: to.trim(),
        objective: objective.trim() || undefined,
      });
      showAlert({
        tone: "success",
        title: "Llamada en cola",
        description: "Aparecerá en el monitoreo al conectar. Consume minutos del plan.",
        open: true,
      });
      onOpenChange(false);
      setTo("");
      setObjective("");
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error), open: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Llamada de prueba</DialogTitle>
          <DialogDescription>
            Tu agente llamará al número que indiques por el mismo camino que una llamada real:
            aviso legal, conversación y transcript. Se descuenta de los minutos del plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="test-call-to">Número de destino</Label>
            <Input
              id="test-call-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="+57 300 123 4567"
              inputMode="tel"
              autoComplete="tel"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="test-call-objective">Objetivo (opcional)</Label>
            <Input
              id="test-call-objective"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="Ej.: ofrecer la limpieza dental de este mes"
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={submitting || to.trim().length < 7}>
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <PhoneOutgoing className="size-4" aria-hidden />
            )}
            Llamar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
