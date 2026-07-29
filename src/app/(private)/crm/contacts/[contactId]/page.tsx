"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import {
  contactDisplayName,
  type ContactDTO,
  type ContactProfileDTO,
  type ContactTagDTO,
} from "@/modules/crm/domain/contact";
import type { DealDTO } from "@/modules/crm/domain/deal";
import {
  getContact,
  getContactProfile,
  getContactTags,
  listAssignableUsers,
} from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { listDeals } from "@/modules/crm/infrastructure/services/deals-service.adapter";
import { Contact360Header } from "@/modules/crm/ui/components/contact-detail/Contact360Header";
import { CopilotPanel } from "@/modules/crm/ui/components/contact-detail/CopilotPanel";
import { ContactDealsCard } from "@/modules/crm/ui/components/contact-detail/ContactDealsCard";
import { ContactTimeline } from "@/modules/crm/ui/components/contact-detail/ContactTimeline";
import { ScorePanel } from "@/modules/crm/ui/components/contact-detail/ScorePanel";
import { TagsEditor } from "@/modules/crm/ui/components/contact-detail/TagsEditor";

type ContactBundle = {
  contact: ContactDTO;
  profile: ContactProfileDTO;
  tags: ContactTagDTO[];
  deals: DealDTO[];
  users: Array<{ id: string; name: string }>;
};

/**
 * Contacto 360 (`/crm/contacts/[contactId]`): página-hub con secciones
 * independientes (patrón catalog/products/[id]) — header, score, etiquetas,
 * oportunidades y timeline. El panel Copiloto ✦ ocupa su hueco desde F7.
 */
export default function Contact360Page({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = use(params);
  const router = useRouter();
  const { showAlert } = useAlert();
  const [bundle, setBundle] = useState<ContactBundle | null>(null);

  const load = useCallback(async () => {
    try {
      const [contact, profile, tags, dealsPage, users] = await Promise.all([
        getContact(contactId),
        getContactProfile(contactId),
        getContactTags(contactId),
        listDeals({ contact_id: contactId, page_size: 25 }),
        listAssignableUsers().catch(() => []),
      ]);
      setBundle({
        contact,
        profile,
        tags,
        deals: dealsPage.data,
        users: users.filter((user) => user.status === "active"),
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo cargar el contacto"),
        open: true,
      });
      router.replace("/crm/contacts");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactId]);

  useEffect(() => {
    void load();
    // El modal de edición (@form) notifica al guardar: se recarga el hub.
    const onSave = () => void load();
    window.addEventListener("crm:contacts:save:success", onSave);
    return () => window.removeEventListener("crm:contacts:save:success", onSave);
  }, [load]);

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center">
        <BrandLoader label="Cargando contacto" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <Contact360Header contact={bundle.contact} profile={bundle.profile} users={bundle.users} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ScorePanel profile={bundle.profile} />
          <CopilotPanel contactId={contactId} />
        </div>
        <div className="space-y-4">
          <TagsEditor contactId={contactId} initialTags={bundle.tags} />
          <ContactDealsCard
            deals={bundle.deals}
            contact={{ id: contactId, label: contactDisplayName(bundle.contact) }}
          />
        </div>
      </div>

      <ContactTimeline
        contactId={contactId}
        createActivityHref={`/crm/tasks/create?contact_id=${contactId}&contact_label=${encodeURIComponent(contactDisplayName(bundle.contact))}`}
      />
    </div>
  );
}
