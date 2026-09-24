"use client";

/**
 * «Convertir en escenario» (upgrade quality F5): pide al servidor un borrador
 * a partir de la conversación (real, de un case o de una sesión) y abre el
 * formulario de escenario prellenado. Nada se guarda hasta «Guardar».
 */
import { useState } from "react";
import { ClipboardPlus } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/lib/utils";
import type { ScenarioDraft } from "../../../../domain/quality-capabilities";
import { useDraftScenarioFromConversation } from "../../../../infrastructure/api/hooks/use-quality-capabilities";
import { ScenarioFormSheet } from "../scenarios/ScenarioFormSheet";

type ConvertToScenarioButtonProps = {
  companyId: string;
  conversationId: string;
  size?: "sm" | "default";
  variant?: "outline" | "ghost";
  className?: string;
};

export function ConvertToScenarioButton({ companyId, conversationId, size = "sm", variant = "outline", className }: ConvertToScenarioButtonProps) {
  const { showAlert } = useAlert();
  const draftScenario = useDraftScenarioFromConversation();
  const [draft, setDraft] = useState<ScenarioDraft | null>(null);

  function convert() {
    draftScenario.mutate(
      { company_id: companyId, conversation_id: conversationId },
      {
        onSuccess: (result) => setDraft(result),
        onError: (error) =>
          showAlert({ tone: "error", title: "No se pudo generar el borrador", description: errorMessage(error) }),
      },
    );
  }

  return (
    <>
      <Button type="button" size={size} variant={variant} className={cn(className)} onClick={convert} disabled={draftScenario.isPending}>
        <ClipboardPlus aria-hidden="true" />
        {draftScenario.isPending ? "Generando borrador…" : "Convertir en escenario"}
      </Button>
      <ScenarioFormSheet
        open={draft !== null}
        onOpenChange={(open) => {
          if (!open) setDraft(null);
        }}
        mode="create"
        scenario={null}
        draft={draft}
        key={draft === null ? "closed" : `draft-${draft.source.conversation_id}-${draft.code}`}
      />
    </>
  );
}
