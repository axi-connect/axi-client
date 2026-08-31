"use client";

/**
 * Catálogo de planes: tabla client-side (el endpoint no pagina) + drawer de
 * crear/editar. Callout fijo del contrato: cambiar `default_limits` NO
 * re-siembra a los suscritos (se re-aplica reasignando el plan por tenant).
 */
import { useMemo, useState } from "react";
import { Info, Plus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import type { PlanListItem } from "../../../domain/plan";
import { usePlansQuery } from "../../../infrastructure/api/hooks/use-plans";
import { EmptyState } from "../../components/EmptyState";
import { ProblemAlert } from "../../components/ProblemAlert";
import { sortRows } from "../../lib/sort-rows";
import { buildPlanColumns, toPlanRow, type PlanRow } from "./plans-table.config";
import { PlanFormSheet } from "./PlanFormSheet";

type PlansSearch = { field: "code" | "name"; value: string };
type PlansSort = { by: keyof PlanRow & string; dir: "asc" | "desc" };

export function PlansView() {
  const { data, isPending, isError, error, refetch } = usePlansQuery();
  const [search, setSearch] = useState<PlansSearch>({ field: "name", value: "" });
  const [sort, setSort] = useState<PlansSort>({ by: "code", dir: "asc" });
  const [page, setPage] = useState(1);
  // Drawer: undefined = cerrado · null = crear · plan = editar.
  const [sheetPlan, setSheetPlan] = useState<PlanListItem | null | undefined>(undefined);

  const plans = useMemo(() => data?.data ?? [], [data]);
  const rows = useMemo(() => {
    const query = search.value.trim().toLowerCase();
    const matched = query
      ? plans.filter((plan) => String(plan[search.field]).toLowerCase().includes(query))
      : plans;
    return sortRows(matched.map(toPlanRow), sort.by, sort.dir);
  }, [plans, search, sort]);

  const columns = useMemo(
    () =>
      buildPlanColumns({
        onEdit: (plan) => setSheetPlan(plan),
        getPlan: (id) => plans.find((plan) => plan.id === id),
      }),
    [plans],
  );

  if (isPending) return <TableSkeleton rows={5} />;
  if (isError) {
    return <ProblemAlert error={error} onRetry={() => void refetch()} className="mx-auto max-w-xl" />;
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Planes</h1>
          <p className="text-sm text-muted-foreground">
            {plans.length === 1 ? "1 plan comercial" : `${plans.length} planes comerciales`}
          </p>
        </div>
        <Button onClick={() => setSheetPlan(null)}>
          <Plus aria-hidden="true" />
          Crear plan
        </Button>
      </header>

      <Alert className="border-info/30 bg-info/5">
        <Info aria-hidden="true" className="size-4 text-info" />
        <AlertTitle>Los límites por defecto no se re-siembran</AlertTitle>
        <AlertDescription>
          Cambiarlos NO afecta a los tenants ya suscritos: re-aplica reasignando el plan desde cada
          tenant (tab Plan &amp; Límites).
        </AlertDescription>
      </Alert>

      {plans.length === 0 ? (
        <EmptyState
          glyph="money"
          title="Aún no hay planes"
          description="Crea el primer plan comercial con sus límites por defecto."
          action={
            <Button variant="outline" onClick={() => setSheetPlan(null)}>
              Crear el primer plan
            </Button>
          }
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          pagination={{ page, pageSize: 10 }}
          onPageChange={setPage}
          sorting={{ by: sort.by, dir: sort.dir }}
          search={{ field: search.field, value: search.value }}
          preferredSearchFields={["name", "code"]}
          onSortChange={(by, dir) => setSort({ by, dir })}
          onSearchChange={({ field, value }) => {
            setSearch({ field: field as PlansSearch["field"], value });
            setPage(1);
          }}
        />
      )}

      <PlanFormSheet
        open={sheetPlan !== undefined}
        onOpenChange={(open) => { if (!open) setSheetPlan(undefined); }}
        plan={sheetPlan ?? null}
        // Remonta el form al cambiar de plan (defaultValues frescos).
        key={sheetPlan === undefined ? "closed" : sheetPlan?.id ?? "create"}
      />
    </div>
  );
}
