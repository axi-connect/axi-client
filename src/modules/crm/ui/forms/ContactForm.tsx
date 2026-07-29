"use client";

import { useMemo } from "react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { isHttpError } from "@/core/api/problem";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import type { ContactDTO } from "@/modules/crm/domain/contact";
import {
  createContact,
  updateContact,
} from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import {
  buildContactFormFields,
  contactFormSchema,
  contactToFormValues,
  defaultContactFormValues,
  toCreateContactDTO,
  toUpdateContactDTO,
  type ContactFormValues,
} from "./config/contact.config";

/**
 * Formulario crear/editar contacto (`POST/PATCH /contacts`). Vive en el Modal
 * de la ruta interceptada (@form): Guardar dispara `requestSubmit()` por el id
 * `crm-contact-form`. El 409 de identidad duplicada aterriza inline en el
 * campo teléfono (discriminado por `code`, nunca por texto).
 */
export function ContactForm({
  contact,
  onSuccess,
}: {
  /** undefined = crear; con valor = editar (habilita etapa). */
  contact?: ContactDTO;
  onSuccess: () => void;
}) {
  const { showAlert } = useAlert();
  const editing = Boolean(contact);

  const defaultValues = useMemo(
    () => (contact ? contactToFormValues(contact) : defaultContactFormValues),
    [contact],
  );
  const fields = useMemo(() => buildContactFormFields({ editing }), [editing]);

  return (
    <DynamicForm<ContactFormValues>
      id="crm-contact-form"
      schema={contactFormSchema}
      fields={[...fields]}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        try {
          if (contact) {
            await updateContact(contact.id, toUpdateContactDTO(values));
          } else {
            await createContact(toCreateContactDTO(values));
          }
          showAlert({
            tone: "success",
            title: contact ? "Contacto actualizado" : "Contacto creado",
            open: true,
          });
          onSuccess();
        } catch (err) {
          if (isHttpError(err) && err.is("contacts/duplicate_identity")) {
            form.setError(values.phone ? "phone" : "email", {
              type: "server",
              message: "Ya existe un contacto con ese teléfono o correo",
            });
            return;
          }
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(err, "No se pudo guardar el contacto"),
              open: true,
            });
          }
        }
      }}
    />
  );
}
