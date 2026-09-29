"use client";

import { useId, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  ChevronDown,
  CircleX,
  CornerUpLeft,
  Hourglass,
  LoaderCircle,
  MessageSquare,
  Monitor,
  Sparkles,
  Type,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { Island } from "@/shared/components/features/island";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import {
  formatTemplateCost,
  inspectTemplateVariables,
  rejectionReasonLabel,
  SUGGESTED_OPENING_TEMPLATES,
  TEMPLATE_VARIABLE_MESSAGES,
} from "@/modules/marketing/domain/template-catalog";
import {
  classifyHsmSubmitError,
  HSM_REJECT_REASONS,
  nextTemplateName,
  type HsmSubmitFailure,
} from "@/modules/marketing/domain/meta-template-view";
import {
  createHsmTemplate,
  listHsmTemplates,
  updateHsmTemplate,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";
import {
  BODY_MAX,
  breaksDesktop,
  emptyButton,
  FOOTER_MAX,
  groupButtons,
  hasIncompleteButton,
  HEADER_MAX,
  readTemplatePieces,
  type TemplateButton,
} from "@/modules/marketing/domain/template-pieces";
import { HsmPreview } from "@/modules/marketing/ui/components/HsmPreview";
import { HsmSubmitNotice } from "@/modules/marketing/ui/components/HsmSubmitNotice";
import { TemplateButtonsEditor } from "@/modules/marketing/ui/components/TemplateButtonsEditor";

type Category = HsmTemplateDTO["category"];

const CATEGORIES: ReadonlyArray<{
  value: Category;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}> = [
  {
    value: "utility",
    label: "Utilidad",
    description: "Seguimiento de algo que el cliente inició (cotización, pedido, cita). Aprobación rápida.",
    icon: BadgeCheck,
  },
  {
    value: "marketing",
    label: "Marketing",
    description: "Promociones y ofertas. Revisión más estricta y unas 25 veces más cara.",
    icon: Zap,
  },
  {
    value: "authentication",
    label: "Autenticación",
    description: "Solo códigos de verificación. No sirve para abrir una conversación.",
    icon: CircleX,
    disabled: true,
  },
];

const LANGUAGES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "es_CO", label: "Español (Colombia)" },
  { value: "es_MX", label: "Español (México)" },
  { value: "es", label: "Español" },
  { value: "en_US", label: "English (US)" },
];

/** El añadidor de piezas: mismo botón punteado en los tres sitios. */
const ADDER =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-foreground/20 px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

const NAME_REGEX = /^[a-z0-9_]{3,120}$/;

type StepKey = "identity" | "category" | "message" | "pieces";

/**
 * Alta y corrección de una plantilla de Meta (lienzo «Plantillas de Meta
 * premium», tableros 4–8). Meta la revisa y decide; lo que este diálogo hace es
 * que llegue BIEN a esa revisión —categoría elegida por lo que es (con su
 * costo), variables en orden y con ejemplos, el mensaje entero a la vista— y
 * que, si algo sale mal al enviar, diga qué pasó y qué hacer sin perder lo
 * escrito.
 */
export function CreateHsmTemplateModal({
  open,
  channelId,
  editing = null,
  onOpenChange,
  onCreated,
  onExists,
  onViewTemplate,
  onSync,
}: {
  open: boolean;
  channelId: string;
  /**
   * La plantilla que se edita, o `null` para crear una nueva. El mismo diálogo
   * porque es el mismo formulario: lo que cambia es que Meta no deja tocar el
   * nombre ni el idioma, y la categoría solo si no está aprobada.
   *
   * El consumidor le pasa una `key` distinta para forzar el remontaje, que es
   * lo que carga los valores sin un efecto que sincronice estado con props.
   */
  editing?: HsmTemplateDTO | null;
  onOpenChange: (open: boolean) => void;
  onCreated: (template: HsmTemplateDTO) => void;
  /**
   * El servidor dijo que ya hay una plantilla con ese nombre e idioma (409
   * `channels/template_exists`), o no sabemos si llegó: la lista de atrás
   * puede estar vieja —en el incidente 2026-09-28 Meta la había aceptado y la
   * respuesta se perdió—, así que el consumidor la recarga.
   */
  onExists?: () => void;
  /** «Ver la plantilla»: el diálogo se cierra y la vista la señala en la lista. */
  onViewTemplate?: (templateId: string | null) => void;
  /** «Sincronizar con Meta» desde el aviso de «Meta ya la tiene». */
  onSync?: () => void;
}) {
  const { showAlert } = useAlert();
  const isEditing = editing !== null;
  const isFixing = editing?.approval_status === "rejected";
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(editing?.name ?? "");
  const [language, setLanguage] = useState(editing?.language ?? "es_CO");
  const [category, setCategory] = useState<Category>(editing?.category ?? "utility");
  const [body, setBody] = useState(editing?.body ?? "");
  const [examples, setExamples] = useState<string[]>([]);
  // Se cargan del estado inicial, no de un efecto: el consumidor remonta el
  // diálogo con una `key` distinta por plantilla.
  const stored = readTemplatePieces(editing?.components);
  const [header, setHeader] = useState<string | null>(stored.header);
  const [footer, setFooter] = useState<string | null>(stored.footer);
  const [buttons, setButtons] = useState<TemplateButton[]>(stored.buttons);
  const [submitting, setSubmitting] = useState(false);
  // Guarda síncrona: `submitting` es estado y no llega a tiempo para el segundo
  // clic del mismo tick. Un segundo POST crea en Meta otra vez (incidente
  // 2026-09-28).
  const inFlight = useRef(false);
  const [touched, setTouched] = useState(false);
  const [failure, setFailure] = useState<HsmSubmitFailure | null>(null);
  const [checking, setChecking] = useState(false);
  // Al editar, el nombre y el idioma son fijos: su paso empieza plegado.
  const [openSteps, setOpenSteps] = useState<Record<StepKey, boolean>>({
    identity: !isEditing,
    category: true,
    message: true,
    pieces: !isEditing || stored.header !== null || stored.footer !== null || stored.buttons.length > 0,
  });

  const verdict = useMemo(() => inspectTemplateVariables(body), [body]);
  const variableCount = verdict.ok ? verdict.count : 0;
  const categoryLocked = isEditing && editing.approval_status === "approved";

  const errors = {
    name: !NAME_REGEX.test(name) ? "Minúsculas, números y guion bajo (3 a 120)" : undefined,
    body:
      body.trim().length < 10
        ? "Escribe al menos 10 caracteres"
        : body.length > BODY_MAX
          ? `Máximo ${String(BODY_MAX)} caracteres`
          : !verdict.ok
            ? TEMPLATE_VARIABLE_MESSAGES[verdict.reason]
            : undefined,
    examples:
      variableCount > 0 && examples.slice(0, variableCount).some((example) => !example?.trim())
        ? "Meta exige un ejemplo por cada variable"
        : undefined,
    header: header !== null && header.trim() === "" ? "Escribe la cabecera o quítala" : undefined,
    footer: footer !== null && footer.trim() === "" ? "Escribe el pie o quítalo" : undefined,
    buttons: hasIncompleteButton(buttons) ? "Completa cada botón o quítalo" : undefined,
  };
  const invalid = Object.values(errors).some((error) => error !== undefined);
  const stepHasError: Record<StepKey, boolean> = {
    identity: errors.name !== undefined,
    category: false,
    message: errors.body !== undefined || errors.examples !== undefined,
    pieces: errors.header !== undefined || errors.footer !== undefined || errors.buttons !== undefined,
  };
  const categoryLabel = CATEGORIES.find((option) => option.value === category)?.label ?? category;

  function toggleStep(step: StepKey) {
    setOpenSteps((prev) => ({ ...prev, [step]: !prev[step] }));
  }

  function applySuggestion(key: string) {
    const suggestion = SUGGESTED_OPENING_TEMPLATES.find((item) => item.key === key);
    if (suggestion === undefined) return;
    setName(suggestion.name);
    setBody(suggestion.body);
    setCategory("utility");
    setExamples([...suggestion.examples]);
    setFailure(null);
  }

  function insertVariable() {
    const next = variableCount + 1;
    setBody((prev) => `${prev}${prev.endsWith(" ") || prev === "" ? "" : " "}{{${String(next)}}}`);
  }

  function goToStep(step: StepKey) {
    setOpenSteps((prev) => ({ ...prev, [step]: true }));
    if (step === "identity") requestAnimationFrame(() => nameRef.current?.focus());
  }

  function takeSuggestedName() {
    setName(nextTemplateName(name));
    setFailure(null);
    setOpenSteps((prev) => ({ ...prev, identity: true }));
    // Tras pintar el paso abierto: el campo existe siempre (`hidden`), pero el foco va cuando se ve.
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  /**
   * Sin respuesta, lo honesto es MIRAR antes de reenviar: si la plantilla ya
   * está en la lista, llegó y el diálogo se cierra; si no, se puede enviar.
   */
  async function checkArrived() {
    setChecking(true);
    try {
      const rows = await listHsmTemplates({ channel_id: channelId });
      onExists?.();
      const arrived = !isEditing && rows.some((row) => row.name === name && row.language === language);
      if (arrived) {
        showAlert({
          tone: "success",
          title: "Ya llegó a Meta",
          description: "Está en la lista, en revisión: no hace falta enviarla otra vez.",
        });
        onOpenChange(false);
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
      // Se abre el paso donde está el error: un error plegado no se ve.
      setOpenSteps((prev) => ({
        identity: prev.identity || stepHasError.identity,
        category: prev.category,
        message: prev.message || stepHasError.message,
        pieces: prev.pieces || stepHasError.pieces,
      }));
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
        // componentes en Meta, así que omitir la conserva. Por eso al editar se
        // manda `null` explícito cuando el operador la quitó — si no, el botón
        // de quitar decía que guardaba y no quitaba nada.
        //
        // La excepción es la cabecera de MEDIA: el formulario no la sabe
        // enseñar, así que ahí sí hay que omitir para no borrarla.
        ...pieceUpdate("buttons", buttons.length === 0 ? null : groupButtons(buttons), isEditing),
        ...(stored.headerIsMedia && header === null
          ? {}
          : pieceUpdate(
              "header",
              header === null ? null : { format: "text" as const, text: header },
              isEditing,
            )),
        ...pieceUpdate("footer", footer, isEditing),
      };
      const created = isEditing
        ? await updateHsmTemplate(editing.id, {
            ...params,
            // La categoría solo viaja si de verdad cambió Y Meta lo permite:
            // sobre una aprobada es un 409 nuestro antes de gastar la llamada.
            ...(!categoryLocked && category !== editing.category ? { category } : {}),
          })
        : await createHsmTemplate({ channel_id: channelId, name, language, category, ...params });
      showAlert({
        tone: "success",
        title: isEditing ? "Enviada de nuevo a revisión" : "Enviada a revisión de Meta",
        description:
          "Suele decidir en minutos; puede tardar hasta 48 h. Mientras haya alguna en revisión, la pantalla se refresca sola.",
      });
      onCreated(created);
      onOpenChange(false);
    } catch (err) {
      const next = classifyHsmSubmitError(err);
      setFailure(next);
      if (next.kind === "exists_here" || next.kind === "exists_meta" || next.kind === "unknown") onExists?.();
      // Un rechazo con paso conocido lo abre: un error plegado no se ve. El nombre reservado deja el foco ahí.
      if (next.kind === "rejected") {
        const step = HSM_REJECT_REASONS[next.reason].step;
        if (step !== null) goToStep(step);
      }
      if (next.kind === "name_locked") goToStep("identity");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  const title = isEditing ? `${isFixing ? "Corregir" : "Editar"} «${editing.name}»` : "Nueva plantilla de Meta";
  const rejectionReason = isFixing ? rejectionReasonLabel(editing.rejected_reason) : null;
  const bodyChanged = isEditing && body !== editing.body;
  const pieces = [
    header !== null ? "cabecera" : null,
    footer !== null ? "pie" : null,
    buttons.length > 0 ? `${String(buttons.length)} ${buttons.length === 1 ? "botón" : "botones"}` : null,
  ].filter((piece): piece is string => piece !== null);
  const counter = `${String(variableCount)} ${variableCount === 1 ? "variable" : "variables"} · ${String(body.length)} / ${String(BODY_MAX)}`;
  const preview = <HsmPreview header={header} body={body} examples={examples} footer={footer} buttons={buttons} />;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="px-5 pt-6 pr-14 pb-4 text-left sm:px-7">
          <DialogTitle className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance">{title}</DialogTitle>
          <DialogDescription className="max-w-2xl text-pretty">
            {isEditing
              ? "Meta la revisa otra vez. El nombre y el idioma no se pueden cambiar: son suyos desde que la creaste."
              : "Un texto fijo con huecos que se rellenan con datos del contacto. Meta la revisa antes de que puedas usarla."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 border-t border-border lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="axi-scroll min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7">
            {failure !== null && (
              <HsmSubmitNotice
                failure={failure}
                name={name}
                language={language}
                suggestedName={nextTemplateName(name)}
                onViewExisting={() => {
                  onOpenChange(false);
                  onViewTemplate?.(failure.kind === "exists_here" ? failure.templateId : null);
                }}
                onUseName={takeSuggestedName}
                onSync={() => {
                  onOpenChange(false);
                  onSync?.();
                }}
                onRefresh={() => void checkArrived()}
                onGoToStep={goToStep}
              />
            )}

            {isFixing && (
              <Alert variant="destructive">
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

            {/* En el celular la previa va arriba y plegable; desde `lg` vive en su columna. */}
            <details className="group lg:hidden">
              <summary className="bg-muted flex min-h-11 cursor-pointer list-none items-center justify-between rounded-3xl px-4 text-sm font-semibold group-open:rounded-b-none">
                Así se verá
                <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="bg-muted rounded-b-3xl px-2 pb-2">{preview}</div>
            </details>

            {!isEditing && (
              <section className="space-y-2">
                <p className="text-xs font-medium">Empieza con una sugerida</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SUGGESTED_OPENING_TEMPLATES.map((suggestion) => (
                    <button
                      key={suggestion.key}
                      type="button"
                      aria-pressed={name === suggestion.name}
                      onClick={() => applySuggestion(suggestion.key)}
                      className={cn(
                        "bg-card grid min-w-0 gap-1 rounded-2xl border p-3 text-left transition-colors hover:bg-secondary/60",
                        name === suggestion.name ? "border-foreground ring-1 ring-foreground" : "border-border",
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        <Sparkles aria-hidden className="size-3.5 shrink-0 text-accent-violet" />
                        {suggestion.title}
                      </span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">«{suggestion.body}»</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div>
              <ModalStep
                number={1}
                title="Nombre e idioma"
                summary={isEditing ? `${name} · ${language} · fijos` : `${name || "Sin nombre"} · ${language}`}
                done={NAME_REGEX.test(name)}
                error={touched && stepHasError.identity}
                open={openSteps.identity}
                onToggle={() => toggleStep("identity")}
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor="hsm-name" className="text-xs font-medium">
                      Nombre interno
                    </label>
                    <Input
                      ref={nameRef}
                      id="hsm-name"
                      value={name}
                      disabled={isEditing}
                      onChange={(event) => {
                        setName(event.target.value.toLowerCase());
                        if (
                          failure?.kind === "exists_here" ||
                          failure?.kind === "exists_meta" ||
                          failure?.kind === "name_locked"
                        )
                          setFailure(null);
                      }}
                      placeholder="seguimiento_v1"
                      className="font-mono"
                      aria-invalid={touched && Boolean(errors.name)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {isEditing ? (
                        "Meta no deja cambiarlo: para otro nombre, crea una plantilla nueva."
                      ) : touched && errors.name ? (
                        <span className="text-destructive">{errors.name}</span>
                      ) : (
                        "Minúsculas, números y guion bajo. Si borras una plantilla, Meta reserva su nombre 30 días."
                      )}
                    </p>
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <span id="hsm-language-label" className="text-xs font-medium">
                      Idioma
                    </span>
                    <Select value={language} onValueChange={setLanguage} disabled={isEditing}>
                      <SelectTrigger
                        aria-labelledby="hsm-language-label"
                        className="h-9 w-full min-w-0 *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label} · {option.value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </ModalStep>

              <ModalStep
                number={2}
                title="Categoría"
                summary={`${categoryLabel} · ${formatTemplateCost(category)}`}
                done
                open={openSteps.category}
                onToggle={() => toggleStep("category")}
              >
                <div role="radiogroup" aria-label="Categoría" className="grid gap-2 sm:grid-cols-3">
                  {CATEGORIES.map((option) => {
                    const Icon = option.icon;
                    const checked = category === option.value;
                    const disabled = option.disabled === true || (categoryLocked && !checked);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        aria-disabled={disabled}
                        disabled={disabled}
                        onClick={() => !disabled && setCategory(option.value)}
                        className={cn(
                          "bg-card grid min-w-0 grid-cols-[auto_1fr] items-start gap-x-2.5 gap-y-1 rounded-2xl border px-3.5 py-3 text-left transition-colors",
                          checked ? "border-foreground ring-1 ring-foreground" : "border-border hover:bg-secondary/60",
                          disabled && "cursor-not-allowed opacity-55",
                        )}
                      >
                        <Icon
                          aria-hidden
                          className={cn("row-span-3 mt-0.5 size-4", checked ? "text-accent-violet" : "text-muted-foreground")}
                        />
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="font-mono text-[11px] text-muted-foreground">{formatTemplateCost(option.value)}</span>
                        <span className="text-xs leading-snug text-muted-foreground">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    {categoryLocked
                      ? "Una aprobada no cambia de categoría: para otra, crea una plantilla nueva."
                      : "Una rechazada o pausada puede cambiar de categoría; una aprobada no."}
                  </p>
                )}
              </ModalStep>

              <ModalStep
                number={3}
                title="Mensaje"
                summary={counter}
                done={errors.body === undefined && errors.examples === undefined}
                error={touched && stepHasError.message}
                open={openSteps.message}
                onToggle={() => toggleStep("message")}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="hsm-body" className="text-xs font-medium">
                      Texto
                    </label>
                    <span className="text-xs tabular-nums text-muted-foreground">{counter}</span>
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
                    className="inline-flex h-8 items-center gap-1 rounded-full bg-muted px-3 text-xs font-medium transition-colors hover:bg-secondary"
                  >
                    <span className="font-mono">
                      + {"{{"}
                      {String(variableCount + 1)}
                      {"}}"}
                    </span>
                    insertar variable
                  </button>
                  <p className="text-xs text-muted-foreground">
                    {touched && errors.body ? (
                      <span className="text-destructive">{errors.body}</span>
                    ) : (
                      "Reglas de Meta: las variables van en orden ({{1}}, {{2}}…), nunca abren ni cierran el mensaje, y no van pegadas."
                    )}
                  </p>
                </div>

                {variableCount > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">
                      Un ejemplo por variable{" "}
                      <span className="font-normal text-muted-foreground">(Meta lo exige para aprobar)</span>
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
                            aria-label={`Ejemplo de la variable ${String(index + 1)}`}
                            value={examples[index] ?? ""}
                            onChange={(event) => {
                              const next = [...examples];
                              next[index] = event.target.value;
                              setExamples(next);
                            }}
                            placeholder={index === 0 ? "Ana" : "la cotización del plan anual"}
                          />
                        </div>
                      ))}
                    </div>
                    {touched && errors.examples && <p className="text-xs text-destructive">{errors.examples}</p>}
                  </div>
                )}
              </ModalStep>

              <ModalStep
                number={4}
                title="Cabecera, pie y botones"
                summary={pieces.length > 0 ? pieces.join(" · ") : "Opcional"}
                done={pieces.length > 0 && !stepHasError.pieces}
                error={touched && stepHasError.pieces}
                open={openSteps.pieces}
                onToggle={() => toggleStep("pieces")}
              >
                {header !== null && (
                  <PieceField
                    label="Cabecera"
                    removeLabel="Quitar la cabecera"
                    count={`${String(header.length)}/${String(HEADER_MAX)}`}
                    onRemove={() => setHeader(null)}
                    hint={
                      touched && errors.header ? (
                        <span className="text-destructive">{errors.header}</span>
                      ) : (
                        "Va en negrita arriba. Admite un solo hueco, y no admite negritas ni cursivas."
                      )
                    }
                  >
                    <Input
                      aria-label="Texto de la cabecera"
                      placeholder="Temporada nueva en Savage"
                      maxLength={HEADER_MAX}
                      value={header}
                      aria-invalid={touched && Boolean(errors.header)}
                      onChange={(event) => setHeader(event.target.value)}
                    />
                  </PieceField>
                )}

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
                  <section className="space-y-1.5">
                    <span className="text-xs font-medium">Botones</span>
                    <TemplateButtonsEditor buttons={buttons} onChange={setButtons} />
                    {touched && errors.buttons && <p className="text-xs text-destructive">{errors.buttons}</p>}
                    {breaksDesktop(buttons) && (
                      <Alert variant="warning" className="rounded-2xl">
                        <Monitor aria-hidden />
                        <AlertDescription className="text-foreground text-xs">
                          <p>
                            Esta combinación <strong className="font-medium">no se ve en WhatsApp de escritorio</strong>: a
                            quien la reciba ahí se le pedirá abrirla en el celular.
                            {buttons.length > 3 && " Y con más de tres, WhatsApp enseña solo dos y esconde el resto."}
                          </p>
                        </AlertDescription>
                      </Alert>
                    )}
                  </section>
                )}

                <div className="flex flex-wrap gap-2">
                  {header === null && (
                    <button type="button" onClick={() => setHeader("")} className={ADDER}>
                      <Type aria-hidden className="size-3.5" />
                      Añadir cabecera
                    </button>
                  )}
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
              </ModalStep>
            </div>
          </div>

          <aside
            aria-label="Así se verá"
            className="axi-scroll bg-muted/40 hidden min-h-0 flex-col gap-4 overflow-y-auto border-l border-border p-5 lg:flex"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Así se verá</h3>
              <span className="text-xs text-muted-foreground">con tus ejemplos</span>
            </div>
            {preview}
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
          className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 rounded-none px-5 py-3.5 sm:px-7"
        >
          <p className="text-muted-foreground min-w-0 flex-1 basis-56 text-xs text-pretty sm:text-sm">
            {touched && invalid ? (
              "Corrige lo marcado para poder enviarla"
            ) : (
              <>
                <span className="text-foreground font-semibold">{categoryLabel}</span> · {formatTemplateCost(category)} por
                mensaje entregado en Colombia
              </>
            )}
          </p>
          <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-2 sm:flex sm:w-auto">
            <DialogClose asChild>
              <Button variant="glass" type="button" className="px-3 sm:px-4">
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              className="rounded-full px-3 sm:px-4"
              disabled={submitting || checking || failure?.kind === "unknown"}
              onClick={() => void submit()}
            >
              {submitting ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
              {submitting ? "Enviando…" : isEditing ? "Guardar y reenviar a revisión" : "Enviar a revisión de Meta"}
            </Button>
          </div>
        </Island>
      </DialogContent>
    </Dialog>
  );
}

/** Lo que pasa después de enviar, dicho antes: la expectativa honesta de cuánto tarda Meta. */
function SendExpectation() {
  return (
    <Alert variant="info" className="rounded-2xl">
      <Hourglass aria-hidden />
      <AlertDescription className="text-foreground text-xs">
        <p>
          <strong className="font-medium">Qué pasa al enviar:</strong> queda «En revisión». Meta suele decidir en minutos y
          puede tardar hasta 48 h; el estado se actualiza solo. Mientras, las tareas que la elijan esperan.
        </p>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Un paso plegable del diálogo (DESIGN-SYSTEM §9.7), separado por una línea en
 * vez de en su tarjeta: dentro de un diálogo, cuatro tarjetas serían cajas
 * dentro de una caja. El contenido NO se desmonta al plegar (`hidden`): los
 * campos conservan su valor y siguen validándose.
 */
function ModalStep({
  number,
  title,
  summary,
  done,
  error = false,
  open,
  onToggle,
  children,
}: {
  number: number;
  title: string;
  summary: string;
  done: boolean;
  error?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const bodyId = useId();
  return (
    <section aria-label={title} className="border-t border-border">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl py-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            error ? "bg-destructive/15 text-foreground" : done ? "bg-foreground text-background" : "bg-muted text-foreground",
          )}
        >
          {number}
        </span>
        <span className="text-[15px] font-semibold whitespace-nowrap">{title}</span>
        <span className="text-muted-foreground ml-auto min-w-0 truncate text-right text-xs" title={summary}>
          {error ? "Hay algo que corregir" : summary}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div id={bodyId} hidden={!open} className="space-y-4 pb-5 sm:pl-9">
        {children}
      </div>
    </section>
  );
}

/** Cabecera o pie: etiqueta, contador, quitar y su pista. */
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
    <section className="space-y-1.5">
      <span className="flex items-center gap-2 text-xs font-medium">
        {label}
        <span className="ml-auto tabular-nums text-muted-foreground">{count}</span>
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
      <p className="text-xs text-muted-foreground">{hint}</p>
    </section>
  );
}

/**
 * Cómo viaja una pieza que el operador dejó vacía.
 *
 * Al CREAR se omite: no hay nada que borrar. Al EDITAR se manda `null`, que es
 * lo que el servidor entiende como «quítala» — omitirla la conservaría, porque
 * editar reemplaza todos los componentes en Meta.
 */
function pieceUpdate<T>(
  key: string,
  value: T | null,
  isEditing: boolean,
): Record<string, T | null> {
  if (value !== null) return { [key]: value };
  return isEditing ? { [key]: null } : {};
}
