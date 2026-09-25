"use client";

/**
 * Alta / renombrado de un dataset: tenant, capacidad y nombre (único por
 * tenant y capacidad: 409 `dataset_name_taken` → error inline sin cerrar).
 */
import { useEffect, useState } from "react";
import { isHttpError } from "@/core/api/problem";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  DATASET_KIND_HINTS,
  DATASET_KIND_LABELS,
  DATASET_KINDS,
  DATASET_NAME_MAX,
  DATASET_NAME_MIN,
  type DatasetKind,
  type DatasetListItem,
} from "../../../../domain/quality-datasets";
import { useCreateDataset, useUpdateDataset } from "../../../../infrastructure/api/hooks/use-quality-datasets";
import { TenantSelect } from "../../../components/TenantSelect";

type CreateDatasetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Con dataset: solo renombra. */
  dataset?: DatasetListItem | null;
  /** Preselección del tenant (filtro activo de la lista). */
  initialCompanyId?: string | null;
  onCreated?: (id: string) => void;
};

export function CreateDatasetDialog({ open, onOpenChange, dataset, initialCompanyId, onCreated }: CreateDatasetDialogProps) {
  const { showAlert } = useAlert();
  const createDataset = useCreateDataset();
  const updateDataset = useUpdateDataset();
  const [companyId, setCompanyId] = useState<string>(initialCompanyId ?? "");
  const [kind, setKind] = useState<DatasetKind>("catalog_search");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const editing = dataset !== null && dataset !== undefined;
  const pending = createDataset.isPending || updateDataset.isPending;

  useEffect(() => {
    if (!open) return;
    setName(dataset?.name ?? "");
    setKind(dataset?.kind ?? "catalog_search");
    setCompanyId(dataset?.company_id ?? initialCompanyId ?? "");
    setNameError(null);
  }, [open, dataset, initialCompanyId]);

  async function submit() {
    const trimmed = name.trim();
    if (trimmed.length < DATASET_NAME_MIN || trimmed.length > DATASET_NAME_MAX) {
      setNameError(`Entre ${DATASET_NAME_MIN} y ${DATASET_NAME_MAX} caracteres.`);
      return;
    }
    if (!editing && !companyId) return;
    try {
      if (editing) {
        await updateDataset.mutateAsync({ id: dataset.id, body: { name: trimmed } });
        showAlert({ tone: "success", title: "Dataset renombrado", autoCloseMs: 4000 });
        onOpenChange(false);
        return;
      }
      const { id } = await createDataset.mutateAsync({ company_id: companyId, kind, name: trimmed });
      showAlert({
        tone: "success",
        title: "Dataset creado",
        description: "Importa ítems del tráfico real o añádelos a mano; después etiquétalos.",
        autoCloseMs: 5000,
      });
      onOpenChange(false);
      onCreated?.(id);
    } catch (error) {
      if (isHttpError(error) && error.is("quality/dataset_name_taken")) {
        setNameError("Ya existe un dataset con ese nombre para este tenant y capacidad.");
        return;
      }
      showAlert({ tone: "error", title: editing ? "No se pudo renombrar" : "No se pudo crear", description: errorMessage(error) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Renombrar «${dataset.name}»` : "Nuevo dataset"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Solo cambia el nombre; la capacidad y el tenant se fijan al crear."
              : "Un golden set de una capacidad de un tenant: sus ítems se etiquetan y luego un probe los mide."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!editing && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="dataset-tenant">Tenant *</Label>
                <TenantSelect
                  value={companyId}
                  onValueChange={setCompanyId}
                  disableSuspended
                  className="w-full"
                  ariaLabel="Tenant del dataset"
                  placeholder="Elige el tenant"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Capacidad *</Label>
                <Select value={kind} onValueChange={(value) => setKind(value as DatasetKind)}>
                  <SelectTrigger className="w-full" aria-label="Capacidad del dataset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATASET_KINDS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {DATASET_KIND_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{DATASET_KIND_HINTS[kind]}</p>
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dataset-name">Nombre *</Label>
            <Input
              id="dataset-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              placeholder="Consultas reales · septiembre"
              autoComplete="off"
              maxLength={DATASET_NAME_MAX}
            />
            {nameError && (
              <p className="text-xs text-destructive" role="alert">
                {nameError}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={pending || (!editing && !companyId)}>
            {pending ? "Guardando…" : editing ? "Renombrar" : "Crear dataset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
