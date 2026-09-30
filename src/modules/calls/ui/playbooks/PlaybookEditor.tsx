"use client";

import { LoaderCircle, Megaphone, Plus, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { isHttpError } from "@/core/api/problem";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  CALL_TYPE_HINTS,
  PLAYBOOK_LIMITS,
  moveStage,
  newStageKey,
  playbookDirty,
  playbookIssues,
  type PlaybookStage,
  type PlaybookView,
  type PreviewOpeningDTO,
} from "@/modules/calls/domain/playbooks";
import {
  applyPlaybookProposal,
  discardPlaybookProposal,
  previewPlaybookOpening,
  resetPlaybook,
  savePlaybook,
} from "@/modules/calls/infrastructure/services/calls-service.adapter";
import { invalidatePlaybookLabels } from "@/modules/calls/infrastructure/hooks/use-playbook-labels";
import { StageEditor } from "./StageEditor";

type Draft = { enabled: boolean; opening_guidance: string; stages: PlaybookStage[] };

function draftOf(view: PlaybookView): Draft {
  return {
    enabled: view.enabled,
    opening_guidance: view.playbook.opening_guidance,
    stages: view.playbook.stages.map((stage) => ({ ...stage, must: [...stage.must], never: [...stage.never] })),
  };
}

/**
 * El editor de UN marco (Llamadas → Marcos, plan de modos §5). El dueño edita
 * el marco completo; el servidor guarda solo lo distinto de la base de axi.
 * Arriba lo que decide (usar el marco, restablecer), la propuesta de Alba si
 * hay una, y «Así abriría» —la única isla de la pantalla—; debajo, la lista de
 * etapas. La barra de guardar en tinta aparece solo con cambios.
 */
export function PlaybookEditor({
  view,
  canManage,
  onSaved,
  onDirtyChange,
}: {
  view: PlaybookView;
  canManage: boolean;
  onSaved: (next: PlaybookView) => void;
  /** La vista confirma antes de cambiar de tipo o de proponer con cambios sin guardar. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { showAlert, showModal, closeModal } = useAlert();
  const [draft, setDraft] = useState<Draft>(() => draftOf(view));
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<"reset" | "apply" | "discard" | null>(null);
  const [serverIssues, setServerIssues] = useState<string[]>([]);

  // Una vista nueva del servidor (p. ej. la recarga tras «Proponer con Alba»)
  // solo pisa el borrador si NO había cambios sin guardar (auditoría A2). Tras
  // un guardado propio, quien guarda ya dejó el borrador en lo guardado.
  const base = useRef(view);
  useEffect(() => {
    const previous = base.current;
    base.current = view;
    if (previous === view) return;
    setDraft((current) => (playbookDirty(previous, current) ? current : draftOf(view)));
  }, [view]);

  const dirty = playbookDirty(view, draft);
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);
  const issues = useMemo(() => playbookIssues(draft.stages, draft.opening_guidance), [draft]);
  const savedByKey = useMemo(
    () => new Map(view.playbook.stages.map((stage) => [stage.key, JSON.stringify(stage)])),
    [view],
  );

  const setStage = (index: number, next: PlaybookStage) =>
    setDraft((d) => ({ ...d, stages: d.stages.map((stage, i) => (i === index ? next : stage)) }));

  const addStage = () => {
    const key = newStageKey("nueva etapa", new Set(draft.stages.map((stage) => stage.key)));
    const stage: PlaybookStage = { key, label: "", goal: "", advance_when: "", must: [], never: [] };
    // Siempre antes del cierre: el marco termina con él.
    setDraft((d) => ({ ...d, stages: [...d.stages.slice(0, -1), stage, ...d.stages.slice(-1)] }));
    setOpen(key);
  };

  const save = async () => {
    if (issues.length > 0 || saving) return;
    setSaving(true);
    setServerIssues([]);
    try {
      // Una etapa NUEVA (sin guardar) toma su clave del nombre que le dio el
      // dueño: «Ofrecer demo» → `ofrecer_demo`. Las guardadas conservan la suya.
      const saved = new Set(view.playbook.stages.map((stage) => stage.key));
      const taken = new Set(draft.stages.filter((stage) => saved.has(stage.key)).map((stage) => stage.key));
      const stages = draft.stages.map((stage) => {
        if (saved.has(stage.key)) return stage;
        const key = newStageKey(stage.label, taken);
        taken.add(key);
        return { ...stage, key };
      });
      const next = await savePlaybook(view.call_type, { ...draft, stages });
      invalidatePlaybookLabels();
      setDraft(draftOf(next));
      onSaved(next);
      showAlert({ tone: "success", title: "Marco guardado", description: "Lo usan las próximas llamadas." });
    } catch (error) {
      const serverList = isHttpError(error) ? (error.problem?.details?.issues as unknown) : undefined;
      if (Array.isArray(serverList)) setServerIssues(serverList.filter((i): i is string => typeof i === "string"));
      showAlert({ tone: "error", title: errorMessage(error, "No pudimos guardar el marco") });
    } finally {
      setSaving(false);
    }
  };

  const run = async (kind: "reset" | "apply" | "discard", action: () => Promise<PlaybookView>, done: string) => {
    setBusy(kind);
    try {
      const next = await action();
      invalidatePlaybookLabels();
      setDraft(draftOf(next));
      setServerIssues([]);
      onSaved(next);
      showAlert({ tone: "success", title: done });
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const readOnly = !canManage;
  const shownIssues = serverIssues.length > 0 ? serverIssues : issues;

  return (
    <section aria-label={`Marco: ${view.label}`} className="flex min-w-0 flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {view.label}
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium">
              <Megaphone aria-hidden className="size-3.5 text-accent-violet" />
              Proactivo
            </span>
          </h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            {CALL_TYPE_HINTS[view.call_type]} Es un marco de control, no un guion: el agente sabe en qué etapa va y
            adónde llevar la llamada, y habla con la voz de tu negocio.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm font-medium">
            <Switch
              size="lg"
              checked={draft.enabled}
              disabled={readOnly}
              onCheckedChange={(enabled) => setDraft((d) => ({ ...d, enabled }))}
              aria-describedby="playbook-enabled-hint"
            />
            Usar este marco
          </label>
          {canManage && view.customized && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy !== null}
              // F-9: restablecer borra los ajustes del negocio: se confirma.
              onClick={() =>
                showModal({
                  title: "¿Restablecer el marco?",
                  description: `Se borran los ajustes de «${view.label}» y vuelve la base de axi. Las próximas llamadas la usan.`,
                  actions: [
                    { label: "Cancelar", variant: "outline", asClose: true, id: "playbook-reset-cancel" },
                    {
                      label: "Restablecer",
                      variant: "destructive",
                      asClose: false,
                      id: "playbook-reset-confirm",
                      onClick: () => {
                        closeModal();
                        void run("reset", () => resetPlaybook(view.call_type), "Marco restablecido a la base de axi");
                      },
                    },
                  ],
                  className: "sm:max-w-md",
                })
              }
            >
              {busy === "reset" ? <LoaderCircle aria-hidden className="animate-spin" /> : <RotateCcw aria-hidden />}
              Restablecer
            </Button>
          )}
        </div>
      </header>
      <p id="playbook-enabled-hint" className="-mt-2 text-xs text-muted-foreground">
        {draft.enabled
          ? "Las llamadas de este tipo dicen el motivo al contestar y siguen estas etapas."
          : "Apagado: las llamadas de este tipo van en modo reactivo, sin marco ni apertura."}
      </p>

      {view.proposal !== null && (
        <ProposalNotice
          view={view}
          canManage={canManage}
          busy={busy}
          onApply={() =>
            void run("apply", () => applyPlaybookProposal(view.call_type), "Aplicaste la propuesta de Alba")
          }
          onDiscard={() =>
            void run("discard", () => discardPlaybookProposal(view.call_type), "Descartaste la propuesta")
          }
        />
      )}

      <OpeningIsland
        type={view.call_type}
        draft={dirty ? draft : null}
        invalidReason={issues[0] ?? null}
        disabled={!draft.enabled}
        canPreview={canManage}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="playbook-opening" className="flex items-baseline justify-between text-[13px] font-medium">
          <span>Cómo abre la llamada</span>
          <span
            className={cn(
              "text-[11px] font-normal tabular-nums",
              draft.opening_guidance.length > PLAYBOOK_LIMITS.opening ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {draft.opening_guidance.length}/{PLAYBOOK_LIMITS.opening}
          </span>
        </label>
        <Textarea
          id="playbook-opening"
          rows={2}
          value={draft.opening_guidance}
          readOnly={readOnly}
          onChange={(event) => setDraft((d) => ({ ...d, opening_guidance: event.target.value }))}
        />
        <p className="text-xs text-muted-foreground">
          La guía de la primera frase, la que suena pegada al aviso de grabación. Se genera con los datos del
          contacto mientras el teléfono timbra.
        </p>
      </div>

      <ol aria-label="Etapas del marco" className="overflow-hidden rounded-3xl border border-border bg-card">
        {draft.stages.map((stage, index) => (
          <StageEditor
            key={stage.key}
            stage={stage}
            index={index}
            total={draft.stages.length}
            open={open === stage.key}
            onToggle={() => setOpen((current) => (current === stage.key ? null : stage.key))}
            onChange={(next) => setStage(index, next)}
            onMove={(delta) => setDraft((d) => ({ ...d, stages: moveStage(d.stages, index, delta) }))}
            onRemove={() => setDraft((d) => ({ ...d, stages: d.stages.filter((_, i) => i !== index) }))}
            readOnly={readOnly}
            changed={savedByKey.get(stage.key) !== JSON.stringify(stage)}
          />
        ))}
        {canManage && draft.stages.length < PLAYBOOK_LIMITS.max_stages && (
          <li className="border-t border-dashed border-border">
            <button
              type="button"
              onClick={addStage}
              className="flex w-full items-center gap-2 px-5 py-3.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <Plus aria-hidden className="size-4" />
              Añadir una etapa antes del cierre
            </button>
          </li>
        )}
      </ol>

      {canManage && (
        <UnsavedChangesDock
          dirty={dirty}
          submitting={saving}
          invalid={shownIssues.length > 0}
          invalidReason={shownIssues[0]}
          detail="El servidor guarda solo lo que cambiaste sobre la base de axi."
          submitLabel="Guardar marco"
          onSave={() => void save()}
          onDiscard={() => {
            setDraft(draftOf(view));
            setServerIssues([]);
          }}
        />
      )}
    </section>
  );
}

/** «Alba propone» (DESIGN §7.1 regla 7): violeta, con su porqué y lo que pasa al aplicar. */
function ProposalNotice({
  view,
  canManage,
  busy,
  onApply,
  onDiscard,
}: {
  view: PlaybookView;
  canManage: boolean;
  busy: "reset" | "apply" | "discard" | null;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const proposal = view.proposal;
  if (proposal === null) return null;
  const current = new Map(view.playbook.stages.map((stage) => [stage.key, JSON.stringify(stage)]));
  const touched = proposal.stages.filter((stage) => current.get(stage.key) !== JSON.stringify(stage)).map((s) => s.label);
  const opening = proposal.opening_guidance !== view.playbook.opening_guidance;
  const what = [...(opening ? ["la apertura"] : []), ...touched.map((label) => `«${label}»`)];
  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-accent-violet/25 bg-accent-violet/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-3">
        <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-violet" />
        <p className="text-sm">
          <span className="font-semibold">Alba propone ajustar este marco a tu negocio.</span>{" "}
          <span className="text-muted-foreground">
            Cambia {what.length === 0 ? "el texto de las etapas" : what.slice(0, 3).join(", ")}
            {what.length > 3 ? ` y ${String(what.length - 3)} más` : ""}. Lo que tú escribiste se conserva; al aplicar
            lo usan las próximas llamadas.
          </span>
        </p>
      </div>
      {canManage && (
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={onDiscard}>
            {busy === "discard" && <LoaderCircle aria-hidden className="animate-spin" />}
            Descartar
          </Button>
          <Button size="sm" disabled={busy !== null} onClick={onApply}>
            {busy === "apply" && <LoaderCircle aria-hidden className="animate-spin" />}
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * «Así abriría»: la frase que diría el agente pegada al aviso de grabación,
 * con el marco guardado o con el borrador. Cada vista previa es una completion
 * que paga el negocio: se pide con un botón, nunca sola al abrir la pantalla.
 */
function OpeningIsland({
  type,
  draft,
  invalidReason,
  disabled,
  canPreview,
}: {
  type: PlaybookView["call_type"];
  draft: Draft | null;
  /** Con un borrador inválido el servidor respondería 422: no se pide (M2). */
  invalidReason: string | null;
  disabled: boolean;
  canPreview: boolean;
}) {
  const { showAlert } = useAlert();
  const [preview, setPreview] = useState<PreviewOpeningDTO | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => setPreview(null), [type]);

  const listen = async () => {
    setLoading(true);
    try {
      setPreview(
        await previewPlaybookOpening(
          type,
          draft === null ? undefined : { opening_guidance: draft.opening_guidance, stages: draft.stages },
        ),
      );
    } catch (error) {
      const issues = isHttpError(error) ? (error.problem?.details?.issues as unknown) : undefined;
      const first = Array.isArray(issues) ? issues.find((i): i is string => typeof i === "string") : undefined;
      showAlert({
        tone: "error",
        title: errorMessage(error, "No pudimos generar la apertura"),
        ...(first === undefined ? {} : { description: first }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <InkIsland label="Así abriría" glow="ai" className="gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Kicker>
          Así abriría{preview?.agent_name ? ` ${preview.agent_name}` : ""}
        </Kicker>
        {canPreview && !disabled && (
          <Button
            variant="glass"
            size="sm"
            onClick={() => void listen()}
            disabled={loading || invalidReason !== null}
            aria-describedby={invalidReason === null ? undefined : "opening-preview-blocked"}
          >
            {loading ? <LoaderCircle aria-hidden className="animate-spin" /> : <RefreshCw aria-hidden />}
            {preview === null ? "Ver cómo abriría" : "Otra versión"}
          </Button>
        )}
      </div>
      {!disabled && canPreview && invalidReason !== null && (
        <p id="opening-preview-blocked" className="text-xs text-muted-foreground">
          Corrige el marco para ver cómo abriría: {invalidReason}
        </p>
      )}
      {disabled ? (
        <p className="text-sm text-muted-foreground">
          Con el marco apagado, estas llamadas saludan y escuchan: no hay apertura.
        </p>
      ) : preview !== null ? (
        <>
          <p aria-live="polite" className="font-heading text-lg leading-snug text-balance">
            «{preview.text}»
          </p>
          <p className="text-xs text-muted-foreground">
            {preview.source === "generated"
              ? "Suena pegada al saludo y al aviso de grabación, sin pausa. En una llamada real usa el nombre y los datos del contacto."
              : "Versión fija de este tipo: es la que suena si la generada no llega a tiempo."}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {canPreview
            ? "Mira la primera frase que diría el agente con este marco, con un contacto de ejemplo."
            : "La primera frase la genera el agente con este marco al marcar."}
        </p>
      )}
    </InkIsland>
  );
}
