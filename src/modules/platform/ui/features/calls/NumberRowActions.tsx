"use client";

import { useState } from "react";
import { ArchiveRestore, MoreVertical, PhoneForwarded, Trash2 } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { ConfirmTyped } from "../../components/ConfirmTyped";
import type { CallNumberRow } from "../../../domain/call-provisioning";
import {
  useAssignCallNumber,
  useReleaseCallNumber,
} from "../../../infrastructure/api/hooks/use-call-provisioning";
import { AssignNumberSheet } from "./AssignNumberSheet";

/**
 * Acciones por número. Devolver al stock es reversible pero deja a un tenant
 * sin telefonía → confirmación; LIBERAR es irreversible en Twilio →
 * ConfirmTyped con el E.164.
 */
export function NumberRowActions({ number }: { number: CallNumberRow }) {
  const { showAlert } = useAlert();
  const assign = useAssignCallNumber();
  const release = useReleaseCallNumber();
  const [assigning, setAssigning] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [returning, setReturning] = useState(false);

  if (number.status === "released") {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  async function returnToStock() {
    if (assign.isPending) return;
    try {
      // Sin agente por defecto: un número en stock no «pertenece» a ningún agente
      await assign.mutateAsync({ id: number.id, company_id: null, default_ai_agent_id: null });
      setReturning(false);
      showAlert({
        tone: "success",
        title: "Número devuelto al stock",
        description: `${number.phone_number} ya no pertenece a ningún tenant.`,
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo devolver el número",
        description: errorMessage(error),
      });
    }
  }

  async function releaseNumber() {
    try {
      await release.mutateAsync(number.id);
      setReleasing(false);
      showAlert({
        tone: "success",
        title: "Número liberado en Twilio",
        description: "La renta mensual se detiene; la fila queda como historial.",
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo liberar el número",
        description: errorMessage(error),
      });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de ${number.phone_number}`}
            className="text-muted-foreground hover:bg-accent hover:text-foreground flex size-8 items-center justify-center rounded-md transition-colors"
          >
            <MoreVertical className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => setAssigning(true)}>
            <PhoneForwarded className="size-4" aria-hidden />
            {number.company_id === null ? "Asignar a un tenant" : "Reasignar"}
          </DropdownMenuItem>
          {number.company_id !== null && (
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => setReturning(true)}
            >
              <ArchiveRestore className="size-4" aria-hidden />
              Devolver al stock
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="text-destructive flex items-center gap-2"
            onClick={() => setReleasing(true)}
          >
            <Trash2 className="size-4" aria-hidden />
            Liberar en Twilio
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {assigning && <AssignNumberSheet number={number} onClose={() => setAssigning(false)} />}

      <ConfirmTyped
        open={returning}
        onOpenChange={setReturning}
        title="Devolver el número al stock"
        description={
          <>
            El tenant que lo tiene asignado <b>se queda sin telefonía</b> hasta que le asignes
            otro número. Es reversible (puedes reasignarlo), pero no inocuo: sus llamadas
            automáticas dejarán de salir.
          </>
        }
        confirmText={number.phone_number}
        actionLabel="Devolver al stock"
        onConfirm={returnToStock}
        pending={assign.isPending}
      />

      <ConfirmTyped
        open={releasing}
        onOpenChange={setReleasing}
        title="Liberar el número en Twilio"
        description={
          <>
            Twilio recicla los números liberados: <b>no hay garantía de recuperarlo</b>. El tenant
            que lo tenga asignado se queda sin telefonía hasta que le asignes otro. La fila queda
            como historial.
          </>
        }
        confirmText={number.phone_number}
        actionLabel="Liberar"
        onConfirm={releaseNumber}
        pending={release.isPending}
      />
    </>
  );
}
