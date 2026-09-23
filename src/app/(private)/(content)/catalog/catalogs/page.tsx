"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/shared/components/ui/modal";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/shared/auth/auth.hooks";
import { DataTable, type DataTableRef } from "@/shared/components/features/data-table";
import { useAlert } from "@/core/providers/alert-provider";
import type { CatalogRow } from "@/modules/catalog/domain/catalog";
import { useCatalog } from "@/modules/catalog/infrastructure/stores/catalog.context";
import { CatalogForm } from "@/modules/catalog/ui/forms/CatalogForm";
import type { CatalogFormValues } from "@/modules/catalog/ui/forms/config/catalog.config";
import { catalogColumns, fetchCatalogs } from "@/modules/catalog/ui/tables/config/catalog.config";

/**
 * Catálogos del tenant (`/catalogs`). Colección pequeña sin paginación
 * server-side: búsqueda/orden/paginación en cliente (patrón users).
 */
export default function CatalogsPage() {
  const pageSize = 10;
  const tableRef = useRef<DataTableRef>(null);
  const { hasPermission } = useAuth();
  const { fetchCatalogs: refreshReference } = useCatalog();
  const canManage = hasPermission("catalog:manage");

  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formDefaults, setFormDefaults] = useState<(Partial<CatalogFormValues> & { id?: string }) | null>(null);

  const { showAlert } = useAlert();

  const load = useCallback(async () => {
    try {
      const { rows: fetched } = await fetchCatalogs();
      setRows(fetched);
    } catch {
      showAlert({ tone: "error", title: "No se pudieron cargar los catálogos" });
    }
  }, [showAlert]);

  useEffect(() => {
    void load();
  }, [load]);

  // Refresco tras mutaciones: la tabla local + la caché de referencia del provider.
  const refresh = useCallback(async () => {
    await load();
    await refreshReference();
  }, [load, refreshReference]);

  useEffect(() => {
    const onDeleteSuccess = () => {
      showAlert({ tone: "success", title: "Catálogo eliminado correctamente" });
      void refresh();
    };
    const onError = (e: Event) => {
      const detail = (e as CustomEvent).detail as { message?: string };
      showAlert({ tone: "error", title: detail?.message || "No se pudo completar la acción" });
    };
    const onEditOpen = (e: Event) => {
      const { defaults } = (e as CustomEvent).detail as {
        defaults: Partial<CatalogFormValues> & { id: string };
      };
      setFormDefaults(defaults);
      setModalOpen(true);
    };

    window.addEventListener("catalogs:delete:success", onDeleteSuccess);
    window.addEventListener("catalogs:error", onError);
    window.addEventListener("catalogs:edit:open", onEditOpen);
    return () => {
      window.removeEventListener("catalogs:delete:success", onDeleteSuccess);
      window.removeEventListener("catalogs:error", onError);
      window.removeEventListener("catalogs:edit:open", onEditOpen);
    };
  }, [refresh, showAlert]);

  const isEdit = Boolean(formDefaults?.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Catálogos</h2>
          <p className="text-sm text-muted-foreground">
            Agrupa tus productos por catálogo (principal, temporadas, líneas).
          </p>
        </div>
        {canManage && (
          <Button
            className="rounded-full"
            onClick={() => {
              setFormDefaults(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Crear catálogo
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-background p-4 md:p-6">
        <DataTable<CatalogRow>
          data={rows}
          ref={tableRef}
          columns={catalogColumns}
          pagination={{ pageSize }}
        />
      </div>


      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        config={{
          title: isEdit ? "Editar catálogo" : "Crear catálogo",
          description: isEdit
            ? "Actualiza la información del catálogo"
            : "Define un nuevo agrupador de productos",
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "catalog-cancel" },
            {
              label: isEdit ? "Guardar cambios" : "Guardar",
              variant: "default",
              asClose: false,
              id: "catalog-save",
              onClick: () =>
                (document.getElementById("catalog-form") as HTMLFormElement | null)?.requestSubmit(),
            },
          ],
        }}
      >
        <CatalogForm
          host={{
            setAlert: showAlert,
            closeModal: () => setModalOpen(false),
            defaultValues: formDefaults,
            refresh,
          }}
        />
      </Modal>
    </div>
  );
}
