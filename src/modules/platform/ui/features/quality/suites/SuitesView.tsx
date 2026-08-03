"use client";

/**
 * Catálogo de suites: filtros + búsqueda EN SERVER con `keepPreviousData`.
 * La búsqueda usa la barra del DataTable (debounce; el backend busca código
 * Y nombre) y la tabla queda montada con 0 resultados filtrados. Al crear
 * una suite se abre directo la composición (una suite vacía no se ejecuta).
 */
import { useEffect, useMemo, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { cn } from "@/core/lib/utils";
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
import type { CatalogStatus, SuiteListItem } from "../../../../domain/quality";
import { useSuitesQuery } from "../../../../infrastructure/api/hooks/use-quality-suites";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { SuiteFormSheet } from "./SuiteFormSheet";
import { SuiteScenariosSheet } from "./SuiteScenariosSheet";
import { buildSuiteColumns, toSuiteRow, type SuiteRow } from "./suites-table.config";

const PAGE_SIZE = 25;
const ALL = "all";

type SearchState = { field: keyof SuiteRow & string; value: string };

export function SuitesView() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [search, setSearch] = useState<SearchState>({ field: "name", value: "" });
  const [page, setPage] = useState(1);
  // Drawer de metadatos: undefined = cerrado · null = crear · suite = editar.
  const [sheetSuite, setSheetSuite] = useState<SuiteListItem | null | undefined>(undefined);
  const [manageSuite, setManageSuite] = useState<SuiteListItem | null>(null);
  // Suite recién creada: abre su composición apenas aparezca en la lista refrescada.
  const [pendingManageId, setPendingManageId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useSuitesQuery({
    status: statusFilter === ALL ? undefined : (statusFilter as CatalogStatus),
    search: search.value,
    page,
    pageSize: PAGE_SIZE,
  });

  const suites = useMemo(() => data?.data ?? [], [data]);

  useEffect(() => {
    if (!pendingManageId) return;
    const created = suites.find((suite) => suite.id === pendingManageId);
    if (created) {
      setManageSuite(created);
      setPendingManageId(null);
    }
  }, [pendingManageId, suites]);

  const rows = useMemo(() => suites.map(toSuiteRow), [suites]);
  const total = data?.meta.total ?? 0;
  const hasFilters = statusFilter !== "active" || search.value.trim() !== "";

  const columns = useMemo(
    () =>
      buildSuiteColumns({
        getSuite: (id) => suites.find((suite) => suite.id === id),
        onEdit: (suite) => setSheetSuite(suite),
        onManageScenarios: (suite) => setManageSuite(suite),
      }),
    [suites],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="archived">Archivadas</SelectItem>
            <SelectItem value={ALL}>Todas</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setSheetSuite(null)}>
          <Plus aria-hidden="true" />
          Nueva suite
        </Button>
      </div>

      {isPending ? (
        <TableSkeleton rows={5} />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : total === 0 && !hasFilters ? (
        <EmptyState
          icon={ListChecks}
          title="Aún no hay suites"
          description="Agrupa escenarios en una suite para lanzarlos juntos."
          action={
            <Button variant="outline" onClick={() => setSheetSuite(null)}>
              Crear la primera suite
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
            search={search}
            preferredSearchFields={["name", "code"]}
            onSearchChange={({ field, value }) => {
              setSearch({ field: field as SearchState["field"], value });
              setPage(1);
            }}
            messages={{ empty: "Ninguna suite coincide con los filtros." }}
          />
        </div>
      )}

      <SuiteFormSheet
        open={sheetSuite !== undefined}
        onOpenChange={(open) => {
          if (!open) setSheetSuite(undefined);
        }}
        suite={sheetSuite ?? null}
        onCreated={(id) => setPendingManageId(id)}
        // Remonta el form al cambiar de suite (defaultValues frescos).
        key={sheetSuite === undefined ? "closed" : sheetSuite?.id ?? "create"}
      />

      <SuiteScenariosSheet
        open={manageSuite !== null}
        onOpenChange={(open) => {
          if (!open) setManageSuite(null);
        }}
        suite={manageSuite}
        readOnly={manageSuite?.is_system ?? false}
      />
    </div>
  );
}
