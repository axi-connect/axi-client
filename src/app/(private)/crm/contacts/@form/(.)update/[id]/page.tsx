"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Modal } from "@/shared/components/ui/modal";
import { FormSkeleton } from "@/shared/components/features/loading";
import type { ContactDTO } from "@/modules/crm/domain/contact";
import { contactDisplayName } from "@/modules/crm/domain/contact";
import { getContact } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { ContactForm } from "@/modules/crm/ui/forms/ContactForm";

/** Modal interceptado de edición: carga el contacto y precarga el formulario. */
export default function CrmContactsInterceptUpdate({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showAlert } = useAlert();
  const [contact, setContact] = useState<ContactDTO | null>(null);

  useEffect(() => {
    getContact(id)
      .then(setContact)
      .catch((err: unknown) => {
        showAlert({
          tone: "error",
          title: errorMessage(err, "No se pudo cargar el contacto"),
          open: true,
        });
        router.back();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
      config={{
        title: "Editar contacto",
        description: contact ? contactDisplayName(contact) : "",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "crm-contact-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "crm-contact-save",
            onClick: () =>
              (document.getElementById("crm-contact-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      {contact ? (
        <ContactForm
          contact={contact}
          onSuccess={() => {
            window.dispatchEvent(new CustomEvent("crm:contacts:save:success"));
            router.back();
          }}
        />
      ) : (
        <FormSkeleton fields={6} />
      )}
    </Modal>
  );
}
