"use client";

/**
 * Catálogo de escenarios: filtros + búsqueda EN SERVER (page/page_size,
 * excepción a D5) con `keepPreviousData` (la tabla atenúa en vez de
 * parpadear). La búsqueda usa la barra del propio DataTable (debounce 350 ms;
 * el backend busca por código Y nombre sin importar el campo elegido) y la
 * tabla queda montada cuando los filtros dan 0 resultados — así el input no
 * pierde el foco a mitad de escritura. Tras clonar se abre el clon en
 * edición (detalle por id, no depende de la página actual).
 */
import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
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
import type { CatalogStatus, Scenario } from "../../../../domain/quality";
import {
  useScenarioQuery,
  useScenariosQuery,
} from "../../../../infrastructure/api/hooks/use-quality-scenarios";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { CloneScenarioDialog } from "./CloneScenarioDialog";
import { ScenarioFormSheet, type ScenarioSheetMode } from "./ScenarioFormSheet";
import { buildScenarioColumns, toScenarioRow, type ScenarioRow } from "./scenarios-table.config";

const PAGE_SIZE = 25;
const ALL = "all";

type SheetState = { mode: "create" } | { mode: Exclude<ScenarioSheetMode, "create">; scenario: Scenario };
type SearchState = { field: keyof ScenarioRow & string; value: string };

export function ScenariosView() {
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [originFilter, setOriginFilter] = useState<string>(ALL);
  const [search, setSearch] = useState<SearchState>({ field: "name", value: "" });
  const [page, setPage] = useState(1);
  const [sheet, setSheet] = useState<SheetState | undefined>(undefined);
  const [cloneSource, setCloneSource] = useState<Scenario | null>(null);
  // Clon recién creado: se trae por id (no está garantizado en la página) y se abre en edición.
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  const { data, isPending, isError, error, refetch, isPlaceholderData } = useScenariosQuery({
    status: statusFilter === ALL ? undefined : (statusFilter as CatalogStatus),
    isSystem: originFilter === ALL ? undefined : originFilter === "system",
    search: search.value,
    page,
    pageSize: PAGE_SIZE,
  });

  const clonedQuery = useScenarioQuery(pendingEditId);
  useEffect(() => {
    if (pendingEditId && clonedQuery.data) {
      setSheet({ mode: "edit", scenario: clonedQuery.data });
      setPendingEditId(null);
    }
  }, [pendingEditId, clonedQuery.data]);

  const scenarios = useMemo(() => data?.data ?? [], [data]);
  const rows = useMemo(() => scenarios.map(toScenarioRow), [scenarios]);
  const total = data?.meta.total ?? 0;
  const hasFilters = statusFilter !== "active" || originFilter !== ALL || search.value.trim() !== "";

  const columns = useMemo(
    () =>
      buildScenarioColumns({
        getScenario: (id) => scenarios.find((scenario) => scenario.id === id),
        onView: (scenario) => setSheet({ mode: "view", scenario }),
        onEdit: (scenario) => setSheet({ mode: "edit", scenario }),
        onClone: (scenario) => setCloneSource(scenario),
      }),
    [scenarios],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
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

          <Select
            value={originFilter}
            onValueChange={(value) => {
              setOriginFilter(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-44" aria-label="Filtrar por origen">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los orígenes</SelectItem>
              <SelectItem value="system">De sistema</SelectItem>
              <SelectItem value="own">Propios</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setSheet({ mode: "create" })}>
          <Plus aria-hidden="true" />
          Nuevo escenario
        </Button>
      </div>

      {isPending ? (
        <TableSkeleton rows={6} />
      ) : isError ? (
        <ProblemAlert error={error} onRetry={() => void refetch()} />
      ) : total === 0 && !hasFilters ? (
        <EmptyState
          glyph="ai"
          title="Aún no hay escenarios"
          description="Crea el primer escenario o clona uno de los de fábrica."
          action={
            <Button variant="outline" onClick={() => setSheet({ mode: "create" })}>
              Crear el primer escenario
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
            messages={{ empty: "Ningún escenario coincide con los filtros." }}
          />
        </div>
      )}

      <ScenarioFormSheet
        open={sheet !== undefined}
        onOpenChange={(open) => {
          if (!open) setSheet(undefined);
        }}
        mode={sheet?.mode ?? "create"}
        scenario={sheet !== undefined && sheet.mode !== "create" ? sheet.scenario : null}
        onClone={(scenario) => {
          setSheet(undefined);
          setCloneSource(scenario);
        }}
        // Remonta el form al cambiar de escenario (defaultValues frescos).
        key={sheet === undefined ? "closed" : sheet.mode === "create" ? "create" : `${sheet.mode}-${sheet.scenario.id}`}
      />

      <CloneScenarioDialog
        open={cloneSource !== null}
        onOpenChange={(open) => {
          if (!open) setCloneSource(null);
        }}
        scenario={cloneSource}
        onCloned={(id) => setPendingEditId(id)}
      />
    </div>
  );
}
