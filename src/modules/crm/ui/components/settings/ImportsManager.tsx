"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, LoaderCircle, RotateCcw, UploadCloud } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { relativeTime } from "@/core/lib/relative-time";
import { useAlert } from "@/core/providers/alert-provider";
import { useSocket, useSocketEvent } from "@/core/realtime/use-socket";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { MultiSelect } from "@/shared/components/features/multi-select";
import { TableSkeleton } from "@/shared/components/features/loading";
import {
  CONTACT_STAGE_LABELS,
  CONTACT_STAGE_ORDER,
  type ContactLifecycleStage,
} from "@/modules/crm/domain/enums";
import {
  IMPORT_MAX_BYTES,
  IMPORT_MAX_ROWS,
  IMPORT_STATUS_LABELS,
  isImportDone,
  type ImportJobDTO,
  type ImportJobStatus,
  type ImportOptions,
} from "@/modules/crm/domain/import";
import type { TagDTO } from "@/modules/crm/domain/segment";
import {
  createImport,
  getImport,
  listImports,
} from "@/modules/crm/infrastructure/services/imports-service.adapter";
import { listTags } from "@/modules/crm/infrastructure/services/segments-service.adapter";

const POLL_MS = 2000;
const NO_STAGE = "__none__";

const STATUS_BADGE: Record<ImportJobStatus, string> = {
  pending: "border-transparent bg-secondary text-secondary-foreground",
  processing: "border-transparent bg-info/12 text-info",
  completed: "border-transparent bg-success/12 text-success",
  failed: "border-transparent bg-destructive/12 text-destructive",
};

/** Reporte del job: tiles de contadores + tabla de errores por fila (≤100). */
function ImportReport({ job }: { job: ImportJobDTO }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "Creados", value: job.created_count },
          { label: "Actualizados", value: job.updated_count },
          { label: "Omitidos", value: job.skipped_count },
          { label: "Errores", value: job.error_count },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-border p-3 text-center">
            <p className="text-lg font-semibold tabular-nums">{tile.value}</p>
            <p className="text-xs text-muted-foreground">{tile.label}</p>
          </div>
        ))}
      </div>
      {job.errors.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-3 py-2 font-medium">Fila</th>
                <th className="px-3 py-2 font-medium">Campo</th>
                <th className="px-3 py-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {job.errors.map((error, index) => (
                <tr key={`${error.row}-${index}`}>
                  <td className="px-3 py-1.5 tabular-nums">{error.row}</td>
                  <td className="px-3 py-1.5">{error.field ?? "—"}</td>
                  <td className="px-3 py-1.5">{error.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Wizard de import CSV (gate contacts:import): dropzone con validación
 * client-side (extensión + 10 MB) → opciones → POST multipart → job con
 * polling cada 2 s + WS `crm.import_completed` → reporte. Historial debajo.
 */
export function ImportsManager() {
  const { showAlert } = useAlert();
  const { socket } = useSocket("inbox");

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [onDuplicate, setOnDuplicate] = useState<ImportOptions["on_duplicate"]>("skip");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [stage, setStage] = useState<ContactLifecycleStage | null>(null);
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [activeJob, setActiveJob] = useState<ImportJobDTO | null>(null);
  const [history, setHistory] = useState<ImportJobDTO[] | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshHistory = useCallback(() => {
    listImports()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

  useEffect(() => {
    refreshHistory();
    listTags().then(setTags).catch(() => setTags([]));
  }, [refreshHistory]);

  // Polling del job activo hasta estado terminal (backstop del WS).
  useEffect(() => {
    if (activeJob === null || isImportDone(activeJob.status)) {
      if (pollRef.current !== null) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = setInterval(() => {
      getImport(activeJob.id)
        .then((fresh) => {
          setActiveJob(fresh);
          if (isImportDone(fresh.status)) refreshHistory();
        })
        .catch(() => undefined);
    }, POLL_MS);
    return () => {
      if (pollRef.current !== null) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [activeJob, refreshHistory]);

  useSocketEvent(socket, "crm.import_completed", (event) => {
    if (activeJob !== null && event.import_job_id === activeJob.id) {
      getImport(activeJob.id).then(setActiveJob).catch(() => undefined);
    }
    refreshHistory();
  });

  const acceptFile = (candidate: File) => {
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      showAlert({ tone: "error", title: "El archivo debe ser un CSV", open: true });
      return;
    }
    if (candidate.size > IMPORT_MAX_BYTES) {
      showAlert({ tone: "error", title: "El CSV supera el límite de 10 MB", open: true });
      return;
    }
    setFile(candidate);
  };

  const handleSubmit = async () => {
    if (file === null) return;
    setSubmitting(true);
    try {
      const job = await createImport(file, {
        on_duplicate: onDuplicate,
        tag_ids: tagIds,
        lifecycle_stage: stage ?? undefined,
      });
      setActiveJob(job);
      setFile(null);
      refreshHistory();
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo iniciar el import"), open: true });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Job activo */}
      {activeJob !== null ? (
        <div className="space-y-3 rounded-2xl border border-border bg-background p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">{activeJob.filename}</h3>
              <Badge variant="outline" className={cn(STATUS_BADGE[activeJob.status])}>
                {IMPORT_STATUS_LABELS[activeJob.status]}
              </Badge>
            </div>
            {isImportDone(activeJob.status) && (
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setActiveJob(null)}>
                <RotateCcw className="size-3.5" />
                Nuevo import
              </Button>
            )}
          </div>
          {!isImportDone(activeJob.status) ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Procesando el archivo… esto puede tardar unos segundos.
            </p>
          ) : (
            <ImportReport job={activeJob} />
          )}
        </div>
      ) : (
        /* Wizard */
        <div className="space-y-4 rounded-2xl border border-border bg-background p-4 md:p-6">
          <label
            htmlFor="crm-import-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const dropped = e.dataTransfer.files[0];
              if (dropped !== undefined) acceptFile(dropped);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragOver ? "border-primary bg-accent" : "border-border hover:border-primary/50",
            )}
          >
            <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
            {file !== null ? (
              <p className="text-sm font-medium">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium">Arrastra tu CSV aquí o haz clic para elegirlo</p>
                <p className="text-xs text-muted-foreground">
                  Máx. 10 MB · {IMPORT_MAX_ROWS.toLocaleString("es-CO")} filas · columnas: nombre,
                  apellido, teléfono, correo, ciudad, dirección
                </p>
              </>
            )}
            <input
              id="crm-import-file"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const chosen = e.target.files?.[0];
                if (chosen !== undefined) acceptFile(chosen);
                e.target.value = "";
              }}
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Si el contacto ya existe</span>
              <Select
                value={onDuplicate}
                onValueChange={(v) => setOnDuplicate(v as ImportOptions["on_duplicate"])}
              >
                <SelectTrigger className="h-9 w-full" aria-label="Manejo de duplicados">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Omitir la fila</SelectItem>
                  <SelectItem value="update">Actualizar sus datos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tags.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Etiquetar como</span>
                <MultiSelect
                  options={tags.map((tag) => ({ label: tag.name, value: tag.id }))}
                  defaultValue={tagIds}
                  onValueChange={setTagIds}
                  placeholder="Sin etiquetas"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Etapa inicial</span>
              <Select
                value={stage ?? NO_STAGE}
                onValueChange={(v: string) =>
                  setStage(v === NO_STAGE ? null : (v as ContactLifecycleStage))
                }
              >
                <SelectTrigger className="h-9 w-full" aria-label="Etapa inicial">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STAGE}>Default (prospecto)</SelectItem>
                  {CONTACT_STAGE_ORDER.map((option) => (
                    <SelectItem key={option} value={option}>
                      {CONTACT_STAGE_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              className="rounded-full"
              disabled={file === null || submitting}
              onClick={() => void handleSubmit()}
            >
              <FileUp className="size-4" />
              {submitting ? "Subiendo…" : "Importar contactos"}
            </Button>
          </div>
        </div>
      )}

      {/* Historial */}
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Historial</h3>
        {history === null ? (
          <TableSkeleton rows={3} showHeader={false} />
        ) : history.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Todavía no has importado contactos.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-background">
            {history.map((job) => (
              <li key={job.id}>
                <button
                  type="button"
                  className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/40"
                  onClick={() => setActiveJob(job)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.filename}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {relativeTime(job.created_at)} · {job.created_count} creados ·{" "}
                      {job.error_count} errores
                    </p>
                  </div>
                  <Badge variant="outline" className={cn(STATUS_BADGE[job.status])}>
                    {IMPORT_STATUS_LABELS[job.status]}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
