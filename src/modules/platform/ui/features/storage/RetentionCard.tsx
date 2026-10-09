"use client";

/**
 * Retención automática del tenant (D6): la configura platform, nace apagada y
 * la aplica el barrido de las 03:30 con el mismo motor de la depuración.
 * Cada cambio guarda el set completo.
 */
import { useEffect, useState } from "react";
import { Clock, Plus, Trash2, WandSparkles } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { BentoTile, StatePill } from "@/shared/components/features/bento";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { files, formatBytes, retentionAgeLabel, retentionRuleLabel, type RetentionRule } from "../../../domain/storage";
import {
  usePurgePreview,
  useReplaceRetention,
  useRetentionPolicies,
} from "../../../infrastructure/api/hooks/use-storage";
import { Provenance, TileFailure, TileLoading } from "./parts";

type Rule = RetentionRule & { enabled: boolean };

const NEW_RULES: { label: string; rule: RetentionRule }[] = [
  {
    label: "Videos de clientes · 6 meses",
    rule: {
      kind: "conversation_media",
      filter: { origin: "customer", mime_classes: ["video"] },
      max_age_days: 180,
    },
  },
  {
    label: "Audios de clientes · 6 meses",
    rule: {
      kind: "conversation_media",
      filter: { origin: "customer", mime_classes: ["audio"] },
      max_age_days: 180,
    },
  },
  {
    label: "Toda la media · 1 año",
    rule: { kind: "conversation_media", filter: {}, max_age_days: 365 },
  },
  {
    label: "Grabaciones · 90 días",
    rule: { kind: "call_recordings", filter: {}, max_age_days: 90 },
  },
  {
    label: "Importaciones · 30 días",
    rule: { kind: "imports", filter: {}, max_age_days: 30 },
  },
];

type Pending = { next: Rule[]; turningOn: Rule[]; message: string };

/**
 * Encender retención es borrar media de clientes cada noche, sin vuelta atrás
 * (auditoría C-6): antes de guardar se dice cuánto borraría ESTA noche (con
 * vistas previas reales de cada regla) y se escribe la frase del tenant.
 */
function ConfirmRetentionDialog({
  tenantId,
  pending,
  saving,
  onCancel,
  onConfirm,
}: {
  tenantId: string;
  pending: Pending;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const preview = usePurgePreview(tenantId);
  const [tally, setTally] = useState<{ files: number; bytes: number; phrase: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const [phrase, setPhrase] = useState("");

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        let filesCount = 0;
        let bytes = 0;
        let confirm = "";
        for (const rule of pending.turningOn) {
          const result = await preview.mutateAsync({
            kind: rule.kind,
            filter: { ...rule.filter, older_than_days: rule.max_age_days },
          });
          filesCount += result.files;
          bytes += result.bytes;
          confirm = result.confirm_phrase;
        }
        if (alive) setTally({ files: filesCount, bytes, phrase: confirm });
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- una vez por diálogo
  }, []);

  return (
    <Dialog open onOpenChange={(open) => (open || saving ? undefined : onCancel())}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>Encender la retención automática</DialogTitle>
          <DialogDescription>
            Cada noche a las 03:30 se borra lo que cumpla estas reglas. Los mensajes quedan con «Archivo eliminado» y no
            hay forma de recuperarlos.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-1 rounded-2xl bg-muted px-4 py-3 text-sm">
          {pending.turningOn.map((rule, index) => (
            <li key={`${rule.kind}-${String(index)}`}>
              <span className="font-medium">{retentionRuleLabel(rule)}</span>{" "}
              <span className="text-muted-foreground">{retentionAgeLabel(rule.max_age_days)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm" role="status" aria-live="polite">
          {failed
            ? "No pudimos calcular cuánto se borraría. Inténtalo de nuevo."
            : tally === null
              ? "Calculando cuánto se borraría esta noche…"
              : tally.files === 0
                ? "Esta noche no se borraría nada todavía."
                : (
                    <>
                      Esta noche se borrarían hasta <span className="font-semibold">{formatBytes(tally.bytes)}</span> en{" "}
                      {files(tally.files)}.
                    </>
                  )}
        </p>
        {tally !== null ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="retention-phrase">
                <span>
                  Para confirmar, escribe{" "}
                  <span className="font-mono text-[13px] whitespace-nowrap">{tally.phrase}</span>
                </span>
              </Label>
              <Input id="retention-phrase" autoComplete="off" value={phrase} onChange={(event) => setPhrase(event.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="rounded-full" onClick={onCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                className="rounded-full"
                disabled={phrase.trim() !== tally.phrase || saving}
              >
                Encender retención
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function RetentionCard({ tenantId, canEdit }: { tenantId: string; canEdit: boolean }) {
  const { showAlert } = useAlert();
  const query = useRetentionPolicies(tenantId);
  const replace = useReplaceRetention(tenantId);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  if (query.isPending) return <TileLoading />;
  if (query.isError) return <TileFailure label="Retención automática" onRetry={() => void query.refetch()} />;

  const rules: Rule[] = query.data.data.map(({ kind, filter, max_age_days, enabled }) => ({
    kind,
    filter,
    max_age_days,
    enabled,
  }));
  const active = rules.some((rule) => rule.enabled);

  /** Apagar o quitar se guarda ya; encender pasa antes por la confirmación (C-6). */
  function change(next: Rule[], message: string) {
    const before = new Set(rules.filter((rule) => rule.enabled).map((rule) => JSON.stringify({ ...rule, enabled: true })));
    const turningOn = next.filter((rule) => rule.enabled && !before.has(JSON.stringify(rule)));
    if (turningOn.length > 0) setPending({ next, turningOn, message });
    else void save(next, message);
  }

  async function save(next: Rule[], message: string) {
    try {
      await replace.mutateAsync(next);
      setPending(null);
      showAlert({ tone: "success", title: message, autoCloseMs: 4000 });
    } catch (error) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar la retención",
        description: errorMessage(error),
      });
    }
  }

  return (
    <BentoTile
      label="Retención automática"
      aside={<StatePill tone={active ? "success" : "neutral"}>{active ? "Activa" : "Apagada"}</StatePill>}
    >
      {rules.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-[60ch] text-sm text-pretty text-muted-foreground">
            Nada se borra solo. La plantilla recomendada borra cada noche los videos de clientes de más de 6 meses,
            el resto de la media de más de un año, las grabaciones de más de 90 días y las importaciones de más de 30.
          </p>
          {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={replace.isPending}
            onClick={() =>
              change(
                query.data.recommended.map((rule) => ({
                  ...rule,
                  enabled: true,
                })),
                "Retención recomendada activada",
              )
            }
          >
            <WandSparkles className="size-4" aria-hidden="true" />
            Usar la recomendada
          </Button>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col" aria-label="Reglas de retención">
          {rules.map((rule, index) => (
            <li
              key={`${rule.kind}-${String(index)}`}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-t border-border/60 py-3 first:border-t-0 first:pt-0"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium">{retentionRuleLabel(rule)}</span>
                <span className="block text-xs text-muted-foreground">
                  {rule.kind === "conversation_media"
                    ? "Media de chats"
                    : rule.kind === "call_recordings"
                      ? "Sistema"
                      : "Catálogo y contactos"}
                </span>
              </span>
              <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                {retentionAgeLabel(rule.max_age_days)}
              </span>
              <Switch
                checked={rule.enabled}
                aria-label={`${rule.enabled ? "Apagar" : "Encender"} ${retentionRuleLabel(rule)}`}
                disabled={replace.isPending || !canEdit}
                onCheckedChange={(checked) =>
                  change(
                    rules.map((item, at) => (at === index ? { ...item, enabled: checked } : item)),
                    checked ? "Regla encendida" : "Regla apagada",
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 rounded-full text-muted-foreground"
                aria-label={`Quitar ${retentionRuleLabel(rule)}`}
                disabled={replace.isPending || !canEdit}
                onClick={() =>
                  void save(
                    rules.filter((_, at) => at !== index),
                    "Regla quitada",
                  )
                }
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Provenance icon={Clock}>
          Se aplica cada noche a las 03:30 · las facturas emitidas y los comprobantes de pago nunca se borran
        </Provenance>
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => setAdding((current) => !current)}
            aria-expanded={adding}
          >
            <Plus className="size-4" aria-hidden="true" />
            Agregar regla
          </Button>
        ) : null}
      </div>
      {adding ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Regla nueva">
          {NEW_RULES.map((option) => (
            <button
              key={option.label}
              type="button"
              className="h-8 rounded-full border border-border px-3 text-[13px] font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              onClick={() => {
                setAdding(false);
                change([...rules, { ...option.rule, enabled: true }], "Regla agregada y encendida");
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {pending !== null ? (
        <ConfirmRetentionDialog
          tenantId={tenantId}
          pending={pending}
          saving={replace.isPending}
          onCancel={() => setPending(null)}
          onConfirm={() => void save(pending.next, pending.message)}
        />
      ) : null}
    </BentoTile>
  );
}
