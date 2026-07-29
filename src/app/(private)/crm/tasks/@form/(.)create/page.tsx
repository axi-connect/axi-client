"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Modal } from "@/shared/components/ui/modal";
import { ActivityForm } from "@/modules/crm/ui/forms/ActivityForm";

function CreateActivityModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contactId = searchParams.get("contact_id");
  const contactLabel = searchParams.get("contact_label");
  const dealId = searchParams.get("deal_id");

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
      config={{
        title: "Nueva actividad",
        description: "Nota, llamada, reunión o tarea con vencimiento y asignación.",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "crm-activity-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "crm-activity-save",
            onClick: () =>
              (document.getElementById("crm-activity-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      <ActivityForm
        presetContact={
          contactId !== null && contactLabel !== null
            ? { id: contactId, label: contactLabel }
            : undefined
        }
        dealId={dealId ?? undefined}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("crm:tasks:save:success"));
          router.back();
        }}
      />
    </Modal>
  );
}

/** Modal interceptado (acepta ?contact_id&contact_label&deal_id del 360/rail). */
export default function CrmTasksInterceptCreate() {
  return (
    <Suspense fallback={null}>
      <CreateActivityModal />
    </Suspense>
  );
}
