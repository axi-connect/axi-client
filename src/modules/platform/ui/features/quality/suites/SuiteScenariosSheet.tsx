"use client";

/**
 * Composición de una suite: buscador de escenarios ACTIVOS + lista ordenada
 * (el índice del array = `position`). Guardar hace PUT de REEMPLAZO TOTAL
 * (1–50 ids, sin duplicados — garantizado por los helpers puros). Las suites
 * de sistema y los escenarios archivados se muestran en solo lectura: los
 * archivados NO se ejecutan (cases_total puede ser menor que scenarios_count).
 */
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, SearchX, X } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { MAX_SUITE_SCENARIOS, type SuiteListItem } from "../../../../domain/quality";
import { useScenariosQuery } from "../../../../infrastructure/api/hooks/use-quality-scenarios";
import {
  useSetSuiteScenarios,
  useSuiteQuery,
} from "../../../../infrastructure/api/hooks/use-quality-suites";
import { ProblemAlert } from "../../../components/ProblemAlert";
import {
  addSuiteScenario,
  moveSuiteScenario,
  removeSuiteScenario,
  type SuiteScenarioItem,
} from "./suite-scenarios.helpers";

type SuiteScenariosSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suite cuya composición se gestiona (null = cerrado). */
  suite: SuiteListItem | null;
  /** Suites de sistema: composición visible pero inmutable. */
  readOnly?: boolean;
};

export function SuiteScenariosSheet({ open, onOpenChange, suite, readOnly = false }: SuiteScenariosSheetProps) {
  const { showAlert } = useAlert();
  const detailQuery = useSuiteQuery(open && suite ? suite.id : null);
  const setScenarios = useSetSuiteScenarios();

  const [items, setItems] = useState<SuiteScenarioItem[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft), 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  // Hidrata la lista local UNA vez por apertura (no pisar cambios del usuario).
  useEffect(() => {
    if (open && items === null && detailQuery.data) {
      setItems(
        detailQuery.data.scenarios.map(({ scenario }) => ({
          id: scenario.id,
          code: scenario.code,
          name: scenario.name,
          status: scenario.status,
        })),
      );
    }
  }, [open, items, detailQuery.data]);

  useEffect(() => {
    if (!open) {
      setItems(null);
      setDirty(false);
      setSearchDraft("");
      setSearch("");
    }
  }, [open]);

  const pickerQuery = useScenariosQuery(
    { status: "active", search, page: 1, pageSize: 10 },
    { enabled: open && !readOnly },
  );

  function apply(next: SuiteScenarioItem[]) {
    setItems(next);
    setDirty(true);
  }

  async function save() {
    if (!suite || !items) return;
    try {
      await setScenarios.mutateAsync({ id: suite.id, scenarioIds: items.map((item) => item.id) });
      showAlert({
        tone: "success",
        title: "Composición guardada",
        description: `${suite.name} quedó con ${items.length} ${items.length === 1 ? "escenario" : "escenarios"}.`,
        autoCloseMs: 5000,
      });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo guardar", description: errorMessage(error) });
    }
  }

  const list = items ?? [];
  const archivedCount = list.filter((item) => item.status === "archived").length;
  const canSave = !readOnly && dirty && list.length >= 1 && list.length <= MAX_SUITE_SCENARIOS;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`Escenarios de la suite · ${suite?.name ?? ""}`}
      subtitle={
        readOnly
          ? "Suite de fábrica: composición de solo lectura."
          : "El orden define la posición de ejecución (1–50, sin duplicados)."
      }
      size="lg"
    >
      <div className="space-y-5 p-4">
        {detailQuery.isPending ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : detailQuery.isError ? (
          <ProblemAlert error={detailQuery.error} onRetry={() => void detailQuery.refetch()} />
        ) : (
          <>
            {archivedCount > 0 && (
              <p className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning">
                {archivedCount === 1
                  ? "1 escenario está archivado y NO se ejecutará"
                  : `${archivedCount} escenarios están archivados y NO se ejecutarán`}
                : una ejecución de esta suite tendrá menos cases que escenarios listados.
              </p>
            )}

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">
                Composición <span className="text-muted-foreground tabular-nums">({list.length}/{MAX_SUITE_SCENARIOS})</span>
              </h3>
              {list.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  La suite está vacía. Añade al menos un escenario para poder guardar.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {list.map((item, index) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
                    >
                      <span className="w-6 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs">{item.code}</span>
                        <span className="ml-2 truncate text-sm text-muted-foreground">{item.name}</span>
                      </div>
                      {item.status === "archived" && (
                        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
                          Archivado
                        </Badge>
                      )}
                      {!readOnly && (
                        <div className="flex shrink-0 items-center">
                          <IconButton
                            label={`Subir ${item.code}`}
                            disabled={index === 0}
                            onClick={() => apply(moveSuiteScenario(list, index, -1))}
                          >
                            <ArrowUp aria-hidden="true" className="size-4" />
                          </IconButton>
                          <IconButton
                            label={`Bajar ${item.code}`}
                            disabled={index === list.length - 1}
                            onClick={() => apply(moveSuiteScenario(list, index, 1))}
                          >
                            <ArrowDown aria-hidden="true" className="size-4" />
                          </IconButton>
                          <IconButton
                            label={`Quitar ${item.code}`}
                            destructive
                            onClick={() => apply(removeSuiteScenario(list, index))}
                          >
                            <X aria-hidden="true" className="size-4" />
                          </IconButton>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {!readOnly && (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Añadir escenarios</h3>
                <Input
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Buscar escenarios activos…"
                  aria-label="Buscar escenarios para añadir"
                />
                {pickerQuery.isPending ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : (pickerQuery.data?.data.length ?? 0) === 0 ? (
                  <p className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                    <SearchX aria-hidden="true" className="size-4" />
                    Sin escenarios activos que coincidan.
                  </p>
                ) : (
                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                    {(pickerQuery.data?.data ?? []).map((scenario) => {
                      const included = list.some((item) => item.id === scenario.id);
                      const full = list.length >= MAX_SUITE_SCENARIOS;
                      return (
                        <li key={scenario.id} className="flex items-center gap-2 bg-background px-3 py-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs">{scenario.code}</span>
                            <span className="ml-2 truncate text-sm text-muted-foreground">{scenario.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={included || full}
                            onClick={() =>
                              apply(
                                addSuiteScenario(list, {
                                  id: scenario.id,
                                  code: scenario.code,
                                  name: scenario.name,
                                  status: scenario.status,
                                }),
                              )
                            }
                          >
                            <Plus aria-hidden="true" />
                            {included ? "Incluido" : "Añadir"}
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            )}

            {!readOnly && (
              <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={setScenarios.isPending}>
                  Cancelar
                </Button>
                <Button onClick={() => void save()} disabled={!canSave || setScenarios.isPending}>
                  {setScenarios.isPending ? "Guardando…" : "Guardar composición"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DetailSheet>
  );
}

function IconButton({
  label,
  onClick,
  disabled = false,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 hover:bg-accent ${destructive ? "hover:text-destructive" : "hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}
