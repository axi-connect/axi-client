"use client";

import { useEffect, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { MultiSelect } from "@/shared/components/features/multi-select";
import type { ContactTagDTO } from "@/modules/crm/domain/contact";
import type { TagDTO } from "@/modules/crm/domain/segment";
import { setContactTags } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { listTags } from "@/modules/crm/infrastructure/services/segments-service.adapter";

/**
 * Etiquetas del contacto: MultiSelect sobre el catálogo del tenant con
 * PUT replace-set en cada cambio (la respuesta del backend es la verdad).
 * Crear/editar tags vive en Configuración (F5, gate crm:manage).
 */
export function TagsEditor({
  contactId,
  initialTags,
}: {
  contactId: string;
  initialTags: ContactTagDTO[];
}) {
  const { showAlert } = useAlert();
  const [catalog, setCatalog] = useState<TagDTO[] | null>(null);
  const [selected, setSelected] = useState<string[]>(initialTags.map((tag) => tag.id));

  useEffect(() => {
    listTags()
      .then(setCatalog)
      .catch(() => setCatalog([]));
  }, []);

  const save = async (tagIds: string[]) => {
    const previous = selected;
    setSelected(tagIds);
    try {
      const tags = await setContactTags(contactId, tagIds);
      setSelected(tags.map((tag) => tag.id));
    } catch (err) {
      setSelected(previous);
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudieron guardar las etiquetas"),
        open: true,
      });
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-background p-4 md:p-6">
      <h3 className="text-base font-semibold">Etiquetas</h3>
      <div className="mt-3">
        {catalog === null ? (
          <div className="h-9 animate-pulse rounded-md bg-muted" role="status" aria-label="Cargando etiquetas" />
        ) : catalog.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay etiquetas en tu empresa. Créalas en Configuración del CRM.
          </p>
        ) : (
          <MultiSelect
            options={catalog.map((tag) => ({ label: tag.name, value: tag.id }))}
            defaultValue={selected}
            onValueChange={(values) => void save(values)}
            placeholder="Añadir etiquetas…"
          />
        )}
      </div>
    </section>
  );
}
