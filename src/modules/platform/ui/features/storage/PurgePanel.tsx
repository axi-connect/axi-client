"use client";

/**
 * Depurar (lienzo P2b–P2d, D5): se elige qué borrar, la vista previa dice
 * cuánto se libera y qué se conserva, y la barra de tinta lleva a la
 * confirmación fuerte (frase + contraseña). El borrado es inmediato.
 */
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Film, Image as ImageIcon, Link2, Mic, Receipt, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BentoFigure, BentoTile } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  AGE_OPTIONS,
  bytesFigure,
  categoryLabel,
  files,
  formatBytes,
  KEPT_LABELS,
  MIME_CLASS_LABELS,
  PURGE_KIND_TITLES,
  type LargeFile,
  type MimeClass,
  type PurgeFilter,
  type PurgeKind,
  type PurgePreview,
  type TenantStorage,
} from "../../../domain/storage";
import {
  useExecutePurge,
  useLargeFiles,
  usePurgePreview,
  usePurgeRun,
  useRefreshTenantStorage,
} from "../../../infrastructure/api/hooks/use-storage";
import { StorageMeter } from "./parts";

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3 text-[13px] font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed ? "border-foreground bg-foreground text-background" : "border-border bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function mimeIcon(mime: string | null) {
  if (mime?.startsWith("video/")) return Film;
  if (mime?.startsWith("audio/")) return Mic;
  if (mime?.startsWith("image/")) return ImageIcon;
  return FileText;
}

const REF_LABELS: Record<string, [string, string]> = {
  attachment: ["mensaje", "mensajes"],
  upload: ["adjunto pendiente", "adjuntos pendientes"],
  product_image: ["foto del catálogo", "fotos del catálogo"],
  quick_action_asset: ["recurso", "recursos"],
  order_payment: ["comprobante de pago", "comprobantes de pago"],
  document: ["documento", "documentos"],
  call_recording: ["llamada", "llamadas"],
  crm_import: ["importación", "importaciones"],
  catalog_import: ["importación", "importaciones"],
  template_media: ["plantilla", "plantillas"],
};

function usesLabel(references: LargeFile["references"]): string {
  const parts = Object.entries(references).map(([kind, count]) => {
    const [one, many] = REF_LABELS[kind] ?? [kind, kind];
    return `${String(count)} ${count === 1 ? one : many}`;
  });
  return parts.length === 0 ? "Sin otros usos" : `Usado en ${parts.join(", ")}`;
}

function LargeFilesPicker({
  tenantId,
  selected,
  onToggle,
}: {
  tenantId: string;
  selected: Set<string>;
  onToggle: (key: string) => void;
}) {
  const [age, setAge] = useState<number | undefined>(undefined);
  const query = useLargeFiles(tenantId, { older_than_days: age, limit: 50, offset: 0 });
  const rows = query.data ?? [];
  return (
    <div className="flex flex-col gap-3">
      <Field label="Más antiguos que">
        <Chip pressed={age === undefined} onClick={() => setAge(undefined)}>Todos</Chip>
        {AGE_OPTIONS.map((option) => (
          <Chip key={option.days} pressed={age === option.days} onClick={() => setAge(option.days)}>{option.label}</Chip>
        ))}
      </Field>
      <div className="@container axi-scroll overflow-x-auto rounded-2xl border border-border">
        <Table className="min-w-[640px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 pl-4"><span className="sr-only">Elegir</span></TableHead>
              <TableHead>Archivo</TableHead>
              <TableHead className="hidden @xl:table-cell">Otros usos</TableHead>
              <TableHead className="text-right">Tamaño</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const Icon = mimeIcon(row.mime_type);
              const locked = row.kept_reason !== null;
              return (
                <TableRow key={row.key} data-state={selected.has(row.key) ? "selected" : undefined}>
                  <TableCell className="pl-4">
                    <input
                      type="checkbox"
                      className="size-4 accent-foreground"
                      checked={selected.has(row.key)}
                      disabled={locked}
                      onChange={() => onToggle(row.key)}
                      aria-label={`Elegir ${row.key.split("/").pop() ?? row.key}`}
                    />
                  </TableCell>
                  <TableCell className="max-w-[320px]">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{categoryLabel(row.category)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(row.created_at))}
                        </span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground @xl:table-cell">
                    {locked ? (
                      <span className="inline-flex items-center gap-1.5">
                        {row.kept_reason === "evidence" ? <Receipt className="size-3" aria-hidden="true" /> : <Link2 className="size-3" aria-hidden="true" />}
                        {row.kept_reason === "evidence" ? "Evidencia: se conserva" : "En uso: se conserva"}
                      </span>
                    ) : (
                      usesLabel(row.references)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums whitespace-nowrap">{formatBytes(row.size_bytes)}</TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && !query.isPending ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No hay archivos con ese filtro.</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ConfirmPurgeDialog({
  open,
  onOpenChange,
  preview,
  tenantId,
  tenantName,
  onFinished,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: PurgePreview;
  tenantId: string;
  tenantName: string;
  onFinished: () => void;
}) {
  const { showAlert } = useAlert();
  const execute = useExecutePurge(tenantId);
  const [phrase, setPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [runId, setRunId] = useState<string | null>(null);
  const run = usePurgeRun(runId);
  const finished = run.data !== undefined && ["done", "partial", "failed"].includes(run.data.status);
  const kept = preview.kept.shared.files + preview.kept.in_use.files + preview.kept.evidence.files;

  useEffect(() => {
    if (!finished || run.data === undefined) return;
    showAlert({
      tone: run.data.status === "done" ? "success" : "error",
      title: run.data.status === "done" ? `Liberamos ${formatBytes(run.data.freed_bytes)}` : "La depuración terminó con fallos",
      description:
        run.data.status === "done"
          ? `${files(run.data.deleted_files)} eliminados de ${tenantName}.`
          : (run.data.error ?? "Algunos archivos no se pudieron borrar."),
      autoCloseMs: 6000,
    });
    onFinished();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una vez por corrida
  }, [finished]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    try {
      setRunId(await execute.mutateAsync({ preview_id: preview.preview_id, confirm_phrase: phrase, password }));
    } catch (error) {
      showAlert({ tone: "error", title: "No se ejecutó la depuración", description: errorMessage(error) });
    }
  }

  const running = runId !== null && !finished;
  return (
    <Dialog open={open} onOpenChange={(next) => (!running ? onOpenChange(next) : undefined)}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>Eliminar {formatBytes(preview.bytes)} de {tenantName}</DialogTitle>
          <DialogDescription>
            Se borran ya {files(preview.files)}. Los mensajes quedan con «Archivo eliminado». No hay papelera ni forma de recuperarlos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {[
            [new Intl.NumberFormat("es-CO").format(preview.files), "archivos"],
            [formatBytes(preview.bytes), "liberados"],
            [new Intl.NumberFormat("es-CO").format(kept), "se conservan"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-muted p-3">
              <p className="font-heading text-xl font-bold tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {running || finished ? (
          <div className="flex flex-col gap-2" role="status" aria-live="polite">
            <StorageMeter
              pct={preview.files === 0 ? 100 : ((run.data?.deleted_files ?? 0) / preview.files) * 100}
              label="Avance de la depuración"
              showMark={false}
            />
            <p className="text-sm text-muted-foreground">
              {finished
                ? `Listo: ${files(run.data?.deleted_files ?? 0)} eliminados, ${formatBytes(run.data?.freed_bytes ?? 0)} liberados.`
                : `Eliminando… ${String(run.data?.deleted_files ?? 0)} de ${String(preview.files)}`}
            </p>
            {finished ? (
              <div className="flex justify-end">
                <Button type="button" className="rounded-full" onClick={() => onOpenChange(false)}>Cerrar</Button>
              </div>
            ) : null}
          </div>
        ) : (
          <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="purge-phrase">
                Escribe <span className="font-mono text-[13px]">{preview.confirm_phrase}</span> para confirmar
              </Label>
              <Input id="purge-phrase" autoComplete="off" value={phrase} onChange={(event) => setPhrase(event.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="purge-password">Tu contraseña</Label>
              <Input id="purge-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                type="submit"
                variant="destructive"
                className="rounded-full"
                disabled={phrase.trim() !== preview.confirm_phrase || password === "" || execute.isPending}
              >
                Eliminar {formatBytes(preview.bytes)}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

const MIME_CLASSES: MimeClass[] = ["video", "audio", "image", "document"];

export function PurgePanel({
  kind,
  storage,
  onClose,
}: {
  kind: Exclude<PurgeKind, "offboarding">;
  storage: TenantStorage;
  onClose: () => void;
}) {
  const tenantId = storage.company_id;
  const preview = usePurgePreview(tenantId);
  const refresh = useRefreshTenantStorage(tenantId);
  const [classes, setClasses] = useState<MimeClass[]>(["video"]);
  const [age, setAge] = useState(180);
  const [origin, setOrigin] = useState<"customer" | "team">("customer");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const filter: PurgeFilter | null = useMemo(() => {
    if (kind === "conversation_media") return { origin, mime_classes: classes, older_than_days: age };
    if (kind === "call_recordings" || kind === "imports") return { older_than_days: age };
    if (kind === "large_files") return selected.size === 0 ? null : { keys: [...selected] };
    return {};
  }, [kind, origin, classes, age, selected]);

  // La vista previa se recalcula con cada filtro (con una pausa breve)
  const filterKey = JSON.stringify(filter);
  useEffect(() => {
    if (filter === null) return;
    const timer = setTimeout(() => preview.mutate({ kind, filter }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la key del filtro manda
  }, [kind, filterKey]);

  const result = filter === null ? null : (preview.data ?? null);
  const after = result === null ? null : Math.max(0, storage.used_bytes - result.bytes);
  const toggle = (value: MimeClass) =>
    setClasses((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  return (
    <>
      <BentoTile
        label={PURGE_KIND_TITLES[kind] ?? kind}
        className="gap-5"
        aside={
          <Button type="button" variant="ghost" size="icon" className="size-8 rounded-full" aria-label="Cerrar depuración" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </Button>
        }
      >
        {kind === "conversation_media" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Tipo">
              {MIME_CLASSES.map((value) => (
                <Chip key={value} pressed={classes.includes(value)} onClick={() => toggle(value)}>{MIME_CLASS_LABELS[value]}</Chip>
              ))}
            </Field>
            <Field label="Más antiguos que">
              {AGE_OPTIONS.map((option) => (
                <Chip key={option.days} pressed={age === option.days} onClick={() => setAge(option.days)}>{option.label}</Chip>
              ))}
            </Field>
            <Field label="De">
              <Chip pressed={origin === "customer"} onClick={() => setOrigin("customer")}>Clientes</Chip>
              <Chip pressed={origin === "team"} onClick={() => setOrigin("team")}>Equipo</Chip>
            </Field>
          </div>
        ) : kind === "call_recordings" || kind === "imports" ? (
          <Field label="Más antiguos que">
            {[{ days: 30, label: "30 días" }, ...AGE_OPTIONS].map((option) => (
              <Chip key={option.days} pressed={age === option.days} onClick={() => setAge(option.days)}>{option.label}</Chip>
            ))}
          </Field>
        ) : kind === "large_files" ? (
          <LargeFilesPicker
            tenantId={tenantId}
            selected={selected}
            onToggle={(key) =>
              setSelected((current) => {
                const next = new Set(current);
                if (next.has(key)) next.delete(key);
                else next.add(key);
                return next;
              })
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">Lo que el equipo ya borró del catálogo y de los recursos. Si un mensaje enviado lo usa, se conserva.</p>
        )}

        {preview.isError ? (
          <p className="text-sm text-muted-foreground">No pudimos calcular la vista previa: {errorMessage(preview.error)}</p>
        ) : result === null ? (
          kind === "large_files" ? <p className="text-sm text-muted-foreground">Elige los archivos que quieres eliminar.</p> : null
        ) : (
          <div className={cn("grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]", preview.isPending && "opacity-60")} aria-busy={preview.isPending}>
            <div className="flex min-w-0 flex-col gap-3">
              <BentoFigure value={bytesFigure(result.bytes).value} unit={`${bytesFigure(result.bytes).unit} en ${files(result.files)}`} />
              {after !== null && storage.quota_bytes !== null ? (
                <>
                  <StorageMeter pct={(after / storage.quota_bytes) * 100} label="Espacio después de depurar" />
                  <p className="text-sm text-muted-foreground">
                    {storage.name} pasaría de <span className="font-medium text-foreground">{formatBytes(storage.used_bytes)}</span> a{" "}
                    <span className="font-medium text-foreground">{formatBytes(after)}</span>
                    {storage.blocks_uploads && after < storage.quota_bytes ? " y su equipo podría volver a subir archivos." : "."}
                  </p>
                </>
              ) : null}
              {result.sample.length > 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3" aria-hidden="true" />
                  Del {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(result.sample[result.sample.length - 1].created_at))} al{" "}
                  {new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(new Date(result.sample[0].created_at))} (muestra de los más pesados)
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-2 rounded-2xl bg-muted px-4 py-3 text-sm">
              <p className="font-semibold">Se conservan</p>
              {(["shared", "in_use", "evidence"] as const).map((reason) =>
                result.kept[reason].files > 0 ? (
                  <p key={reason} className="text-pretty">
                    <span className="font-medium">{files(result.kept[reason].files)}</span>: {KEPT_LABELS[reason]}.
                  </p>
                ) : null,
              )}
              {kind === "conversation_media" || kind === "large_files" ? (
                <p className="text-pretty text-muted-foreground">Los mensajes no se borran: cada archivo queda como «Archivo eliminado».</p>
              ) : null}
              {result.kept.shared.files + result.kept.in_use.files + result.kept.evidence.files === 0 ? (
                <p className="text-muted-foreground">Nada: todo lo elegido se puede borrar.</p>
              ) : null}
            </div>
          </div>
        )}
      </BentoTile>

      {result !== null && result.files > 0 ? (
        <Island
          as="footer"
          material="ink"
          glow="brand"
          aria-label="Eliminar"
          className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl p-3 pl-5 shadow-[var(--shadow-overlay)]"
        >
          <div className="min-w-0 text-sm">
            <p className="font-semibold">Eliminar {formatBytes(result.bytes)} · {files(result.files)}</p>
            <p className="text-xs opacity-75">Es inmediato y no se puede deshacer.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="glass" size="sm" onClick={onClose}>Cancelar</Button>
            <Button type="button" variant="destructive" size="sm" className="rounded-full" onClick={() => setConfirming(true)}>
              Eliminar {formatBytes(result.bytes)}
            </Button>
          </div>
        </Island>
      ) : null}

      {result !== null && confirming ? (
        <ConfirmPurgeDialog
          open={confirming}
          onOpenChange={setConfirming}
          preview={result}
          tenantId={tenantId}
          tenantName={storage.name}
          onFinished={() => {
            refresh();
            setSelected(new Set());
            if (filter !== null) preview.mutate({ kind, filter });
          }}
        />
      ) : null}
    </>
  );
}
