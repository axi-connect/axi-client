"use client";

import { LoaderCircle, Send } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { useAlert } from "@/core/providers/alert-provider";
import { errorMessage } from "@/core/lib/error-messages";
import { Button } from "@/shared/components/ui/button";
import { canSendDelivery } from "../../../domain/platform-role";
import { useResendDelivery } from "../../../infrastructure/api/hooks/use-delivery";
import { usePlatformRole } from "../../../infrastructure/auth/use-platform-role";

/**
 * «Reenviar bienvenida»: mismo kit, enlace de contraseña nuevo que anula el
 * anterior, y un intento más en el historial. Se confirma antes, porque el
 * enlace que el dueño tenga en su bandeja deja de servir.
 */
export function ResendDeliveryButton({
  tenantId,
  deliveryId,
  passwordSetAt,
  variant = "outline",
  size = "sm",
}: {
  tenantId: string;
  deliveryId: string;
  /** Si el dueño ya creó su contraseña, la confirmación lo dice. */
  passwordSetAt: string | null;
  variant?: "default" | "outline";
  size?: "sm" | "default";
}) {
  const { showAlert, showModal } = useAlert();
  const resend = useResendDelivery(tenantId);
  const allowed = canSendDelivery(usePlatformRole());

  async function run() {
    try {
      const result = await resend.mutateAsync(deliveryId);
      showAlert({
        tone: "success",
        title: "Bienvenida reenviada",
        description: `Va en camino (intento ${result.attempt}). El enlace anterior ya no sirve.`,
        autoCloseMs: 6000,
      });
    } catch (error) {
      if (isHttpError(error) && error.is("delivery/in_progress")) {
        showAlert({ tone: "info", title: "Ya se está enviando", description: "Espera unos segundos.", autoCloseMs: 5000 });
        return;
      }
      showAlert({ tone: "error", title: "No pudimos reenviar la bienvenida", description: errorMessage(error) });
    }
  }

  function confirm() {
    showModal({
      title: "¿Reenviar la bienvenida?",
      description: `${
        passwordSetAt ? "Ya creó su contraseña; reenviar le permite cambiarla. " : ""
      }Reenviar usa el mismo kit, emite un enlace de contraseña nuevo que anula el anterior y queda como un intento más en el historial.`,
      actions: [
        { label: "Cancelar", variant: "outline" },
        { label: "Reenviar bienvenida", onClick: () => void run() },
      ],
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={confirm}
      disabled={resend.isPending || !allowed}
      title={allowed ? undefined : "Reenviar la bienvenida es de super_admin"}
    >
      {resend.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
      {resend.isPending ? "Reenviando…" : "Reenviar bienvenida"}
    </Button>
  );
}
