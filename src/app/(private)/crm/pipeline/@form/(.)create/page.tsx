"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Modal } from "@/shared/components/ui/modal";
import { DealForm } from "@/modules/crm/ui/forms/DealForm";

function CreateDealModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact_id");
  const contactLabel = searchParams.get("contact_label");

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
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
          contactId !== null && contactLabel !== null
            ? { id: contactId, label: contactLabel }
            : undefined
        }
        onSuccess={(dealId) => router.replace(`/crm/pipeline/deal/${dealId}`)}
      />
    </Modal>
  );
}

/** Modal interceptado de creación (acepta ?contact_id&contact_label del 360). */
export default function CrmDealsInterceptCreate() {
  return (
    <Suspense fallback={null}>
      <CreateDealModal />
    </Suspense>
  );
}
