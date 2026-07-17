"use client";

/**
 * Menú ⋮ de una fila de tenant: Ver detalle · Suspender/Reactivar.
 * Suspender = ConfirmTyped (bloquea el login de todo el tenant);
 * Reactivar = Modal simple compartido. Tras mutar, invalidate → re-fetch
 * (el badge refleja el estado real del backend, spec D9).
 * Se reutiliza tal cual en el header del detalle.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreVertical, PauseCircle, PlayCircle } from "lucide-react";
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
import type { TenantListItem } from "../../../domain/tenant";
import { useUpdateTenant } from "../../../infrastructure/api/hooks/use-tenants";
import { ConfirmTyped } from "../../components/ConfirmTyped";

type TenantRowActionsProps = {
  tenant: TenantListItem;
  /** Oculta "Ver detalle" cuando ya estás en el detalle (header). */
  showViewAction?: boolean;
};

export function TenantRowActions({ tenant, showViewAction = true }: TenantRowActionsProps) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const updateTenant = useUpdateTenant();
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reactivateOpen, setReactivateOpen] = useState(false);
  const isSuspended = tenant.status === "suspended";

  async function setStatus(status: "active" | "suspended") {
    try {
      await updateTenant.mutateAsync({ id: tenant.id, body: { status } });
      setSuspendOpen(false);
      setReactivateOpen(false);
      showAlert({
        tone: "success",
        title: status === "suspended" ? "Tenant suspendido" : "Tenant reactivado",
        description:
          status === "suspended"
            ? `Los usuarios de ${tenant.name} fueron expulsados y la mensajería quedó en pausa.`
            : `${tenant.name} vuelve a operar; los mensajes pendientes se re-encolan automáticamente.`,
        autoCloseMs: 5000,
      });
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo actualizar el tenant", description: errorMessage(error) });
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Acciones de ${tenant.name}`}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <MoreVertical aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {showViewAction && (
            <>
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={() => router.push(`/platform/tenants/${tenant.id}`)}
              >
                <Eye aria-hidden="true" className="size-4" />
                Ver detalle
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          {isSuspended ? (
            <DropdownMenuItem className="flex items-center gap-2" onClick={() => setReactivateOpen(true)}>
              <PlayCircle aria-hidden="true" className="size-4" />
              Reactivar
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive hover:text-destructive focus:text-destructive"
              onClick={() => setSuspendOpen(true)}
            >
              <PauseCircle aria-hidden="true" className="size-4" />
              Suspender
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmTyped
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title={`Suspender «${tenant.name}»`}
        description={
          <p>
            Se <strong className="text-foreground">expulsará inmediatamente</strong> a todos los usuarios
            conectados (sesiones y tiempo real), se bloqueará el login y la{" "}
            <strong className="text-foreground">mensajería quedará en pausa</strong> — los mensajes
            entrantes se conservan y se re-procesan al reactivar. Las conversaciones y datos se conservan.
          </p>
        }
        confirmText={tenant.name}
        actionLabel="Suspender"
        pending={updateTenant.isPending}
        onConfirm={() => setStatus("suspended")}
      />

      <Modal
        open={reactivateOpen}
        onOpenChange={setReactivateOpen}
        config={{
          title: `Reactivar «${tenant.name}»`,
          description: "Los usuarios del tenant podrán iniciar sesión de nuevo.",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            { label: updateTenant.isPending ? "Reactivando…" : "Reactivar", onClick: () => void setStatus("active") },
          ],
        }}
      />
    </>
  );
}
