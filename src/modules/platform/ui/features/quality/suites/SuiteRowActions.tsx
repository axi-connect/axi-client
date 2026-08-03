"use client";

/**
 * Menú ⋮ de una fila de suite. Las `is_system` solo exponen Ver composición
 * (solo lectura). Archivar/restaurar via PATCH `status` (no hay DELETE de
 * suites) → Modal simple, reversible.
 */
import { useState } from "react";
import { Archive, ArchiveRestore, ListOrdered, MoreVertical, PencilLine } from "lucide-react";
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
import type { SuiteListItem } from "../../../../domain/quality";
import { useUpdateSuite } from "../../../../infrastructure/api/hooks/use-quality-suites";

type SuiteRowActionsProps = {
  suite: SuiteListItem;
  onEdit: (suite: SuiteListItem) => void;
  onManageScenarios: (suite: SuiteListItem) => void;
};

export function SuiteRowActions({ suite, onEdit, onManageScenarios }: SuiteRowActionsProps) {
  const { showAlert } = useAlert();
  const updateSuite = useUpdateSuite();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const isArchived = suite.status === "archived";
  const canMutate = !suite.is_system;

  async function setStatus(status: "active" | "archived") {
    try {
      await updateSuite.mutateAsync({ id: suite.id, body: { status } });
      setArchiveOpen(false);
      showAlert({
        tone: "success",
        title: status === "archived" ? "Suite archivada" : "Suite restaurada",
        description:
          status === "archived"
            ? `${suite.name} dejó de ser elegible para ejecuciones nuevas.`
            : `${suite.name} vuelve a estar disponible.`,
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo actualizar la suite", description: errorMessage(error) });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de ${suite.name}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MoreVertical aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => onManageScenarios(suite)}>
            <ListOrdered aria-hidden="true" className="size-4" />
            {canMutate ? "Gestionar escenarios" : "Ver composición"}
          </DropdownMenuItem>
          {canMutate && (
            <>
              <DropdownMenuItem className="flex items-center gap-2" onClick={() => onEdit(suite)}>
                <PencilLine aria-hidden="true" className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {isArchived ? (
                <DropdownMenuItem className="flex items-center gap-2" onClick={() => void setStatus("active")}>
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
          title: `Archivar «${suite.name}»`,
          description:
            "La suite dejará de aparecer al lanzar ejecuciones nuevas. Podrás restaurarla cuando quieras.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            {
              label: updateSuite.isPending ? "Archivando…" : "Archivar",
              onClick: () => void setStatus("archived"),
            },
          ],
        }}
      />
    </>
  );
}
