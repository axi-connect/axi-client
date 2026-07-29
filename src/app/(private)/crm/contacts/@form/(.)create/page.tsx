"use client";

import { useRouter } from "next/navigation";
import { Modal } from "@/shared/components/ui/modal";
import { ContactForm } from "@/modules/crm/ui/forms/ContactForm";

/** Modal interceptado de creación (URL compartible; back cierra). */
export default function CrmContactsInterceptCreate() {
  const router = useRouter();

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
      config={{
        title: "Nuevo contacto",
        description: "Créalo manualmente; los de WhatsApp e Instagram se crean solos.",
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
      <ContactForm
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent("crm:contacts:save:success"));
          router.back();
        }}
      />
    </Modal>
  );
}
