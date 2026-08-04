"use client";

/**
 * Menú ⋮ de una fila de ejecución. En F3 solo Cancelar (visible si el estado
 * lo permite; el 409 `run_not_cancelable` se mapea igual por si el estado
 * cambió entre el render y el click). F4 añade "Ver detalle".
 */
import { useState } from "react";
import { CircleSlash, MoreVertical } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Modal } from "@/shared/components/ui/modal";
import { isRunCancelable, type RunListItem } from "../../../../domain/quality-runs";
import { useCancelRun } from "../../../../infrastructure/api/hooks/use-quality-runs";

export function RunRowActions({ run }: { run: RunListItem }) {
  const { showAlert } = useAlert();
  const cancelRun = useCancelRun();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!isRunCancelable(run.status)) return null;

  async function cancel() {
    try {
      await cancelRun.mutateAsync(run.id);
      setConfirmOpen(false);
      showAlert({
        tone: "success",
        title: "Ejecución cancelada",
        description: "Los cases en cola quedan bloqueados; los que corrían se cortan en ≤1 turno.",
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo cancelar", description: errorMessage(error) });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de la ejecución en ${run.company_name}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MoreVertical aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => setConfirmOpen(true)}>
            <CircleSlash aria-hidden="true" className="size-4" />
            Cancelar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        config={{
          title: "Cancelar esta ejecución",
          description: `Se detiene la ejecución ${run.kind === "stress" ? "de estrés" : "de QA"} en ${run.company_name}. Los datos generados hasta ahora se conservan (puedes purgarlos después).`,
          actions: [
            { label: "Volver", variant: "outline", asClose: true },
            {
              label: cancelRun.isPending ? "Cancelando…" : "Cancelar ejecución",
              onClick: () => void cancel(),
            },
          ],
        }}
      />
    </>
  );
}
