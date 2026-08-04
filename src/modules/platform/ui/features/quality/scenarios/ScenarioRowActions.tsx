"use client";

/**
 * Menú ⋮ de una fila de escenario. Los `is_system` solo exponen Ver y Clonar
 * (spec D12: prevenir el 403 por diseño). Archivar es REVERSIBLE (DELETE =
 * archiva; se restaura con PATCH status) → Modal simple, nunca ConfirmTyped.
 */
import { useState } from "react";
import { Archive, ArchiveRestore, Copy, Eye, MoreVertical, PencilLine } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Modal } from "@/shared/components/ui/modal";
import type { Scenario } from "../../../../domain/quality";
import {
  useArchiveScenario,
  useUpdateScenario,
} from "../../../../infrastructure/api/hooks/use-quality-scenarios";

type ScenarioRowActionsProps = {
  scenario: Scenario;
  onView: (scenario: Scenario) => void;
  onEdit: (scenario: Scenario) => void;
  onClone: (scenario: Scenario) => void;
};

export function ScenarioRowActions({ scenario, onView, onEdit, onClone }: ScenarioRowActionsProps) {
  const { showAlert } = useAlert();
  const archiveScenario = useArchiveScenario();
  const updateScenario = useUpdateScenario();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const isArchived = scenario.status === "archived";
  const canMutate = !scenario.is_system;

  async function archive() {
    try {
      await archiveScenario.mutateAsync(scenario.id);
      setArchiveOpen(false);
      showAlert({
        tone: "success",
        title: "Escenario archivado",
        description: `${scenario.name} dejó de ser elegible en suites y ejecuciones nuevas.`,
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo archivar", description: errorMessage(error) });
    }
  }

  async function restore() {
    try {
      // El PATCH exige max_turns y tags: se reenvían los actuales.
      await updateScenario.mutateAsync({
        id: scenario.id,
        body: { status: "active", max_turns: scenario.max_turns, tags: scenario.tags },
      });
      showAlert({
        tone: "success",
        title: "Escenario restaurado",
        description: `${scenario.name} vuelve a estar disponible.`,
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo restaurar", description: errorMessage(error) });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de ${scenario.name}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MoreVertical aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => onView(scenario)}>
            <Eye aria-hidden="true" className="size-4" />
            Ver
          </DropdownMenuItem>
          {canMutate && !isArchived && (
            <DropdownMenuItem className="flex items-center gap-2" onClick={() => onEdit(scenario)}>
              <PencilLine aria-hidden="true" className="size-4" />
              Editar
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => onClone(scenario)}>
            <Copy aria-hidden="true" className="size-4" />
            Clonar
          </DropdownMenuItem>
          {canMutate && (
            <>
              <DropdownMenuSeparator />
              {isArchived ? (
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => void restore()}>
                  <ArchiveRestore aria-hidden="true" className="size-4" />
                  Restaurar
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => setArchiveOpen(true)}>
                  <Archive aria-hidden="true" className="size-4" />
                  Archivar
                </DropdownMenuItem>
              )}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        config={{
          title: `Archivar «${scenario.name}»`,
          description:
            "Dejará de aparecer en suites y ejecuciones nuevas; las suites que lo incluyen lo omitirán. Podrás restaurarlo cuando quieras.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            {
              label: archiveScenario.isPending ? "Archivando…" : "Archivar",
              onClick: () => void archive(),
            },
          ],
        }}
      />
    </>
  );
}
