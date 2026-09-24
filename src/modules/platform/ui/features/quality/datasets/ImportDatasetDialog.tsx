"use client";

/**
 * Importación desde el tráfico real (202: corre en cola). Explica la fuente
 * por capacidad y las reglas de privacidad (PII enmascarada, nunca
 * comprobantes ni documentos, copia sin EXIF/GPS).
 */
import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
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
  DEFAULT_IMPORT_DAYS,
  DEFAULT_IMPORT_LIMIT,
  IMPORT_DAYS_MAX,
  IMPORT_LIMIT_MAX,
  type DatasetKind,
  type DatasetListItem,
} from "../../../../domain/quality-datasets";
import { useImportDataset } from "../../../../infrastructure/api/hooks/use-quality-datasets";

const SOURCE_BY_KIND: Record<DatasetKind, { source: string; note: string }> = {
  catalog_search: {
    source: "Consultas de catalog_lookup · métricas de turno (nunca de conversaciones simuladas)",
    note: "Cada consulta llega con los 3 productos que la búsqueda devuelve hoy como sugerencia; tú confirmas la etiqueta.",
  },
  recognition: {
    source: "Fotos entrantes reconocidas como producto o captura de publicación",
    note: "Nunca comprobantes ni documentos. Se guarda una copia normalizada ≤ 1024 px sin EXIF ni GPS; el reconocedor deja sus candidatos como sugerencia.",
  },
  intent: {
    source: "Primer mensaje del cliente en conversaciones con intención confiable (≥ 0,7)",
    note: "Teléfonos, correos, URLs y cédulas se enmascaran antes de guardar; la intención que decidió el clasificador queda como sugerencia.",
  },
};

type ImportDatasetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataset: DatasetListItem | null;
};

export function ImportDatasetDialog({ open, onOpenChange, dataset }: ImportDatasetDialogProps) {
  const { showAlert } = useAlert();
  const importDataset = useImportDataset();
  const [days, setDays] = useState(String(DEFAULT_IMPORT_DAYS));
  const [limit, setLimit] = useState(String(DEFAULT_IMPORT_LIMIT));

  useEffect(() => {
    if (open) {
      setDays(String(DEFAULT_IMPORT_DAYS));
      setLimit(String(DEFAULT_IMPORT_LIMIT));
    }
  }, [open]);

  const daysValue = Number(days);
  const limitValue = Number(limit);
  const valid =
    Number.isInteger(daysValue) && daysValue >= 1 && daysValue <= IMPORT_DAYS_MAX &&
    Number.isInteger(limitValue) && limitValue >= 1 && limitValue <= IMPORT_LIMIT_MAX;

  async function submit() {
    if (!dataset || !valid) return;
    try {
      await importDataset.mutateAsync({ id: dataset.id, body: { days: daysValue, limit: limitValue } });
      showAlert({
        tone: "success",
        title: "Importación en cola",
        description: "Los ítems aparecen en el dataset en unos segundos; se deduplican con los que ya existen.",
        autoCloseMs: 6000,
      });
      onOpenChange(false);
    } catch (error) {
      showAlert({ tone: "error", title: "No se pudo importar", description: errorMessage(error) });
    }
  }

  const info = dataset ? SOURCE_BY_KIND[dataset.kind] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar ítems a «{dataset?.name ?? ""}»</DialogTitle>
          <DialogDescription>
            Trae ítems reales de los últimos días desde los datos del tenant. {info?.note}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm">{info?.source}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="import-days">Días hacia atrás</Label>
              <Input id="import-days" type="number" min={1} max={IMPORT_DAYS_MAX} value={days} onChange={(e) => setDays(e.target.value)} />
              <p className="text-xs text-muted-foreground">máx. {IMPORT_DAYS_MAX}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="import-limit">Límite</Label>
              <Input id="import-limit" type="number" min={1} max={IMPORT_LIMIT_MAX} value={limit} onChange={(e) => setLimit(e.target.value)} />
              <p className="text-xs text-muted-foreground">las más frecuentes primero; se deduplican</p>
            </div>
          </div>
          <Alert variant="info">
            <AlertDescription>
              PII: teléfonos, correos, URLs y cédulas se ocultan antes de guardar. Nada de esto llama a un modelo de IA: la importación cuesta US$ 0.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={importDataset.isPending}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} disabled={!valid || importDataset.isPending}>
            <Download aria-hidden="true" />
            {importDataset.isPending ? "Encolando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
