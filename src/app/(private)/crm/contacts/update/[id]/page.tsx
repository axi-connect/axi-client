"use client";

import { use } from "react";
import CrmContactsPage from "../../page";
import { ContactFormModal } from "@/modules/crm/ui/forms/ContactFormModal";

/** Gemela REAL de `@form/(.)update/[id]`: la lista detrás y el modal de edición encima. */
export default function CrmContactsUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <>
      <CrmContactsPage />
      <ContactFormModal contactId={id} />
    </>
  );
}
