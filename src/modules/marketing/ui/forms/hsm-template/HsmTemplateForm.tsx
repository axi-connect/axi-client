"use client";

import {
  Ban,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleX,
  CornerUpLeft,
  FileText,
  Hourglass,
  ImageIcon,
  LoaderCircle,
  MessageSquare,
  Monitor,
  Type,
  Video,
  X,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { countPassing, FormStep, StepTramos } from "@/shared/components/features/form-steps";
import { Island } from "@/shared/components/features/island";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import type { HsmDraftErrors } from "@/modules/marketing/domain/hsm-template-draft";
import type { HsmFormStep } from "@/modules/marketing/domain/meta-template-view";
import { SUGGESTED_OPENING_TEMPLATES, type HsmTemplateDTO } from "@/modules/marketing/domain/template-catalog";
import { composeTemplateName } from "@/modules/marketing/domain/template-name";
import { breaksDesktop, emptyButton, FOOTER_MAX, HEADER_MAX } from "@/modules/marketing/domain/template-pieces";
import { HsmPreview } from "@/modules/marketing/ui/components/HsmPreview";
import { HsmSubmitNotice } from "@/modules/marketing/ui/components/HsmSubmitNotice";
import { TemplateButtonsEditor } from "@/modules/marketing/ui/components/TemplateButtonsEditor";
import { HeaderMediaField } from "./HeaderMediaField";
import { PurposeCards } from "./PurposeCards";
import { StartStrip } from "./StartStrip";
import { TemplateNameField } from "./TemplateNameField";
import { LANGUAGES, useHsmTemplateDraft, type HeaderKind } from "./use-hsm-template-draft";

const START_OPTIONS = SUGGESTED_OPENING_TEMPLATES.map((suggestion) => ({
  key: suggestion.key,
  title: suggestion.title,
  body: suggestion.body,
}));

/** El añadidor de piezas: mismo botón punteado para el pie y los botones. */
const ADDER =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-foreground/20 px-3.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

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
  const {
    isEditing,
    isFixing,
    nameRef,
    human,
    setHuman,
    setVersionChoice,
    language,
    setLanguage,
    category,
    setCategory,
    body,
    setBody,
    examples,
    setExamples,
    storedKind,
    storedFile,
    headerKind,
    setHeaderText,
    headerFile,
    mediaStatus,
    footer,
    setFooter,
    buttons,
    setButtons,
    origin,
    startCollapsed,
    setStartCollapsed,
    submitting,
    touched,
    failure,
    setFailure,
    failedName,
    checking,
    openSteps,
    setOpenSteps,
    base,
    options,
    version,
    name,
    variableCount,
    categoryLocked,
    header,
    mediaKind,
    errors,
    invalid,
    missingExample,
    goToStep,
    applySuggestion,
    startBlank,
    insertVariable,
    changeHeaderKind,
    pickHeaderFile,
    removeHeaderFile,
    nextVersionAfterCurrent,
    takeNextVersion,
    checkArrived,
    submit,
    messageEmpty,
    stepState,
    dockChecks,
    dockTitle,
    dockDetail,
    summaries,
    rejectionReason,
    bodyChanged,
    counter,
    previewProps,
  } = useHsmTemplateDraft({ channelId, templates: initialTemplates, editing, onSaved, onDirtyChange });

  return (
    <div className="flex min-w-0 flex-col gap-5">
      {failure !== null && (
        <HsmSubmitNotice
          failure={failure}
          name={failedName}
          language={language}
          suggestedName={name !== failedName || base === "" ? name : composeTemplateName(base, nextVersionAfterCurrent())}
          onViewExisting={() => onViewExisting(failure.kind === "exists_here" ? failure.templateId : null)}
          onUseName={takeNextVersion}
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
            <div className="bg-muted rounded-b-3xl px-2 pb-2"><HsmPreview {...previewProps} /></div>
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
                <SegmentedControl<HeaderKind>
                  value={headerKind}
                  onValueChange={changeHeaderKind}
                  label="Tipo de cabecera"
                  surface="inline"
                  size="sm"
                  className="max-w-full overflow-x-auto [scrollbar-width:none]"
                  items={[
                    { value: "none", label: "Ninguna", icon: Ban },
                    { value: "text", label: "Texto", icon: Type },
                    { value: "image", label: "Imagen", icon: ImageIcon },
                    { value: "video", label: "Video", icon: Video },
                    { value: "document", label: "Documento", icon: FileText },
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
                      onChange={(event) => setHeaderText(event.target.value)}
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
                {mediaKind !== null && (
                  <>
                    <HeaderMediaField
                      kind={mediaKind}
                      file={
                        headerFile === null
                          ? null
                          : {
                              fileName: headerFile.file_name,
                              mimeType: headerFile.mime_type,
                              byteSize: headerFile.byte_size,
                              previewUrl: headerFile.local_url ?? headerFile.preview_url,
                            }
                      }
                      status={mediaStatus}
                      missingCopy={isEditing && mediaKind === storedKind && storedFile === null && headerFile === null}
                      onPick={(file) => void pickHeaderFile(file)}
                      onRemove={removeHeaderFile}
                    />
                    {touched && errors.header && mediaStatus.kind !== "error" ? (
                      <p className="text-destructive text-xs">{errors.header}</p>
                    ) : null}
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
          <HsmPreview {...previewProps} />
          <BeforeSend
            errors={errors}
            name={name}
            variableCount={variableCount}
            missingExample={missingExample}
            onGo={goToStep}
          />
          {bodyChanged && editing !== null && (
            <div className="bg-card space-y-1.5 rounded-2xl border border-border p-4">
              <p className="text-xs font-semibold">Antes</p>
              <p className="text-muted-foreground text-xs leading-relaxed text-pretty whitespace-pre-line">{editing.body}</p>
            </div>
          )}
          {!isEditing && <SendExpectation />}
        </aside>
      </div>

      {/*
        La isla en UNA fila (maqueta v5, pedido del dueño): los tramos, el estado
        con qué falta, y las acciones. El precio ya está en «¿Para qué es?»: aquí
        sobraba y hacía la isla de tres líneas.
      */}
      <Island
        as="footer"
        material="ink"
        glow="none"
        className="sticky bottom-3 z-10 mx-auto flex w-full max-w-full flex-wrap items-center gap-x-4.5 gap-y-3 rounded-3xl px-4 py-3 sm:w-fit sm:flex-nowrap sm:rounded-full sm:py-2 sm:pr-2 sm:pl-5"
      >
        <StepTramos className="w-34 shrink-0" checks={dockChecks} />
        <span aria-hidden="true" className="bg-border hidden h-7 w-px shrink-0 sm:block" />
        <div className="min-w-0 flex-1 sm:max-w-88">
          <p className="flex items-baseline gap-2 text-[13px] leading-tight font-semibold">
            {dockTitle}
            <span className="text-xs font-normal tabular-nums opacity-70">
              {countPassing(dockChecks)}/{dockChecks.length}
            </span>
          </p>
          <p id="hsm-dock-detail" className="text-muted-foreground truncate text-xs leading-tight" title={dockDetail}>
            {dockDetail}
          </p>
        </div>
        <div className="flex w-full justify-end gap-2 sm:ml-1.5 sm:w-auto sm:shrink-0">
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
