"use client";

/**
 * Adjuntos del escenario (F4): fotos que el cliente simulado envía, elegidas
 * de un dataset de RECONOCIMIENTO del tenant contra el que se correrá
 * (tenant → dataset → ítem etiquetado). `when`: con el primer mensaje o
 * cuando el simulador decida. Máximo 3. El backend vuelve a validar que el
 * ítem sea del tenant de la corrida (N4).
 */
import { useState } from "react";
import { Image as ImageIcon, Plus, X } from "lucide-react";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { itemSubtitle, itemTitle } from "../../../../domain/quality-datasets";
import {
  MAX_ATTACHMENTS,
  type ScenarioAttachment,
} from "../../../../domain/quality";
import {
  useDatasetItemsQuery,
  useDatasetsQuery,
} from "../../../../infrastructure/api/hooks/use-quality-datasets";
import { TenantSelect } from "../../../components/TenantSelect";

type AttachmentsEditorProps = {
  value: ScenarioAttachment[];
  onChange: (next: ScenarioAttachment[]) => void;
  disabled?: boolean;
};

export function AttachmentsEditor({ value, onChange, disabled = false }: AttachmentsEditorProps) {
  const [companyId, setCompanyId] = useState<string>("");
  const [datasetId, setDatasetId] = useState<string>("");
  const datasets = useDatasetsQuery({
    companyId: companyId || undefined,
    kind: "recognition",
    status: "active",
    page: 1,
    pageSize: 100,
  });
  const items = useDatasetItemsQuery(datasetId || "none", { labelStatus: "labeled", page: 1, pageSize: 100 });
  const datasetRows = companyId ? (datasets.data?.data ?? []) : [];
  const itemRows = datasetId ? (items.data?.data ?? []) : [];

  function add(itemId: string) {
    if (value.some((attachment) => attachment.dataset_item_id === itemId) || value.length >= MAX_ATTACHMENTS) return;
    const item = itemRows.find((row) => row.id === itemId);
    onChange([
      ...value,
      { dataset_item_id: itemId, label: item ? itemSubtitle("recognition", item) : "foto", when: "first_turn" },
    ]);
  }

  function update(index: number, patch: Partial<ScenarioAttachment>) {
    onChange(value.map((attachment, i) => (i === index ? { ...attachment, ...patch } : attachment)));
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((attachment, index) => (
            <li key={attachment.dataset_item_id} className="grid gap-2 rounded-xl border border-border bg-muted/30 p-3 sm:grid-cols-[auto_minmax(0,1fr)_11rem_auto] sm:items-center">
              <ImageIcon aria-hidden="true" className="size-4 text-muted-foreground" />
              <Input
                value={attachment.label}
                onChange={(e) => update(index, { label: e.target.value.slice(0, 120) })}
                placeholder="Etiqueta que ve el simulador (p.ej. «foto del tenis negro»)"
                aria-label={`Etiqueta del adjunto ${index + 1}`}
                disabled={disabled}
              />
              <Select value={attachment.when} onValueChange={(when) => update(index, { when: when as ScenarioAttachment["when"] })} disabled={disabled}>
                <SelectTrigger aria-label={`Cuándo se envía el adjunto ${index + 1}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="first_turn">Con el primer mensaje</SelectItem>
                  <SelectItem value="sim_decides">Cuando el simulador decida</SelectItem>
                </SelectContent>
              </Select>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  aria-label={`Quitar adjunto ${index + 1}`}
                  className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-destructive"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
              <p className="col-span-full font-mono text-[11px] text-muted-foreground">ítem {attachment.dataset_item_id}</p>
            </li>
          ))}
        </ul>
      )}

      {!disabled && value.length < MAX_ATTACHMENTS && (
        <div className="grid gap-2 rounded-xl border border-dashed border-border p-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Tenant</Label>
            <TenantSelect
              value={companyId}
              onValueChange={(next) => {
                setCompanyId(next);
                setDatasetId("");
              }}
              className="w-full"
              ariaLabel="Tenant del dataset de fotos"
              placeholder="Tenant"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Dataset de reconocimiento</Label>
            <Select value={datasetId} onValueChange={setDatasetId} disabled={!companyId}>
              <SelectTrigger aria-label="Dataset de reconocimiento">
                <SelectValue placeholder={!companyId ? "Elige el tenant" : datasetRows.length === 0 ? "Sin datasets" : "Dataset"} />
              </SelectTrigger>
              <SelectContent>
                {datasetRows.map((dataset) => (
                  <SelectItem key={dataset.id} value={dataset.id} disabled={dataset.labeled_count === 0}>
                    {dataset.name} · {dataset.labeled_count} etiquetadas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Foto etiquetada</Label>
            <Select value="" onValueChange={add} disabled={!datasetId}>
              <SelectTrigger aria-label="Foto del dataset">
                <SelectValue placeholder={!datasetId ? "Elige el dataset" : "Añadir foto…"} />
              </SelectTrigger>
              <SelectContent>
                {itemRows.map((item) => (
                  <SelectItem key={item.id} value={item.id} disabled={value.some((attachment) => attachment.dataset_item_id === item.id)}>
                    {itemTitle("recognition", item)} · {itemSubtitle("recognition", item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="col-span-full flex items-center gap-1 text-xs text-muted-foreground">
            <Plus aria-hidden="true" className="size-3" />
            Hasta {MAX_ATTACHMENTS} fotos. El escenario solo podrá correr contra ese tenant (el backend lo exige).
          </p>
        </div>
      )}
    </div>
  );
}
