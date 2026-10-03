"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, CircleAlert, CircleCheck, CircleX, CornerUpLeft, Hourglass, LoaderCircle, MessageSquare, Monitor, X } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { FormStep, StepProgress, type FormStepState, type StepProgressCheck } from "@/shared/components/features/form-steps";
import { Island } from "@/shared/components/features/island";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { HSM_CATEGORY_LABELS } from "@/modules/marketing/domain/enums";
import {
  firstMissingExample,
  hsmDraftErrors,
  stepsWithErrors,
  type HsmDraftErrors,
} from "@/modules/marketing/domain/hsm-template-draft";
import {
  classifyHsmSubmitError,
  HSM_REJECT_REASONS,
  type HsmFormStep,
  type HsmSubmitFailure,
} from "@/modules/marketing/domain/meta-template-view";
import {
  inspectTemplateVariables,
  rejectionReasonLabel,
  SUGGESTED_OPENING_TEMPLATES,
  TEMPLATE_COST_CO_USD,
  type HsmTemplateDTO,
} from "@/modules/marketing/domain/template-catalog";
import {
  composeTemplateName,
  firstFreeVersion,
  formatTemplateBase,
  humanizeTemplateBase,
  splitTemplateName,
  versionOptions,
} from "@/modules/marketing/domain/template-name";
import {
  BODY_MAX,
  breaksDesktop,
  emptyButton,
  FOOTER_MAX,
  groupButtons,
  HEADER_MAX,
  readBodyExamples,
  readTemplatePieces,
  type TemplateButton,
} from "@/modules/marketing/domain/template-pieces";
import {
  createHsmTemplate,
  listHsmTemplates,
  updateHsmTemplate,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";
import { HsmPreview } from "@/modules/marketing/ui/components/HsmPreview";
import { HsmSubmitNotice } from "@/modules/marketing/ui/components/HsmSubmitNotice";
import { TemplateButtonsEditor } from "@/modules/marketing/ui/components/TemplateButtonsEditor";
import { PurposeCards } from "./PurposeCards";
import { StartStrip } from "./StartStrip";
import { TemplateNameField } from "./TemplateNameField";

type Category = HsmTemplateDTO["category"];
type HeaderKind = "none" | "text";

const LANGUAGES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "es_CO", label: "Español (Colombia)" },
  { value: "es_MX", label: "Español (México)" },
  { value: "es", label: "Español" },
  { value: "en_US", label: "Inglés (Estados Unidos)" },
];

const START_OPTIONS = SUGGESTED_OPENING_TEMPLATES.map((suggestion) => ({
  key: suggestion.key,
  title: suggestion.title,
  body: suggestion.body,
}));

/** El añadidor de piezas: mismo botón punteado para el pie y los botones. */
const ADDER =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-foreground/20 px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

/** Un paso de la página: su número y su título. El orden es el de la maqueta. */
const STEPS: ReadonlyArray<{ key: HsmFormStep; number: number; title: string }> = [
  { key: "purpose", number: 1, title: "¿Para qué es?" },
  { key: "message", number: 2, title: "El mensaje" },
  { key: "ficha", number: 3, title: "Ficha" },
];

function priceLabel(category: Category): string {
  return `US$ ${TEMPLATE_COST_CO_USD[category].toLocaleString("es-CO", { maximumFractionDigits: 4 })}`;
}

/**
 * Alta y corrección de una plantilla de Meta en página propia (maqueta F0
 * aprobada, `docs/design/mockups/hsm-template-page`). Reemplaza la modal, que
 * apilaba cuatro pasos en un diálogo sin sitio: aquí el operador escribe el
 * mensaje a la izquierda y lo ve a la derecha.
 *
 * Meta revisa y decide; lo que esta página hace es que llegue BIEN a esa
 * revisión —categoría por lo que es, variables en orden y con ejemplos, el
 * nombre en su formato sin que nadie lo aprenda— y que, si algo sale mal al
 * enviar, diga qué pasó y qué hacer sin perder lo escrito.
 */
export function HsmTemplateForm({
  channelId,
  templates: initialTemplates,
  editing = null,
  onSaved,
  onViewExisting,
  onSync,
  onDirtyChange,
  onCancel,
}: {
  channelId: string;
  /** Las del canal: de aquí salen las versiones usadas y el «¿ya llegó?». */
  templates: readonly HsmTemplateDTO[];
  /** La que se edita, o `null` para crear. Meta no deja tocar nombre ni idioma. */
  editing?: HsmTemplateDTO | null;
  onSaved: (template: HsmTemplateDTO) => void;
  /** «Ver la plantilla»: vuelve a la lista y la señala. */
  onViewExisting: (templateId: string | null) => void;
  /** «Sincronizar con Meta» desde el aviso de «Meta ya la tiene». */
  onSync: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
}) {
  const { showAlert } = useAlert();
  const isEditing = editing !== null;
  const isFixing = editing?.approval_status === "rejected";
  const editingName = editing === null ? null : splitTemplateName(editing.name);
  const stored = useMemo(() => readTemplatePieces(editing?.components), [editing]);
  const nameRef = useRef<HTMLInputElement>(null);

  const [templates, setTemplates] = useState<readonly HsmTemplateDTO[]>(initialTemplates);
  const [human, setHuman] = useState(editingName === null ? "" : humanizeTemplateBase(editingName.base));
  const [versionChoice, setVersionChoice] = useState<number | null>(null);
  // Lo que Meta dijo que está reservado (el 409 al enviar): la lista no trae las
  // borradas, así que solo se sabe al chocar. Clave `base|idioma`.
  const [reserved, setReserved] = useState<ReadonlyMap<string, ReadonlyMap<number, string | null>>>(new Map());
  const [language, setLanguage] = useState(editing?.language ?? "es_CO");
  const [category, setCategory] = useState<Category>(editing?.category ?? "utility");
  const [body, setBody] = useState(editing?.body ?? "");
  // Al editar, los ejemplos que ya tiene: corregir no obliga a reescribirlos.
  const [examples, setExamples] = useState<string[]>(() => readBodyExamples(editing?.components));
  const [header, setHeader] = useState<string | null>(stored.header);
  const [footer, setFooter] = useState<string | null>(stored.footer);
  const [buttons, setButtons] = useState<TemplateButton[]>(stored.buttons);
  const [origin, setOrigin] = useState<string | null>(null);
  const [startCollapsed, setStartCollapsed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Guarda síncrona: `submitting` es estado y no llega a tiempo para el segundo
  // clic del mismo tick. Un segundo POST crea en Meta otra vez (incidente 2026-09-28).
  const inFlight = useRef(false);
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<HsmSubmitFailure | null>(null);
  // El nombre con que se envió cuando falló: el aviso habla de ESE, aunque el
  // selector ya haya saltado a la siguiente versión libre.
  const [failedName, setFailedName] = useState("");
  const [checking, setChecking] = useState(false);
  // Todos abiertos al llegar, como el alta de producto: el operador pliega lo que ya resolvió.
  const [openSteps, setOpenSteps] = useState<Record<HsmFormStep, boolean>>({
    purpose: !isEditing,
    message: true,
    ficha: !isEditing,
  });

  const base = editingName?.base ?? formatTemplateBase(human);
  const reservedHere = reserved.get(`${base}|${language}`);
  const options = useMemo(
    () => versionOptions(base, language, templates, reservedHere),
    [base, language, templates, reservedHere],
  );
  const chosenIsFree = versionChoice !== null && options.some((option) => option.version === versionChoice && option.taken === null);
  const version = editingName !== null ? editingName.version : chosenIsFree ? versionChoice : firstFreeVersion(options);
  const name = editing !== null ? editing.name : base === "" ? "" : composeTemplateName(base, version ?? 1);

  const verdict = useMemo(() => inspectTemplateVariables(body), [body]);
  const variableCount = verdict.ok ? verdict.count : 0;
  const categoryLocked = isEditing && editing.approval_status === "approved";
  const errors: HsmDraftErrors = hsmDraftErrors({ base, name, body, examples, header, footer, buttons });
  const errorSteps = stepsWithErrors(errors);
  const invalid = errorSteps.size > 0;
  const missingExample = firstMissingExample(examples, variableCount);
  const categoryLabel = HSM_CATEGORY_LABELS[category];

  // Sucio = distinto de como llegó. Al guardar se limpia antes de navegar.
  const snapshot = JSON.stringify([human, language, category, body, examples, header, footer, buttons]);
  const initialSnapshot = useRef(snapshot);
  const dirty = snapshot !== initialSnapshot.current;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  function goToStep(step: HsmFormStep, focusId?: string) {
    setOpenSteps((previous) => ({ ...previous, [step]: true }));
    // Tras pintar el paso abierto: el campo existe siempre (`hidden`), pero el foco va cuando se ve.
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      document.getElementById(`hsm-step-${step}`)?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      if (focusId !== undefined) document.getElementById(focusId)?.focus({ preventScroll: true });
      else if (step === "ficha") nameRef.current?.focus({ preventScroll: true });
    });
  }

  function applySuggestion(key: string) {
    const suggestion = SUGGESTED_OPENING_TEMPLATES.find((item) => item.key === key);
    if (suggestion === undefined) return;
    setHuman(humanizeTemplateBase(splitTemplateName(suggestion.name).base));
    setVersionChoice(null);
    setBody(suggestion.body);
    setCategory("utility");
    setExamples([...suggestion.examples]);
    setOrigin(key);
    setStartCollapsed(true);
    setFailure(null);
  }

  function startBlank() {
    // «En blanco» es empezar de cero: si venía de una sugerida, se limpia.
    if (origin !== null) {
      setHuman("");
      setBody("");
      setExamples([]);
    }
    setOrigin(null);
    setStartCollapsed(true);
    setFailure(null);
  }

  function insertVariable() {
    const next = variableCount + 1;
    setBody((previous) => `${previous}${previous.endsWith(" ") || previous === "" ? "" : " "}{{${String(next)}}}`);
  }

  /** La siguiente versión libre que no sea la que acaba de chocar: la salida de un 409 en un clic. */
  function nextVersionAfterCurrent(): number {
    const free = options.find((option) => option.taken === null && option.version !== version);
    return free?.version ?? (version ?? 0) + 1;
  }

  /**
   * «Usar …» del aviso de un 409. Si el selector ya saltó solo (la versión que
   * falló quedó marcada como reservada o en uso), basta con aceptar la que está;
   * si no, se elige la siguiente libre.
   */
  function useNextVersion() {
    if (name === failedName) setVersionChoice(nextVersionAfterCurrent());
    setFailure(null);
    goToStep("ficha");
  }

  async function refreshTemplates(): Promise<readonly HsmTemplateDTO[]> {
    const rows = await listHsmTemplates({ channel_id: channelId });
    setTemplates(rows);
    return rows;
  }

  /**
   * Sin respuesta, lo honesto es MIRAR antes de reenviar: si la plantilla ya
   * está en la lista, llegó; si no, se puede enviar.
   *
   * Se busca por el nombre que SE ENVIÓ, no por el de ahora: si llegó, su
   * versión aparece en uso al recargar y el selector salta solo a la siguiente,
   * y buscar esa diría «no llegó» de una que sí llegó (el incidente 2026-09-28).
   */
  async function checkArrived() {
    setChecking(true);
    try {
      const rows = await refreshTemplates();
      const arrived = !isEditing ? rows.find((row) => row.name === failedName && row.language === language) : undefined;
      if (arrived !== undefined) {
        showAlert({
          tone: "success",
          title: "Ya llegó a Meta",
          description: "Está en la lista, en revisión: no hace falta enviarla otra vez.",
        });
        onDirtyChange(false);
        onSaved(arrived);
        return;
      }
      setFailure(null);
      showAlert({ tone: "info", title: "No llegó: ya puedes enviarla" });
    } catch {
      // Seguimos sin saber: el aviso se queda y el botón sigue esperando.
      showAlert({ tone: "error", title: "Tampoco pudimos leer la lista. Inténtalo en un momento" });
    } finally {
      setChecking(false);
    }
  }

  async function submit() {
    setTouched(true);
    if (invalid) {
      // Se abre y se lleva al primer paso con error: un error plegado no se ve.
      const first = STEPS.find((step) => errorSteps.has(step.key));
      setOpenSteps((previous) => ({
        purpose: previous.purpose,
        message: previous.message || errorSteps.has("message"),
        ficha: previous.ficha || errorSteps.has("ficha"),
      }));
      if (first !== undefined) goToStep(first.key);
      return;
    }
    if (inFlight.current || failure?.kind === "unknown") return;
    inFlight.current = true;
    setSubmitting(true);
    setFailure(null);
    try {
      const params = {
        body,
        ...(variableCount > 0 ? { examples: examples.slice(0, variableCount) } : {}),
        // Las rápidas se agrupan al guardar: intercaladas, Meta rechaza la
        // plantilla entera con «invalid combination».
        // Quitar una pieza NO es omitirla: editar reemplaza todos los
        // componentes en Meta, así que al editar se manda `null` explícito.
        // La excepción es la cabecera de MEDIA, que esta página todavía no
        // sabe enseñar: ahí se omite para no borrarla.
        ...pieceUpdate("buttons", buttons.length === 0 ? null : groupButtons(buttons), isEditing),
        ...(stored.headerIsMedia && header === null
          ? {}
          : pieceUpdate("header", header === null ? null : { format: "text" as const, text: header }, isEditing)),
        ...pieceUpdate("footer", footer, isEditing),
      };
      const saved = isEditing
        ? await updateHsmTemplate(editing.id, {
            ...params,
            // La categoría solo viaja si de verdad cambió Y Meta lo permite.
            ...(!categoryLocked && category !== editing.category ? { category } : {}),
          })
        : await createHsmTemplate({ channel_id: channelId, name, language, category, ...params });
      showAlert({
        tone: "success",
        title: isEditing ? "Enviada de nuevo a revisión" : "Enviada a revisión de Meta",
        description:
          "Suele decidir en minutos; puede tardar hasta 48 h. Mientras haya alguna en revisión, la lista se refresca sola.",
      });
      onDirtyChange(false);
      onSaved(saved);
    } catch (err) {
      const next = classifyHsmSubmitError(err);
      setFailedName(name);
      if (next.kind === "name_locked" && !isEditing && version !== null) {
        // Meta reserva esa versión 30 días: se anota para que el selector la
        // marque y proponga la siguiente libre.
        setReserved((previous) => {
          const key = `${base}|${language}`;
          const merged = new Map(previous);
          merged.set(key, new Map(previous.get(key) ?? []).set(version, next.until));
          return merged;
        });
      }
      setFailure(next);
      if (next.kind === "exists_here" || next.kind === "exists_meta" || next.kind === "unknown") {
        void refreshTemplates().catch(() => undefined);
      }
      if (next.kind === "rejected") {
        const step = HSM_REJECT_REASONS[next.reason].step;
        if (step !== null) goToStep(step);
      }
      if (next.kind === "name_locked") goToStep("ficha");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  // ── Estado de cada paso: la marca, los tramos de la isla y «Antes de enviar» ──
  const messageEmpty = body.trim() === "";
  const messageErrors = (["body", "examples", "header", "footer", "buttons"] as const).filter((field) => errors[field] !== undefined);
  const stepState: Record<HsmFormStep, FormStepState> = {
    purpose: "done",
    message: touched && messageErrors.length > 0 ? "error" : messageErrors.length === 0 ? "done" : "pending",
    ficha: touched && errors.name !== undefined ? "error" : errors.name === undefined ? "done" : "pending",
  };
  const progress: Record<HsmFormStep, StepProgressCheck["state"]> = {
    purpose: "ready",
    message: messageErrors.length === 0 ? "ready" : messageEmpty ? "pending" : "blocked",
    ficha: errors.name === undefined ? "ready" : base === "" ? "pending" : "blocked",
  };
  const readyCount = Object.values(progress).filter((state) => state === "ready").length;
  const notStarted = messageEmpty && base === "";
  const dockTitle = readyCount === STEPS.length ? "Lista" : notStarted ? "Por empezar" : "Casi lista";
  const dockDetail = whatIsMissing(errors, { messageEmpty, baseEmpty: base === "", missingExample, isEditing });

  const summaries: Record<HsmFormStep, string> = {
    purpose: `${categoryLabel} · ${priceLabel(category)} por mensaje`,
    message:
      messageErrors.length > 0 && touched
        ? "Hay algo que corregir"
        : messageEmpty
          ? "Sin escribir"
          : [
              header !== null ? "cabecera" : stored.headerIsMedia ? "cabecera multimedia" : null,
              `${String(variableCount)} ${variableCount === 1 ? "variable" : "variables"}`,
              footer !== null ? "pie" : null,
              buttons.length > 0 ? `${String(buttons.length)} ${buttons.length === 1 ? "botón" : "botones"}` : null,
            ]
              .filter((piece): piece is string => piece !== null)
              .join(" · "),
    ficha: name === "" ? "Sin nombre" : `${name} · ${LANGUAGES.find((item) => item.value === language)?.label ?? language}${isEditing ? " · fijos" : ""}`,
  };

  const preview = <HsmPreview header={header} body={body} examples={examples} footer={footer} buttons={buttons} />;
  const rejectionReason = isFixing ? rejectionReasonLabel(editing.rejected_reason) : null;
  const bodyChanged = isEditing && body !== editing.body;
  const counter = `${String(variableCount)} ${variableCount === 1 ? "variable" : "variables"} · ${String(body.length)} / ${String(BODY_MAX)}`;
  const headerKind: HeaderKind = header === null ? "none" : "text";

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {failure !== null && (
        <HsmSubmitNotice
          failure={failure}
          name={failedName}
          language={language}
          suggestedName={name !== failedName || base === "" ? name : composeTemplateName(base, nextVersionAfterCurrent())}
          onViewExisting={() => onViewExisting(failure.kind === "exists_here" ? failure.templateId : null)}
          onUseName={useNextVersion}
          onSync={onSync}
          onRefresh={() => void checkArrived()}
          onGoToStep={goToStep}
        />
      )}

      {isFixing && (
        <Alert variant="destructive" className="rounded-2xl">
          <CircleX aria-hidden />
          <AlertTitle className="line-clamp-none">Por qué la rechazó Meta</AlertTitle>
          <AlertDescription className="text-foreground">
            <p>{rejectionReason ?? "Meta no dijo el motivo. Revisa el texto, las variables y la categoría."}</p>
            <p className="text-muted-foreground text-xs">
              Una rechazada se corrige sin límite de ediciones. Al guardar vuelve a «En revisión».
            </p>
          </AlertDescription>
        </Alert>
      )}

      {!isEditing && (
        <StartStrip
          options={START_OPTIONS}
          picked={origin}
          collapsed={startCollapsed || !messageEmpty}
          onPickBlank={startBlank}
          onPick={applySuggestion}
          onExpand={() => setStartCollapsed(false)}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)] [&>*]:min-w-0">
        <div className="flex min-w-0 flex-col gap-3.5">
          {/* En el celular la previa va arriba y plegable; desde `lg` vive en su columna. */}
          <details className="group lg:hidden">
            <summary className="bg-muted flex min-h-11 cursor-pointer list-none items-center justify-between rounded-3xl px-4 text-sm font-semibold group-open:rounded-b-none">
              Así se verá
              <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="bg-muted rounded-b-3xl px-2 pb-2">{preview}</div>
          </details>

          <div id="hsm-step-purpose" className="scroll-mt-24">
            <FormStep
              id="hsm-step"
              number={1}
              title="¿Para qué es?"
              subtitle={summaries.purpose}
              summary={summaries.purpose}
              state={stepState.purpose}
              open={openSteps.purpose}
              onToggle={() => setOpenSteps((previous) => ({ ...previous, purpose: !previous.purpose }))}
              flush
            >
              <PurposeCards value={category} onChange={setCategory} locked={categoryLocked} />
              {isEditing && (
                <p className="text-muted-foreground text-xs">
                  {categoryLocked
                    ? "Una aprobada no cambia de categoría: para otra, crea una plantilla nueva."
                    : "Una rechazada o pausada puede cambiar de categoría; una aprobada no."}
                </p>
              )}
            </FormStep>
          </div>

          <div id="hsm-step-message" className="scroll-mt-24">
            <FormStep
              id="hsm-step"
              number={2}
              title="El mensaje"
              subtitle={summaries.message}
              summary={summaries.message}
              state={stepState.message}
              open={openSteps.message}
              onToggle={() => setOpenSteps((previous) => ({ ...previous, message: !previous.message }))}
              flush
            >
              <section className="space-y-2" aria-label="Cabecera">
                <span className="text-xs font-medium">Cabecera</span>
                {stored.headerIsMedia && header === null ? (
                  <p className="text-muted-foreground text-xs">Se conserva la cabecera multimedia que ya tiene.</p>
                ) : (
                  <>
                    <SegmentedControl<HeaderKind>
                      value={headerKind}
                      onValueChange={(next) => setHeader(next === "none" ? null : (header ?? ""))}
                      label="Tipo de cabecera"
                      surface="inline"
                      size="sm"
                      items={[
                        { value: "none", label: "Ninguna" },
                        { value: "text", label: "Texto" },
                      ]}
                    />
                    {header !== null && (
                      <div className="space-y-1.5">
                        <Input
                          id="hsm-header"
                          aria-label="Texto de la cabecera"
                          placeholder="Temporada nueva en Savage"
                          maxLength={HEADER_MAX}
                          value={header}
                          aria-invalid={touched && Boolean(errors.header)}
                          onChange={(event) => setHeader(event.target.value)}
                        />
                        <p className="text-muted-foreground flex justify-between gap-2 text-xs">
                          {touched && errors.header ? (
                            <span className="text-destructive">{errors.header}</span>
                          ) : (
                            <span>Va en negrita arriba. Admite un solo hueco, y no admite negritas ni cursivas.</span>
                          )}
                          <span className="tabular-nums">
                            {header.length}/{HEADER_MAX}
                          </span>
                        </p>
                      </div>
                    )}
                  </>
                )}
              </section>

              <section className="border-border/60 space-y-2 border-t pt-4" aria-label="Texto">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="hsm-body" className="text-xs font-medium">
                    Texto
                  </label>
                  <span className="text-muted-foreground text-xs tabular-nums">{counter}</span>
                </div>
                <Textarea
                  id="hsm-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={4}
                  aria-invalid={touched && Boolean(errors.body)}
                  className="min-h-28 rounded-xl text-sm leading-relaxed"
                  placeholder="Hola {{1}}, te escribo por {{2}}. ¿Seguimos?"
                />
                <button
                  type="button"
                  onClick={insertVariable}
                  className="bg-muted hover:bg-secondary inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium transition-colors"
                >
                  <span className="font-mono">
                    + {"{{"}
                    {String(variableCount + 1)}
                    {"}}"}
                  </span>
                  insertar variable
                </button>
                <p className="text-muted-foreground text-xs">
                  {touched && errors.body ? (
                    <span className="text-destructive">{errors.body}</span>
                  ) : (
                    "Las variables van en orden ({{1}}, {{2}}…), nunca abren ni cierran el mensaje y no van pegadas."
                  )}
                </p>

                {variableCount > 0 && (
                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium">
                      Un ejemplo por variable <span className="text-muted-foreground font-normal">· Meta lo usa para revisar</span>
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Array.from({ length: variableCount }, (_, index) => (
                        <div key={index} className="flex min-w-0 items-center gap-2">
                          <span className="bg-muted shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs">
                            {"{{"}
                            {String(index + 1)}
                            {"}}"}
                          </span>
                          <Input
                            id={`hsm-example-${String(index + 1)}`}
                            aria-label={`Ejemplo de la variable ${String(index + 1)}`}
                            value={examples[index] ?? ""}
                            aria-invalid={touched && missingExample === index + 1}
                            onChange={(event) => {
                              const next = [...examples];
                              next[index] = event.target.value;
                              setExamples(next);
                            }}
                            placeholder="Escribe un ejemplo"
                          />
                        </div>
                      ))}
                    </div>
                    {touched && errors.examples && <p className="text-destructive text-xs">{errors.examples}</p>}
                  </div>
                )}
              </section>

              {footer !== null && (
                <PieceField
                  label="Pie"
                  removeLabel="Quitar el pie"
                  count={`${String(footer.length)}/${String(FOOTER_MAX)}`}
                  onRemove={() => setFooter(null)}
                  hint={
                    touched && errors.footer ? (
                      <span className="text-destructive">{errors.footer}</span>
                    ) : (
                      "Sin huecos: Meta no los admite en el pie. Es donde suele ir la salida del cliente."
                    )
                  }
                >
                  <Input
                    id="hsm-footer"
                    aria-label="Texto del pie"
                    placeholder="Responde SALIR para no recibir más promociones"
                    maxLength={FOOTER_MAX}
                    value={footer}
                    aria-invalid={touched && Boolean(errors.footer)}
                    onChange={(event) => setFooter(event.target.value)}
                  />
                </PieceField>
              )}

              {buttons.length > 0 && (
                <section className="border-border/60 space-y-1.5 border-t pt-4" aria-label="Botones">
                  <span className="text-xs font-medium">Botones</span>
                  <TemplateButtonsEditor buttons={buttons} onChange={setButtons} />
                  {touched && errors.buttons && <p className="text-destructive text-xs">{errors.buttons}</p>}
                  {breaksDesktop(buttons) && (
                    <Alert variant="warning" className="rounded-2xl">
                      <Monitor aria-hidden />
                      <AlertDescription className="text-foreground text-xs">
                        <p>
                          Esta combinación <strong className="font-medium">no se ve en WhatsApp de escritorio</strong>: a quien la
                          reciba ahí se le pedirá abrirla en el celular.
                          {buttons.length > 3 && " Y con más de tres, WhatsApp enseña solo dos y esconde el resto."}
                        </p>
                      </AlertDescription>
                    </Alert>
                  )}
                </section>
              )}

              {(footer === null || buttons.length === 0) && (
                <div className="flex flex-wrap gap-2">
                  {footer === null && (
                    <button type="button" onClick={() => setFooter("")} className={ADDER}>
                      <MessageSquare aria-hidden className="size-3.5" />
                      Añadir pie
                    </button>
                  )}
                  {buttons.length === 0 && (
                    <button type="button" onClick={() => setButtons([emptyButton("quick_reply")])} className={ADDER}>
                      <CornerUpLeft aria-hidden className="size-3.5" />
                      Añadir botones
                    </button>
                  )}
                </div>
              )}
            </FormStep>
          </div>

          <div id="hsm-step-ficha" className="scroll-mt-24">
            <FormStep
              id="hsm-step"
              number={3}
              title="Ficha"
              subtitle={summaries.ficha}
              summary={summaries.ficha}
              state={stepState.ficha}
              open={openSteps.ficha}
              onToggle={() => setOpenSteps((previous) => ({ ...previous, ficha: !previous.ficha }))}
              flush
            >
              <div className="@container">
                <div className="grid gap-4 @xl:grid-cols-[minmax(0,1fr)_12.5rem]">
                  <TemplateNameField
                    human={human}
                    onHumanChange={(value) => {
                      setHuman(value);
                      if (failure?.kind === "exists_here" || failure?.kind === "exists_meta" || failure?.kind === "name_locked") {
                        setFailure(null);
                      }
                    }}
                    version={version}
                    onVersionChange={(next) => {
                      setVersionChoice(next);
                      setFailure(null);
                    }}
                    options={options}
                    technicalName={name === "" ? null : name}
                    locked={isEditing}
                    error={touched ? errors.name : undefined}
                    inputRef={nameRef}
                  />
                  <div className="min-w-0 space-y-1.5">
                    <span id="hsm-language-label" className="text-xs font-medium">
                      Idioma
                    </span>
                    <Select
                      value={language}
                      onValueChange={(next) => {
                        setLanguage(next);
                        setVersionChoice(null);
                      }}
                      disabled={isEditing}
                    >
                      <SelectTrigger
                        aria-labelledby="hsm-language-label"
                        className="h-10 w-full min-w-0 rounded-xl data-[size=default]:h-10 *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </FormStep>
          </div>
        </div>

        <aside aria-label="Así se verá" className="hidden min-w-0 flex-col gap-3.5 lg:sticky lg:top-20 lg:flex">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold">Así se verá</h2>
            <span className="text-muted-foreground text-xs">con tus ejemplos</span>
          </div>
          {preview}
          <BeforeSend
            errors={errors}
            name={name}
            variableCount={variableCount}
            missingExample={missingExample}
            onGo={goToStep}
          />
          {bodyChanged && (
            <div className="bg-card space-y-1.5 rounded-2xl border border-border p-4">
              <p className="text-xs font-semibold">Antes</p>
              <p className="text-muted-foreground text-xs leading-relaxed text-pretty whitespace-pre-line">{editing.body}</p>
            </div>
          )}
          {!isEditing && <SendExpectation />}
        </aside>
      </div>

      <Island
        as="footer"
        material="ink"
        glow="none"
        className="sticky bottom-3 z-10 mx-auto flex w-full max-w-full flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl px-4 py-3 sm:w-fit sm:rounded-full sm:py-2.5 sm:pr-2.5 sm:pl-5"
      >
        <StepProgress
          className="w-44 shrink-0"
          title={dockTitle}
          detail={<span id="hsm-dock-detail">{dockDetail}</span>}
          checks={STEPS.map((step) => ({
            id: step.key,
            label: step.title,
            state: progress[step.key],
            onGo: () => goToStep(step.key),
          }))}
        />
        <span aria-hidden="true" className="bg-border hidden h-9 w-px sm:block" />
        <p className="text-muted-foreground text-xs whitespace-nowrap">
          <span className="text-foreground block text-[13px] font-semibold">
            {categoryLabel} · {priceLabel(category)}
          </span>
          por mensaje en Colombia
        </p>
        <div className="ml-auto flex gap-2 sm:ml-0">
          <Button variant="glass" type="button" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="contrast"
            size="sm"
            className={cn("rounded-full", invalid && "opacity-60")}
            aria-disabled={invalid || submitting || checking || failure?.kind === "unknown"}
            aria-describedby={invalid ? "hsm-dock-detail" : undefined}
            onClick={() => {
              if (submitting || checking || failure?.kind === "unknown") return;
              void submit();
            }}
          >
            {submitting ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
            {submitting ? "Enviando…" : isEditing ? "Guardar y reenviar a revisión" : "Enviar a revisión de Meta"}
          </Button>
        </div>
      </Island>
    </div>
  );
}

/** Lo que falta, nombrado: la línea de la isla (DESIGN-SYSTEM §9.7, «qué falta nombrado»). */
function whatIsMissing(
  errors: HsmDraftErrors,
  context: { messageEmpty: boolean; baseEmpty: boolean; missingExample: number | null; isEditing: boolean },
): string {
  if (context.messageEmpty && context.baseEmpty) return "Falta el texto y el nombre";
  if (context.messageEmpty) return "Falta el texto";
  if (context.missingExample !== null) return `Falta el ejemplo de {{${String(context.missingExample)}}}`;
  if (errors.body !== undefined) return errors.body;
  if (errors.header !== undefined) return errors.header;
  if (errors.footer !== undefined) return errors.footer;
  if (errors.buttons !== undefined) return errors.buttons;
  if (context.baseEmpty) return "Falta el nombre";
  if (errors.name !== undefined) return errors.name;
  return context.isEditing ? "Se envía de nuevo a revisión" : "Se envía a revisión de Meta";
}

/**
 * «Antes de enviar» siempre a la vista (DESIGN-SYSTEM §9.7): cada bloqueo con su
 * acción DEBAJO del texto, o un aviso de éxito cuando no hay nada.
 */
function BeforeSend({
  errors,
  name,
  variableCount,
  missingExample,
  onGo,
}: {
  errors: HsmDraftErrors;
  name: string;
  variableCount: number;
  missingExample: number | null;
  onGo: (step: HsmFormStep, focusId?: string) => void;
}) {
  const blockers: { text: React.ReactNode; action: string; go: () => void }[] = [];
  if (errors.body !== undefined) blockers.push({ text: errors.body, action: "Ir al texto", go: () => onGo("message", "hsm-body") });
  if (missingExample !== null) {
    blockers.push({
      text: (
        <>
          Falta el ejemplo de <span className="font-mono">{`{{${String(missingExample)}}}`}</span>.
        </>
      ),
      action: "Escribirlo",
      go: () => onGo("message", `hsm-example-${String(missingExample)}`),
    });
  }
  if (errors.header !== undefined) blockers.push({ text: errors.header, action: "Corregirla", go: () => onGo("message", "hsm-header") });
  if (errors.footer !== undefined) blockers.push({ text: errors.footer, action: "Corregirlo", go: () => onGo("message", "hsm-footer") });
  if (errors.buttons !== undefined) blockers.push({ text: errors.buttons, action: "Ir a los botones", go: () => onGo("message") });
  if (errors.name !== undefined) blockers.push({ text: errors.name, action: "Ir a la ficha", go: () => onGo("ficha") });

  if (blockers.length === 0) {
    return (
      <Alert variant="success" className="rounded-2xl">
        <CircleCheck aria-hidden />
        <AlertTitle>Lista para enviar a revisión</AlertTitle>
        <AlertDescription className="text-foreground text-xs">
          <p>
            {variableCount === 0 ? "Sin variables" : `${String(variableCount)} ${variableCount === 1 ? "variable" : "variables"} con su ejemplo`} ·{" "}
            <span className="font-mono">{name}</span>
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <section aria-labelledby="hsm-before-send" className="bg-card space-y-3 rounded-3xl border border-border p-4.5">
      <h3 id="hsm-before-send" className="text-sm font-semibold">
        Antes de enviar
      </h3>
      <ul className="space-y-3">
        {blockers.map((blocker, index) => (
          <li key={index} className="grid grid-cols-[1.125rem_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-[13px]">
            <CircleAlert aria-hidden className="text-warning mt-0.5 size-4.5" />
            <span className="text-pretty">{blocker.text}</span>
            <button
              type="button"
              onClick={blocker.go}
              className="decoration-border hover:decoration-foreground col-start-2 min-h-6 w-fit text-[12.5px] font-medium underline underline-offset-[3px]"
            >
              {blocker.action}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lo que pasa después de enviar, dicho antes: la expectativa honesta de cuánto tarda Meta. */
function SendExpectation() {
  return (
    <Alert variant="info" className="rounded-2xl">
      <Hourglass aria-hidden />
      <AlertDescription className="text-foreground text-xs">
        <p>
          <strong className="font-medium">Qué pasa al enviar:</strong> queda «En revisión». Meta suele decidir en minutos y puede
          tardar hasta 48 h; la lista se refresca sola mientras tanto.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/** El pie: etiqueta, contador, quitar y su pista. */
function PieceField({
  label,
  removeLabel,
  count,
  onRemove,
  hint,
  children,
}: {
  label: string;
  removeLabel: string;
  count: string;
  onRemove: () => void;
  hint: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border/60 space-y-1.5 border-t pt-4" aria-label={label}>
      <span className="flex items-center gap-2 text-xs font-medium">
        {label}
        <span className="text-muted-foreground ml-auto tabular-nums">{count}</span>
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="bg-muted text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-full"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      </span>
      {children}
      <p className="text-muted-foreground text-xs">{hint}</p>
    </section>
  );
}

/**
 * Cómo viaja una pieza que el operador dejó vacía. Al CREAR se omite: no hay
 * nada que borrar. Al EDITAR se manda `null`, que es lo que el servidor entiende
 * como «quítala» — omitirla la conservaría, porque editar reemplaza todos los
 * componentes en Meta.
 */
function pieceUpdate<T>(key: string, value: T | null, isEditing: boolean): Record<string, T | null> {
  if (value !== null) return { [key]: value };
  return isEditing ? { [key]: null } : {};
}
