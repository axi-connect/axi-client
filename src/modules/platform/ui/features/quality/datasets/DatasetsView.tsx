"use client";

/**
 * Lista de datasets (upgrade F4): filtros por tenant y capacidad en server,
 * alta, importación, renombrado, archivado y borrado con confirmación
 * tipeada (se lleva ítems, fotos y resultados de probes).
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DATASET_KIND_LABELS,
  DATASET_KINDS,
  type DatasetKind,
  type DatasetListItem,
} from "../../../../domain/quality-datasets";
import {
  useDatasetsQuery,
  useDeleteDataset,
  useUpdateDataset,
} from "../../../../infrastructure/api/hooks/use-quality-datasets";
import { ConfirmTyped } from "../../../components/ConfirmTyped";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { ALL_TENANTS, TenantSelect } from "../../../components/TenantSelect";
import { CreateDatasetDialog } from "./CreateDatasetDialog";
import { buildDatasetColumns, toDatasetRow } from "./datasets-table.config";
import { ImportDatasetDialog } from "./ImportDatasetDialog";

const PAGE_SIZE = 25;
const ALL = "all";

export function DatasetsView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [tenantFilter, setTenantFilter] = useState<string>(ALL_TENANTS);
  const [kindFilter, setKindFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [renaming, setRenaming] = useState<DatasetListItem | null>(null);
  const [importing, setImporting] = useState<DatasetListItem | null>(null);
  const [deleting, setDeleting] = useState<DatasetListItem | null>(null);
  const updateDataset = useUpdateDataset();
  const deleteDataset = useDeleteDataset();

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useDatasetsQuery({
    companyId: tenantFilter === ALL_TENANTS ? undefined : tenantFilter,
    kind: kindFilter === ALL ? undefined : (kindFilter as DatasetKind),
    status: statusFilter === ALL ? undefined : (statusFilter as "active" | "archived"),
    page,
    pageSize: PAGE_SIZE,
  });

  const datasets = useMemo(() => data?.data ?? [], [data]);
  const rows = useMemo(() => datasets.map(toDatasetRow), [datasets]);
  const total = data?.meta.total ?? 0;
  const hasFilters = tenantFilter !== ALL_TENANTS || kindFilter !== ALL || statusFilter !== "active";

  const columns = useMemo(
    () =>
      buildDatasetColumns({
        getDataset: (id) => datasets.find((dataset) => dataset.id === id),
        onImport: setImporting,
        onRename: setRenaming,
        onArchive: (dataset) => {
          const next = dataset.status === "active" ? "archived" : "active";
          updateDataset.mutate(
            { id: dataset.id, body: { status: next } },
            {
              onSuccess: () =>
                showAlert({
                  tone: "success",
                  title: next === "archived" ? "Dataset archivado" : "Dataset reactivado",
                  description:
                    next === "archived" ? "Se elimina con sus fotos a los 30 días si sigue archivado." : undefined,
                  autoCloseMs: 5000,
                }),
              onError: (mutationError) =>
                showAlert({ tone: "error", title: "No se pudo actualizar", description: errorMessage(mutationError) }),
            },
          );
        },
        onDelete: setDeleting,
      }),
    [datasets, updateDataset, showAlert],
  );

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteDataset.mutateAsync(deleting.id);
      showAlert({ tone: "success", title: "Dataset eliminado", autoCloseMs: 4000 });
      setDeleting(null);
    } catch (mutationError) {
      showAlert({ tone: "error", title: "No se pudo eliminar", description: errorMessage(mutationError) });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <TenantSelect
            value={tenantFilter}
            onValueChange={(value) => {
              setTenantFilter(value);
              setPage(1);
            }}
            allowAll
            ariaLabel="Filtrar por tenant"
          />
          <Select
            value={kindFilter}
            onValueChange={(value) => {
              setKindFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-52" aria-label="Filtrar por capacidad">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las capacidades</SelectItem>
              {DATASET_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {DATASET_KIND_LABELS[kind]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-36" aria-label="Filtrar por estado">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="archived">Archivados</SelectItem>
              <SelectItem value={ALL}>Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus aria-hidden="true" />
          Nuevo dataset
        </Button>
      </div>

      {isPending ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : total === 0 && !hasFilters ? (
        <EmptyState
          glyph="ai"
          title="Aún no hay datasets"
          description="Crea uno por capacidad y tenant, importa ítems del tráfico real y etiquétalos; un probe los mide después."
          action={
            <Button variant="outline" onClick={() => setCreateOpen(true)}>
              Crear el primer dataset
            </Button>
          }
        />
      ) : (
        <div className={cn("transition-opacity", isPlaceholderData && "opacity-60")} aria-busy={isPlaceholderData}>
          <DataTable
            data={rows}
            columns={columns}
            pagination={{ page, pageSize: PAGE_SIZE, total }}
            onPageChange={setPage}
            preferredSearchFields={["name", "company_name"]}
            messages={{ empty: "Ningún dataset coincide con los filtros." }}
          />
        </div>
      )}

      <CreateDatasetDialog
        open={createOpen || renaming !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setRenaming(null);
          }
        }}
        dataset={renaming}
        initialCompanyId={tenantFilter === ALL_TENANTS ? null : tenantFilter}
        onCreated={(id) => router.push(`/platform/quality/datasets/${id}`)}
      />
      <ImportDatasetDialog
        open={importing !== null}
        onOpenChange={(open) => {
          if (!open) setImporting(null);
        }}
        dataset={importing}
      />
      <ConfirmTyped
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        title="Eliminar el dataset"
        description={
          <>
            <p>
              Elimina <strong>{deleting?.name}</strong> con sus {deleting?.items_count ?? 0} ítems, las fotos copiadas y los
              resultados por ítem de sus probes. Las métricas agregadas de las corridas se conservan.
            </p>
            <p>Esta acción no se puede deshacer.</p>
          </>
        }
        confirmText={deleting?.name ?? ""}
        actionLabel="Eliminar dataset"
        onConfirm={confirmDelete}
        pending={deleteDataset.isPending}
      />
    </div>
  );
}
