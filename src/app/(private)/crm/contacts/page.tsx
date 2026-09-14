"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CopyCheck, Plus, Search } from "lucide-react";
import { triggerDownload } from "@/core/lib/download";
import { errorMessage } from "@/core/lib/error-messages";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import { EmptyState } from "@/shared/components/features/empty-state";
import type { ContactRow } from "@/modules/crm/domain/contact";
import {
  ContactFilters,
  type ContactFiltersValue,
} from "@/modules/crm/ui/components/ContactFilters";
import {
  contactColumns,
  fetchContacts,
} from "@/modules/crm/ui/tables/config/contacts.config";
import {
  exportContactsUrl,
  importTemplateUrl,
} from "@/modules/crm/infrastructure/services/imports-service.adapter";
import { ImportExportMenu } from "@/modules/crm/ui/components/imports/ImportExportMenu";
import { compactSegmentFilters } from "@/modules/crm/domain/segment";
import { BulkFollowUpButton } from "@/modules/crm/ui/components/BulkFollowUpButton";
import { useAlert } from "@/core/providers/alert-provider";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

/**
 * Listado de contactos (`/crm/contacts`): paginación server-side, búsqueda `q`
 * (nombre/teléfono/correo) y filtros del CRM (etapa, fuente, ciudad, tag,
 * score). Crear/editar abren modal por ruta interceptada (@form). Plantilla,
 * import y export viven en un solo botón (`ImportExportMenu`).
 */
export default function CrmContactsPage() {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canManage = hasPermission("contacts:manage");
  const canImport = hasPermission("contacts:import");
  const canExport = hasPermission("contacts:export");

  const [filters, setFilters] = useState<ContactFiltersValue>({});
  const [searchDraft, setSearchDraft] = useState("");
  /** F4a: selección de la PÁGINA. Para trabajar «todos los que cumplen el
   *  filtro» está el camino de guardar el filtro como segmento, que ya existe
   *  aquí arriba y lleva su propio botón en la pantalla de segmentos. */
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const extraParams = useMemo(
    () => ({
      lifecycle_stage: filters.lifecycle_stage,
      source: filters.source,
      city: filters.city,
      tag_id: filters.tag_id,
      min_score: filters.min_score,
      sort: filters.sort,
    }),
    [filters],
  );

  const { items, total, loading, error, page, setPage, setSearch, searchValue, refresh } =
    usePaginatedList<ContactRow, "q">({
      fetcher: fetchContacts,
      pageSize: PAGE_SIZE,
      searchField: "q",
      extraParams,
    });

  // Búsqueda con debounce: escribir filtra sin pulsar Enter (y sin spamear al backend).
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchDraft.trim() || undefined);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchDraft, setSearch]);

  // Merge en vivo (propio o de otro usuario): el perdedor sale del listado.
  const { socket } = useSocket("inbox");
  useSocketEvent(socket, "contact.merged", () => void refresh());

  // La tabla se refresca cuando el modal guarda o una fila elimina.
  useEffect(() => {
    const onMutation = () => void refresh();
    window.addEventListener("crm:contacts:save:success", onMutation);
    window.addEventListener("crm:contacts:delete:success", onMutation);
    return () => {
      window.removeEventListener("crm:contacts:save:success", onMutation);
      window.removeEventListener("crm:contacts:delete:success", onMutation);
    };
  }, [refresh]);

  const hasFilters = Object.values(filters).some((value) => value !== undefined);
  const isEmpty = !loading && total === 0 && !searchValue && !hasFilters;

  // Los filtros activos se serializan al DSL del export (F6); la descarga la
  // resuelve el navegador (Content-Disposition) y el backend la audita.
  const handleExport = () => {
    triggerDownload(
      exportContactsUrl({
        filters: compactSegmentFilters({
          lifecycle_stage: filters.lifecycle_stage ? [filters.lifecycle_stage] : undefined,
          source: filters.source ? [filters.source] : undefined,
          tag_ids: filters.tag_id ? { any: [filters.tag_id] } : undefined,
          city: filters.city,
          min_score: filters.min_score,
          q: searchDraft.trim() || undefined,
        }),
      }),
    );
    showAlert({
      tone: "info",
      title: "Exportación iniciada — esta descarga queda auditada",
      open: true,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Contactos</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {loading && total === 0 ? "Cargando…" : `${total} contacto${total === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/crm/contacts/duplicates">
              <CopyCheck className="size-4" />
              Duplicados
            </Link>
          </Button>
          <ImportExportMenu
            canImport={canImport}
            canExport={canExport}
            onDownloadTemplate={() => triggerDownload(importTemplateUrl())}
            onImport={() => router.push("/crm/contacts/import")}
            onExport={handleExport}
          />
          {canManage && (
            <Button asChild className="rounded-full">
              <Link href="/crm/contacts/create">
                <Plus className="size-4" />
                Nuevo contacto
              </Link>
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
          <Button variant="outline" className="mt-4 rounded-full" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      ) : isEmpty ? (
        <EmptyState
          glyph="people"
          variant="solid"
          title="Aún no tienes contactos"
          description="Los de WhatsApp e Instagram se crean solos al escribirte; también puedes crearlos manualmente."
          action={
            canManage ? (
              <Button asChild className="rounded-full">
                <Link href="/crm/contacts/create">
                  <Plus className="size-4" />
                  Crear contacto
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4 rounded-2xl border border-border bg-background p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                placeholder="Buscar por nombre, teléfono o correo…"
                className="h-9 pl-9"
                aria-label="Buscar contactos"
              />
            </div>
            <ContactFilters value={filters} onChange={setFilters} />
          </div>

          {loading && items.length === 0 ? (
            <TableSkeleton rows={8} showHeader={false} />
          ) : (
            <DataTable<ContactRow>
              data={items}
              columns={contactColumns}
              pagination={{ page, pageSize: PAGE_SIZE, total }}
              onPageChange={setPage}
              messages={{ empty: "Sin resultados para esta búsqueda" }}
              selection={{
                rowId: (row) => row.id,
                rowLabel: (row) => row.full_name ?? "Contacto",
                selected,
                onChange: setSelected,
                actions: ({ count }) => (
                  <BulkFollowUpButton
                    audience={{ source: "contacts", contact_ids: [...selected] }}
                    audienceLabel={`${String(count)} contactos que marcaste en la lista`}
                    label={`Programar seguimiento para ${String(count)}`}
                  />
                ),
                note: (
                  <span>
                    ¿Quieres trabajar con todos los que cumplen el filtro? Guárdalo como segmento
                    aquí arriba y ponlo a trabajar desde Segmentos.
                  </span>
                ),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
