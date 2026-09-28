"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Modal } from "@/shared/components/ui/modal";
import { FormSkeleton } from "@/shared/components/features/loading";
import { contactDisplayName, type ContactDTO } from "@/modules/crm/domain/contact";
import { getContact } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { ContactForm } from "@/modules/crm/ui/forms/ContactForm";

/** A dónde cae el modal si se abrió por URL directa, sin historial propio. */
export const CONTACTS_LIST_HREF = "/crm/contacts";

/**
 * Modal de crear (sin `contactId`) o editar contacto. Lo montan la ruta
 * INTERCEPTADA (`@form/(.)create`, `@form/(.)update/[id]`) y su gemela REAL
 * (`create/`, `update/[id]/`), que recargar o llegar desde otro segmento
 * necesita para no dar 404 (guarda de rutas interceptadas). Cerrar o guardar
 * vuelve atrás si hay de dónde; si no, a la lista.
 */
export function ContactFormModal({ contactId }: { contactId?: string }) {
  const router = useRouter();
  const { showAlert } = useAlert();
  const editing = contactId !== undefined;
  const [contact, setContact] = useState<ContactDTO | null>(null);

  const close = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.replace(CONTACTS_LIST_HREF);
  };

  useEffect(() => {
    if (contactId === undefined) return;
    getContact(contactId)
      .then(setContact)
      .catch((err: unknown) => {
        showAlert({ tone: "error", title: errorMessage(err, "No se pudo cargar el contacto") });
        close();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  const onSuccess = () => {
    window.dispatchEvent(new CustomEvent("crm:contacts:save:success"));
    close();
  };

  return (
    <Modal
      open={true}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      config={{
        title: editing ? "Editar contacto" : "Nuevo contacto",
        description: editing
          ? contact
            ? contactDisplayName(contact)
            : ""
          : "Créalo manualmente; los de WhatsApp e Instagram se crean solos.",
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline", asClose: true, id: "crm-contact-cancel" },
          {
            label: "Guardar",
            variant: "default",
            asClose: false,
            id: "crm-contact-save",
            onClick: () => (document.getElementById("crm-contact-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ],
      }}
    >
      {!editing ? <ContactForm onSuccess={onSuccess} /> : contact ? <ContactForm contact={contact} onSuccess={onSuccess} /> : <FormSkeleton fields={6} />}
    </Modal>
  );
}
