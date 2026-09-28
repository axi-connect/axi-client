"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/shared/components/ui/modal";
import { DealForm } from "@/modules/crm/ui/forms/DealForm";

/**
 * Modal «Nueva oportunidad». Lo montan la ruta INTERCEPTADA
 * (`@form/(.)create`, desde el board) y la ruta REAL (`pipeline/create`,
 * desde otro segmento como el 360, o recargando la URL): una sola copia.
 * Acepta `?contact_id&contact_label` para precargar el contacto.
 *
 * Cerrar vuelve atrás si hay de dónde (el board o el 360); abierto por URL
 * directa, sin historial propio, cae al board. Crear lleva al deal nuevo.
 */
export function CreateDealModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact_id");
  const contactLabel = searchParams.get("contact_label");

  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.replace("/crm/pipeline");
  };

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      config={{
        title: "Nueva oportunidad",
        description: "Se crea en el pipeline activo; podrás moverla de etapa en el board.",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "crm-deal-cancel" },
          {
            label: "Crear",
            variant: "default",
            asClose: false,
            id: "crm-deal-save",
            onClick: () =>
              (document.getElementById("crm-deal-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      <DealForm
        presetContact={
          contactId !== null && contactLabel !== null ? { id: contactId, label: contactLabel } : undefined
        }
        onSuccess={(dealId) => router.replace(`/crm/pipeline/deal/${dealId}`)}
      />
    </Modal>
  );
}
