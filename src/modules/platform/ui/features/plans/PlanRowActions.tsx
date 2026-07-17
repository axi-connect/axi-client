"use client";

/**
 * Menú ⋮ de una fila de plan: Editar (abre el drawer) · Desactivar/Activar.
 * Desactivar es REVERSIBLE (solo bloquea nuevas asignaciones) → Modal simple
 * con el copy honesto de `subscriptions_count`, nunca ConfirmTyped.
 * Nota de contrato: el PATCH exige `default_limits` → se reenvía el set actual.
 */
import { useState } from "react";
import { CircleSlash, CirclePlay, MoreVertical, PencilLine } from "lucide-react";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { Modal } from "@/shared/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import type { PlanListItem } from "../../../domain/plan";
import { useUpdatePlan } from "../../../infrastructure/api/hooks/use-plans";

type PlanRowActionsProps = {
  plan: PlanListItem;
  onEdit: (plan: PlanListItem) => void;
};

export function PlanRowActions({ plan, onEdit }: PlanRowActionsProps) {
  const { showAlert } = useAlert();
  const updatePlan = useUpdatePlan();
  const [toggleOpen, setToggleOpen] = useState(false);

  async function toggleActive() {
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        body: { is_active: !plan.is_active, default_limits: plan.default_limits },
      });
      setToggleOpen(false);
      showAlert({
        tone: "success",
        title: plan.is_active ? "Plan desactivado" : "Plan activado",
        description: plan.is_active
          ? `${plan.name} ya no acepta nuevas asignaciones.`
          : `${plan.name} vuelve a estar disponible para asignar.`,
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo actualizar el plan", description: errorMessage(error) });
    }
  }

  const subscribedNote =
    plan.subscriptions_count > 0
      ? `${plan.subscriptions_count} ${plan.subscriptions_count === 1 ? "tenant sigue suscrito" : "tenants siguen suscritos"}; solo se bloquean nuevas asignaciones.`
      : "Ningún tenant está suscrito a este plan.";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de ${plan.name}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MoreVertical aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => onEdit(plan)}>
            <PencilLine aria-hidden="true" className="size-4" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex items-center gap-2" onClick={() => setToggleOpen(true)}>
            {plan.is_active ? (
              <>
                <CircleSlash aria-hidden="true" className="size-4" />
                Desactivar
              </>
            ) : (
              <>
                <CirclePlay aria-hidden="true" className="size-4" />
                Activar
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal
        open={toggleOpen}
        onOpenChange={setToggleOpen}
        config={{
          title: plan.is_active ? `Desactivar «${plan.name}»` : `Activar «${plan.name}»`,
          description: plan.is_active
            ? subscribedNote
            : "El plan volverá a aparecer como opción al asignar planes.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            {
              label: updatePlan.isPending
                ? "Guardando…"
                : plan.is_active
                  ? "Desactivar"
                  : "Activar",
              onClick: () => void toggleActive(),
            },
          ],
        }}
      />
    </>
  );
}
