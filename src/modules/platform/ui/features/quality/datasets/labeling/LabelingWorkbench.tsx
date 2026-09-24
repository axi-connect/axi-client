"use client";

/**
 * Banco de etiquetado de un dataset (upgrade F4): rail de ítems por estado a
 * la izquierda, panel del ítem a la derecha. Tras decidir, avanza al
 * siguiente de la página (y recarga cuando se vacía). Cabecera con el
 * progreso, «Importar», «Añadir consulta/texto» (a mano) y «Correr probe».
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Play, Plus } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Modal } from "@/shared/components/ui/modal";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  DATASET_KIND_LABELS,
  headlineMetric,
  type DatasetItem,
  type LabelStatus,
} from "../../../../../domain/quality-datasets";
import {
  useAddDatasetItem,
  useDatasetItemsQuery,
  useDatasetQuery,
  useDeleteDatasetItem,
  useLabelDatasetItem,
} from "../../../../../infrastructure/api/hooks/use-quality-datasets";
import { EmptyState } from "../../../../components/EmptyState";
import { ProblemAlert } from "../../../../components/ProblemAlert";
import { ImportDatasetDialog } from "../ImportDatasetDialog";
import { ItemsRail } from "./ItemsRail";
import { LabelPanel, type LabelDecision } from "./LabelPanel";

const PAGE_SIZE = 25;

export function LabelingWorkbench({ datasetId }: { datasetId: string }) {
  const { showAlert } = useAlert();
  const datasetQuery = useDatasetQuery(datasetId);
  const [filter, setFilter] = useState<LabelStatus>("unlabeled");
  const [page, setPage] = useState(1);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const itemsQuery = useDatasetItemsQuery(datasetId, { labelStatus: filter, page, pageSize: PAGE_SIZE });
  const labelItem = useLabelDatasetItem();
  const deleteItem = useDeleteDatasetItem();
  const addItem = useAddDatasetItem();

  const dataset = datasetQuery.data;
  const items = useMemo(() => itemsQuery.data?.data ?? [], [itemsQuery.data]);
  const total = itemsQuery.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current: DatasetItem | null = items.find((item) => item.id === currentId) ?? items[0] ?? null;

  useEffect(() => {
    if (current && current.id !== currentId) setCurrentId(current.id);
  }, [current, currentId]);

  function advance(from: string) {
    const index = items.findIndex((item) => item.id === from);
    const next = items[index + 1] ?? items[index - 1] ?? null;
    setCurrentId(next?.id ?? null);
  }

  function decide(decision: LabelDecision) {
    if (!current) return;
    const from = current.id;
    labelItem.mutate(
      {
        id: datasetId,
        itemId: from,
        body: decision.status === "labeled" ? { status: "labeled", expected: decision.expected } : { status: decision.status },
      },
      {
        onSuccess: () => advance(from),
        onError: (error) => showAlert({ tone: "error", title: "No se pudo guardar la etiqueta", description: errorMessage(error) }),
      },
    );
  }

  function remove() {
    if (!current) return;
    const from = current.id;
    deleteItem.mutate(
      { id: datasetId, itemId: from },
      {
        onSuccess: () => advance(from),
        onError: (error) => showAlert({ tone: "error", title: "No se pudo quitar el ítem", description: errorMessage(error) }),
      },
    );
  }

  function addManual() {
    if (!dataset || draft.trim().length === 0) return;
    const input = dataset.kind === "intent" ? { text: draft.trim() } : { query: draft.trim() };
    addItem.mutate(
      { id: datasetId, body: { input } },
      {
        onSuccess: ({ id }) => {
          setAddOpen(false);
          setDraft("");
          setFilter("unlabeled");
          setCurrentId(id);
        },
        onError: (error) => showAlert({ tone: "error", title: "No se pudo añadir", description: errorMessage(error) }),
      },
    );
  }

  if (datasetQuery.isPending) return <TableSkeleton rows={6} />;
  if (datasetQuery.isError) return <ProblemAlert error={datasetQuery.error} onRetry={() => void datasetQuery.refetch()} />;
  if (!dataset) return null;

  const metric = dataset.last_run ? headlineMetric(dataset.kind, dataset.last_run.metrics) : null;
  const remaining = dataset.items_count - dataset.labeled_count;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Link href="/platform/quality/datasets" prefetch={false} className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft aria-hidden="true" className="size-4" />
          Datasets
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{dataset.name}</h2>
            <p className="text-sm text-muted-foreground">
              {dataset.company_name} · {DATASET_KIND_LABELS[dataset.kind]} · {dataset.labeled_count} de {dataset.items_count} etiquetados
              {metric ? ` · último probe ${metric.label} ${metric.value}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dataset.kind !== "recognition" && (
              <Button variant="outline" onClick={() => setAddOpen(true)}>
                <Plus aria-hidden="true" />
                {dataset.kind === "intent" ? "Añadir texto" : "Añadir consulta"}
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportOpen(true)} disabled={dataset.status !== "active"}>
              <Download aria-hidden="true" />
              Importar…
            </Button>
            <Button asChild disabled={dataset.labeled_count === 0}>
              <Link
                href={`/platform/quality/runs/new?kind=probe&company_id=${dataset.company_id}&dataset_id=${dataset.id}&probe_kind=${dataset.kind}`}
                prefetch={false}
              >
                <Play aria-hidden="true" />
                Correr probe
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {dataset.items_count === 0 ? (
        <EmptyState
          glyph="ai"
          title="El dataset está vacío"
          description={
            dataset.kind === "recognition"
              ? "Importa fotos reales del tenant (producto o captura) para empezar a etiquetar."
              : "Importa del tráfico real o añade ítems a mano; después etiquétalos y corre un probe."
          }
          action={
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Importar del tráfico real
            </Button>
          }
        />
      ) : (
        <div className="grid min-h-[560px] gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <ItemsRail
            kind={dataset.kind}
            name={dataset.name}
            remaining={remaining}
            filter={filter}
            onFilterChange={(status) => {
              setFilter(status);
              setPage(1);
              setCurrentId(null);
            }}
            items={items}
            loading={itemsQuery.isPending}
            currentId={current?.id ?? null}
            onSelect={setCurrentId}
            page={page}
            totalPages={totalPages}
            onPageChange={(next) => {
              setPage(next);
              setCurrentId(null);
            }}
          />
          {current ? (
            <LabelPanel
              key={current.id}
              kind={dataset.kind}
              companyId={dataset.company_id}
              item={current}
              pending={labelItem.isPending || deleteItem.isPending}
              onDecide={decide}
              onDelete={remove}
            />
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-border p-8 text-sm text-muted-foreground">
              {itemsQuery.isPending ? "Cargando ítems…" : "Nada que etiquetar en este estado."}
            </div>
          )}
        </div>
      )}

      <ImportDatasetDialog open={importOpen} onOpenChange={setImportOpen} dataset={dataset} />
      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        config={{
          title: dataset.kind === "intent" ? "Añadir un texto" : "Añadir una consulta",
          description:
            dataset.kind === "intent"
              ? "Un mensaje de cliente tal como lo escribiría; lo etiquetas después."
              : "Una consulta tal como la escribiría el cliente (p.ej. «tenis para correr»).",
          body: (
            <div className="space-y-1.5">
              <Label htmlFor="manual-item">{dataset.kind === "intent" ? "Texto" : "Consulta"}</Label>
              {dataset.kind === "intent" ? (
                <Textarea id="manual-item" value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={1000} />
              ) : (
                <Input id="manual-item" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} autoComplete="off" />
              )}
            </div>
          ),
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true },
            { label: addItem.isPending ? "Añadiendo…" : "Añadir", onClick: addManual, keepOpen: true },
          ],
        }}
      />
    </div>
  );
}
