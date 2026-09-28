"use client";

import CrmContactsPage from "../page";
import { ContactFormModal } from "@/modules/crm/ui/forms/ContactFormModal";

/**
 * Gemela REAL de `@form/(.)create`: al recargar o llegar desde otro segmento,
 * la lista detrás y el mismo modal encima. Al ser un segmento ESTÁTICO gana
 * sobre `[contactId]`: antes, recargar /crm/contacts/create abría la 360 de un
 * contacto «create».
 */
export default function CrmContactsCreatePage() {
  return (
    <>
      <CrmContactsPage />
      <ContactFormModal />
    </>
  );
}
