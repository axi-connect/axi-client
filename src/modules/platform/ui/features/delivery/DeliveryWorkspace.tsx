"use client";

/**
 * «Preparar entrega»: el formulario por pasos a la izquierda, la vista previa
 * en vivo fija a la derecha (debajo en el celular) y la barra de abajo con lo
 * que falta, «Guardar borrador» y «Enviar bienvenida».
 *
 * Los pasos son pestañas, no un asistente: se salta a cualquiera. Un solo
 * `DynamicForm` cubre los cuatro (cada campo sabe su paso), así que nada se
 * pierde al cambiar de pestaña. Lo que decide si se puede enviar son los
 * bloqueos del servidor; la validación local solo cuida los formatos.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormContext, useFormState, useWatch, type UseFormReturn } from "react-hook-form";
import { AlertTriangle, Check, History, Info, LoaderCircle, Lock, Save, Send } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { formatMoney } from "@/core/lib/format";
import { formatDayTime } from "../../../domain/dates";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  blockedSteps,
  createAttemptKeyHolder,
  DELIVERY_STEPS,
  deliveryDraftStorageKey,
  deliveryIssues,
  formatTrialRange,
  formatZonedDay,
  needsConfirmation,
  NO_RESTART_BLOCKERS,
  restartShortensTrial,
  stepOfField,
  summarizeChecks,
  supportReasonFor,
  timeZoneLabel,
  warningFor,
  zonedInputToIso,
  type DeliveryIssue,
  type DeliveryStepId,
} from "../../../domain/delivery";
import { canSendDelivery } from "../../../domain/platform-role";
import { usePlatformRole } from "../../../infrastructure/auth/use-platform-role";
import { calendarDaysUntil, formatClockTime, formatInstant, formatInstantTime } from "@/modules/welcome-kit/domain/formatters";
import { kitDataFromPreview } from "../../../infrastructure/api/delivery-kit.mapper";
import type {
  DeliveryContextWire,
  DeliveryDetailWire,
  OfferCatalogWire,
  OfferQuoteWire,
} from "../../../infrastructure/api/delivery.dto";
import {
  useCreateDelivery,
  useDeliveryPreview,
  useOfferQuote,
} from "../../../infrastructure/api/hooks/use-delivery";
import { SupportSessionDialog } from "../tenants/SupportSessionDialog";
import { DeliveryPreviewPanel } from "./DeliveryPreviewPanel";
import { buildDeliveryFields } from "./delivery-fields";
import {
  deliveryFormSchema,
  formValuesFromContext,
  parseStoredDeliveryDraft,
  PREVIEW_ADVISOR_PLACEHOLDER,
  serializeDeliveryDraft,
  toDeliveryDraft,
  toOfferSelection,
  toPreviewDraft,
  type DeliveryFormValues,
  type StoredDeliveryDraft,
} from "./delivery-form.config";

const FORM_ID = "delivery-form";

/** Pausa tras el último cambio antes de guardar el borrador en este navegador. */
const DRAFT_AUTOSAVE_MS = 800;

/**
 * El valor de un `datetime-local` escrito en es-CO («lun 28 sep · 10:00 a. m.»):
 * el campo nativo se pinta con el idioma del navegador (09/28/2026 en inglés,
 * QA H2-7), así que debajo va siempre la lectura en la voz de axi.
 */
/** 422 `delivery/cc_invalid` → el mensaje que se pinta en el campo «Copia a tu equipo». */
function ccInvalidMessage(error: unknown): string | null {
  if (!isHttpError(error) || !error.is("delivery/cc_invalid")) return null;
  const details = (error.problem?.details ?? {}) as { field?: unknown; reason?: unknown };
  const index = typeof details.field === "string" ? /^cc\[(\d+)\]$/.exec(details.field)?.[1] : undefined;
  const which = index !== undefined ? `El correo n.º ${Number(index) + 1} de la copia` : "La copia al equipo";
  switch (details.reason) {
    case "format":
      return `${which} no parece un correo. Revísalo.`;
    case "duplicate":
      return `${which} está repetido.`;
    case "owner":
      return "El correo del dueño no va en la copia: ya recibe el suyo, con su enlace.";
    case "too_many":
      return "La copia admite hasta 10 correos.";
    default:
      return `${which} no es válido.`;
  }
}

function localEcho(local: string, timeZone: string): string | null {
  const iso = zonedInputToIso(local, timeZone);
  return iso ? formatInstant(iso, timeZone) : null;
}
const SENDER = "Axi Connect <welcome@axi-connect.co>";

// ------------------------------------------------------------------ borrador local

function readStoredDraft(key: string): StoredDeliveryDraft | null {
  try {
    return parseStoredDeliveryDraft(window.localStorage.getItem(key));
  } catch {
    // Sin acceso al almacenamiento (modo privado, bloqueado): no hay borrador.
    return null;
  }
}

function writeStoredDraft(key: string, values: DeliveryFormValues): boolean {
  try {
    window.localStorage.setItem(key, serializeDeliveryDraft(values, new Date()));
    return true;
  } catch {
    return false;
  }
}

function clearStoredDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nada que limpiar si el almacenamiento no está disponible.
  }
}

// ------------------------------------------------------------------ observador del formulario

/**
 * Vive dentro del formulario: sube cada cambio a la página (vista previa y
 * barra) y, si un envío choca con la validación local, lleva al paso del
 * primer error, que puede estar en una pestaña que no se ve.
 */
function FormObserver({
  onValues,
  onInvalidSubmit,
}: {
  onValues: (values: DeliveryFormValues) => void;
  onInvalidSubmit: (step: DeliveryStepId) => void;
}) {
  const { control } = useFormContext<DeliveryFormValues>();
  const watched = useWatch({ control });
  const { errors, submitCount } = useFormState({ control });
  const seenSubmits = useRef(submitCount);

  useEffect(() => {
    onValues(watched as DeliveryFormValues);
  }, [watched, onValues]);

  useEffect(() => {
    if (submitCount === seenSubmits.current) return;
    seenSubmits.current = submitCount;
    const first = Object.keys(errors)[0];
    if (first) onInvalidSubmit(stepOfField(first));
  }, [submitCount, errors, onInvalidSubmit]);

  return null;
}

// ------------------------------------------------------------------ piezas de los pasos

function PriceBox({
  quote,
  loading,
  error,
  period,
}: {
  quote: OfferQuoteWire | undefined;
  loading: boolean;
  error: unknown;
  period: "monthly" | "annual";
}) {
  return (
    <div className="space-y-2">
      <div className="flex min-h-9 flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite">
        {quote ? (
          <>
            <span className={cn("text-2xl font-semibold tabular-nums", loading && "opacity-60")}>
              {formatMoney(quote.amount_cents, quote.currency)}
            </span>
            <span className="text-sm text-muted-foreground">/ {period === "annual" ? "año" : "mes"}</span>
            {quote.list_amount_cents > quote.amount_cents ? (
              <s className="text-sm tabular-nums text-muted-foreground">
                {formatMoney(quote.list_amount_cents, quote.currency)}
              </s>
            ) : null}
            {quote.promotion_name ? (
              <Badge variant="secondary">{quote.promotion_name} · precio congelado</Badge>
            ) : null}
            {loading ? <LoaderCircle aria-label="Recalculando el precio" className="size-4 animate-spin text-muted-foreground" /> : null}
          </>
        ) : loading ? (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Calculando el precio…
          </span>
        ) : error ? (
          <span role="alert" className="text-sm text-destructive">
            {errorMessage(error)}
          </span>
        ) : null}
      </div>
      {quote && error ? (
        <p role="alert" className="text-xs text-destructive">
          {errorMessage(error)}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        El catálogo de dos ejes calcula el precio en el servidor, el mismo cálculo de /billing. Queda guardado como
        oferta: el día 7 el cobro sale solo desde /billing.
      </p>
    </div>
  );
}

function ReadonlyField({ id, label, value, hint }: { id: string; label: string; value: string; hint: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="flex items-center gap-1.5">
        {label}
        <Lock aria-hidden="true" className="size-3 text-muted-foreground" />
      </Label>
      <Input id={id} value={value} readOnly aria-describedby={`${id}-hint`} className="bg-muted/40" />
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">
        {hint}
      </p>
    </div>
  );
}

/**
 * Un resumen en piezas separadas por «·»: cada pieza no se parte, así la línea
 * se corta entre piezas y nunca a mitad de una fecha o un monto.
 */
function SummaryParts({ parts }: { parts: readonly React.ReactNode[] }) {
  const shown = parts.filter((part) => part !== null && part !== undefined && part !== "");
  return (
    <>
      {shown.map((part, index) => (
        <Fragment key={index}>
          {index > 0 ? "\u00a0· " : null}
          <span className="whitespace-nowrap">{part}</span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * Un paso de la entrega como tarjeta plegable: cerrado muestra su resumen y
 * «Editar»; abierto, sus campos. Toda la cabecera es el botón (aria-expanded).
 */
function StepCard({
  index,
  title,
  summary,
  state,
  open,
  onToggle,
  children,
}: {
  index: number;
  title: string;
  summary: React.ReactNode;
  state: "done" | "blocked" | "pending";
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const panelId = `delivery-step-${index}`;
  return (
    <section className={cn("rounded-3xl border bg-card transition-shadow", open ? "border-foreground/15 shadow-[var(--shadow-float)]" : "border-border")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 rounded-3xl px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            state === "done" && !open && "bg-foreground text-background",
            state === "blocked" && "border-2 border-warning text-foreground",
            (state === "pending" || (state === "done" && open)) && "border-2 border-brand text-foreground",
          )}
        >
          {state === "done" && !open ? <Check className="size-4" strokeWidth={2.5} /> : state === "blocked" ? "!" : index}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {title}
            {state === "blocked" ? <span className="sr-only"> (por resolver)</span> : null}
          </span>
          {open ? null : <span className="mt-0.5 block text-sm text-pretty text-muted-foreground">{summary}</span>}
        </span>
        <span className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium">{open ? "Listo" : "Editar"}</span>
      </button>
      {open ? (
        <div id={panelId} className="space-y-5 px-5 pb-5 sm:pl-[4.25rem]">
          {children}
        </div>
      ) : null}
    </section>
  );
}

/** «Antes de enviar»: lo que bloquea, con su acción, o la confirmación de que todo está listo. */
function BeforeSendCard({
  issues,
  onGo,
  onSupport,
}: {
  issues: readonly DeliveryIssue[];
  onGo: (step: DeliveryStepId) => void;
  /** Abre «Entrar como soporte» con el motivo y la pantalla del bloqueo (H2-5). */
  onSupport?: (issue: DeliveryIssue) => void;
}) {
  const blockers = issues.filter((issue) => issue.kind === "blocker");
  return (
    <section aria-labelledby="before-send-title" className="space-y-4 rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="before-send-title" className="font-sans text-sm font-semibold">
          Antes de enviar
        </h3>
        <span className="text-xs text-muted-foreground">
          {blockers.length === 0 ? "Nada bloquea el envío" : blockers.length === 1 ? "Falta 1 cosa" : `Faltan ${blockers.length} cosas`}
        </span>
      </div>
      {blockers.length > 0 ? (
        <ul className="divide-y divide-warning/25 overflow-hidden rounded-2xl border border-warning/40 bg-warning/8 dark:bg-warning/10">
          {blockers.map((issue) => (
            <li key={issue.code} className="flex gap-3 px-4 py-3.5">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
              <span className="text-sm text-pretty">{issue.message}</span>
              {issue.support && onSupport ? (
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => onSupport(issue)}>
                  Configurar como soporte
                </Button>
              ) : issue.fix ? (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link href={issue.fix.href}>{issue.fix.label}</Link>
                </Button>
              ) : issue.step !== "review" ? (
                <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => onGo(issue.step)}>
                  Ir al paso
                </Button>
              ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Alert variant="success">
          <Check aria-hidden="true" />
          <AlertDescription>Oferta, prueba, citas, correo y datos del kit listos para enviar.</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-pretty text-muted-foreground">
        Al enviar se guarda la oferta, se reinicia la prueba, se emite el enlace de un solo uso, se crea el kit y salen
        dos correos: uno al dueño y una copia sin enlace al equipo. Si algo falla, reintentar completa lo que faltó y
        nunca manda dos invitaciones.
      </p>
    </section>
  );
}

// ------------------------------------------------------------------ la página

export function DeliveryWorkspace({
  tenantId,
  context,
  catalog,
  resumable,
}: {
  tenantId: string;
  context: DeliveryContextWire;
  catalog: OfferCatalogWire;
  /** Entrega a medias: se retoma con su clave (N3). */
  resumable: DeliveryDetailWire | null;
}) {
  const { showAlert, showModal } = useAlert();
  const [supportIssue, setSupportIssue] = useState<DeliveryIssue | null>(null);
  const tz = context.tenant.timezone;
  const storageKey = deliveryDraftStorageKey(tenantId);

  const [stored, setStored] = useState<StoredDeliveryDraft | null>(() => readStoredDraft(storageKey));
  const [defaults, setDefaults] = useState<DeliveryFormValues>(
    () => stored?.values ?? formValuesFromContext(context, catalog),
  );
  const [values, setValues] = useState<DeliveryFormValues>(defaults);
  // Todo llega precargado del contexto: los pasos arrancan plegados en su
  // resumen y se abre el que haga falta (un bloqueo, un error al enviar).
  const [step, setStep] = useState<DeliveryStepId>("review");
  const [savedAt, setSavedAt] = useState<string | null>(stored?.saved_at ?? null);

  // Una clave por intento, estable al reintentar; la de la entrega a medias si la hay.
  const [attemptKey] = useState(() => createAttemptKeyHolder());
  useEffect(() => {
    if (resumable) attemptKey.adopt(resumable.idempotency_key);
  }, [resumable, attemptKey]);

  const lastValuesJson = useRef(JSON.stringify(defaults));
  const onValues = useCallback((next: DeliveryFormValues) => {
    const json = JSON.stringify(next);
    if (json === lastValuesJson.current) return;
    lastValuesJson.current = json;
    // Copia propia: RHF puede reutilizar el objeto que devuelve.
    setValues(JSON.parse(json) as DeliveryFormValues);
  }, []);
  const onInvalidSubmit = useCallback((target: DeliveryStepId) => setStep(target), []);

  // ------------------------------------------------ vista previa y precio
  const fallbackAdvisor = context.advisor_suggestion ?? PREVIEW_ADVISOR_PLACEHOLDER;
  const previewDraft = useMemo(() => toPreviewDraft(values, tz, fallbackAdvisor), [values, tz, fallbackAdvisor]);
  const preview = useDeliveryPreview(tenantId, previewDraft);
  const selection = useMemo(() => toOfferSelection(values.offer), [values.offer]);
  const quote = useOfferQuote(tenantId, selection);
  const kitData = useMemo(() => (preview.data ? kitDataFromPreview(preview.data.kit_data) : null), [preview.data]);

  const advisorValid = deliveryFormSchema.shape.advisor.safeParse(values.advisor).success;

  const issues = useMemo(() => {
    const server = deliveryIssues(
      tenantId,
      preview.data?.blockers ?? context.blockers,
      preview.data?.warnings ??
        [
          context.suggested.call_day2.warning
            ? { code: "call_on_weekend", field: "call_day2_at", message: context.suggested.call_day2.warning }
            : null,
          context.suggested.call_day5.warning
            ? { code: "call_on_weekend", field: "call_day5_at", message: context.suggested.call_day5.warning }
            : null,
        ].filter((warning) => warning !== null),
    );
    // Lo que el servidor no puede ver porque la vista previa va con la firma sugerida.
    const local = deliveryIssues(
      tenantId,
      [
        ...(advisorValid ? [] : [{ code: "advisor_incomplete", message: "Completa la firma: nombre, WhatsApp y correo" }]),
        ...(previewDraft === null ? [{ code: "calls_missing", message: "Completa la sesión, las dos citas y la hora del resumen" }] : []),
      ],
      [],
    ).map((issue) => (issue.code === "advisor_incomplete" ? { ...issue, group: "mail" as const, step: "mail" as const } : issue));
    const codes = new Set(server.map((issue) => issue.code));
    return [...server, ...local.filter((issue) => !codes.has(issue.code))];
  }, [tenantId, preview.data, context, advisorValid, previewDraft]);

  const checks = summarizeChecks(issues);
  const blocked = blockedSteps(issues);
  const blockerCount = issues.filter((issue) => issue.kind === "blocker").length;

  // ------------------------------------------------ prueba
  const restart = context.trial.restart_preview;
  // El servidor lo dice con el bloqueo `trial_shortens`; el cálculo local cubre
  // el rato en que la vista previa aún no llegó.
  const confirmIssue = needsConfirmation(issues);
  const shortens =
    values.restart_trial &&
    (confirmIssue !== null || restartShortensTrial(context.trial.trial_ends_at, restart.ends_at));
  const conversations = preview.data?.kit_data.trial.conversations ?? null;
  const restartRangeLabel = [
    `${formatTrialRange(restart.starts_at, restart.ends_at, restart.timezone)} (${timeZoneLabel(restart.timezone)})`,
    conversations !== null ? `${conversations.toLocaleString("es-CO")} conversaciones con IA` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const restartDisabled = context.blockers.some((blocker) => NO_RESTART_BLOCKERS.has(blocker.code));
  // El bloqueo que impide la prueba, del servidor (vista previa o contexto).
  const trialBlocker =
    (preview.data?.blockers ?? context.blockers).find((blocker) => NO_RESTART_BLOCKERS.has(blocker.code)) ?? null;

  const fields = useMemo(
    () =>
      buildDeliveryFields({
        step,
        catalog,
        ownerEmail: context.owner?.email ?? null,
        restartRangeLabel,
        echo: {
          session_date: values.session_date ? formatZonedDay(`${values.session_date}T12:00:00Z`, "UTC") : null,
          call_day2_at: localEcho(values.call_day2_at, tz),
          call_day5_at: localEcho(values.call_day5_at, tz),
          digest_time: /^\d{2}:\d{2}$/.test(values.digest_time) ? formatClockTime(values.digest_time) : null,
        },
        restartDisabled,
        warnings: {
          call_day2_at: warningFor(issues, "call_day2_at"),
          call_day5_at: warningFor(issues, "call_day5_at"),
        },
      }),
    [step, catalog, context.owner, restartRangeLabel, restartDisabled, issues, values, tz],
  );

  // ------------------------------------------------ enviar
  const create = useCreateDelivery(tenantId);
  const role = usePlatformRole();
  const roleAllowed = canSendDelivery(role);
  const canEnterSupport = role !== "billing_ops";
  const previewReady = preview.upToDate;
  const canSend = roleAllowed && previewReady && blockerCount === 0 && !create.isPending;

  async function send(
    formValues: DeliveryFormValues,
    form: UseFormReturn<DeliveryFormValues>,
    confirmShortening: boolean,
  ) {
    const draft = toDeliveryDraft(formValues, tz);
    if (draft === null) return;
    try {
      await create.mutateAsync({
        ...draft,
        confirm_trial_shortening: confirmShortening,
        idempotency_key: attemptKey.current(),
      });
      clearStoredDraft(storageKey);
      showAlert({
        tone: "success",
        title: "La bienvenida va en camino",
        description: context.owner
          ? `Le llega a ${context.owner.email} en unos minutos, y la copia sale aparte a tu equipo.`
          : "El correo quedó en cola.",
        autoCloseMs: 6000,
      });
    } catch (error) {
      // La clave NO cambia: reintentar completa lo que faltó (N3).
      const ccProblem = ccInvalidMessage(error);
      if (ccProblem) {
        form.setError("cc", { type: "server", message: ccProblem });
        setStep("mail");
        return;
      }
      if (applyServerValidation(error, form)) {
        const first = isHttpError(error) ? error.validationIssues[0]?.path?.map(String).join(".") : undefined;
        if (first) setStep(stepOfField(first));
        return;
      }
      showAlert({
        tone: "error",
        title: "No pudimos enviar la bienvenida",
        description: `${errorMessage(error)} Si algo falla, reintentar completa lo que faltó y nunca manda dos invitaciones.`,
      });
    }
  }

  function onSubmit(formValues: DeliveryFormValues, form: UseFormReturn<DeliveryFormValues>) {
    if (!canSend) {
      const first = issues.find((issue) => issue.kind === "blocker");
      if (first) setStep(first.step === "review" ? "review" : first.step);
      return;
    }
    if (!shortens) {
      void send(formValues, form, false);
      return;
    }
    const current = context.trial.trial_ends_at;
    showModal({
      title: "El reinicio acorta la prueba",
      description: current
        ? `La prueba vigente vence el ${formatZonedDay(current, tz)} y la nueva vencería el ${formatZonedDay(restart.ends_at, tz)}. Si sigues, la prueba se acorta y queda en la auditoría.`
        : `${confirmIssue?.message ?? "El reinicio acorta la prueba vigente"}. Si sigues, queda en la auditoría.`,
      actions: [
        { label: "Cancelar", variant: "outline" },
        { label: "Acortar y enviar", onClick: () => void send(formValues, form, true) },
      ],
    });
  }

  // El borrador se guarda solo, en este navegador, una pausa después de cada
  // cambio (antes era un botón). Lo que llega del contexto no cuenta como cambio.
  const savedJson = useRef(JSON.stringify(defaults));
  useEffect(() => {
    const json = JSON.stringify(values);
    if (json === savedJson.current) return;
    const timer = setTimeout(() => {
      if (writeStoredDraft(storageKey, values)) {
        savedJson.current = json;
        setSavedAt(new Date().toISOString());
      }
    }, DRAFT_AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [values, storageKey]);

  function discardDraft() {
    clearStoredDraft(storageKey);
    setStored(null);
    setSavedAt(null);
    const fresh = formValuesFromContext(context, catalog);
    lastValuesJson.current = JSON.stringify(fresh);
    savedJson.current = JSON.stringify(fresh);
    setDefaults(fresh);
    setValues(fresh);
  }

  // ------------------------------------------------ contenido por paso
  const owner = context.owner;
  const quoteData = quote.data;

  const stepExtras = {
    before: (
      <>
        {step === "mail" ? (
          <ReadonlyField
            id="delivery-to"
            label="Para"
            value={owner ? `${owner.name} · ${owner.email}` : "Sin dueño"}
            hint="El dueño de la cuenta. Recibe el enlace de un solo uso para crear su contraseña."
          />
        ) : null}
      </>
    ),
    after: (
      <>
        {step === "offer" ? (
          <PriceBox quote={quoteData} loading={quote.isFetching} error={quote.error} period={values.offer.billing_period} />
        ) : null}
        {step === "trial" ? (
          <Callout tone={shortens || trialBlocker ? "warn" : "neutral"} icon={shortens || trialBlocker ? AlertTriangle : Info}>
            {trialBlocker ? (
              // El estado REAL del tenant (suspendido, enterprise, ya paga): no
              // «la prueba arranca hoy» cuando no puede arrancar (QA H2-9).
              `${trialBlocker.message}.`
            ) : !values.restart_trial ? (
              "Sin reinicio: la prueba sigue como está y las dos citas tienen que caer dentro de ella."
            ) : context.trial.trial_ends_at ? (
              <>
                La prueba actual vence el {formatZonedDay(context.trial.trial_ends_at, tz)}. Al reiniciar, la nueva
                vence el {formatZonedDay(restart.ends_at, tz)}.{" "}
                {shortens ? (
                  <strong>
                    {confirmIssue?.message ? `${confirmIssue.message}. ` : "La prueba vigente es más larga: el reinicio la acorta. "}
                    Te pedimos confirmarlo al enviar y queda en la auditoría.
                  </strong>
                ) : null}
              </>
            ) : (
              <>La prueba arranca hoy y vence el {formatZonedDay(restart.ends_at, tz)}.</>
            )}
          </Callout>
        ) : null}
        {step === "mail" ? (
          <ReadonlyField
            id="delivery-from"
            label="Remitente"
            value={SENDER}
            hint={`Fijo. Las respuestas le llegan a ${values.advisor.email.trim() || "tu correo"}.`}
          />
        ) : null}
      </>
    ),
  };

  // ------------------------------------------------ resúmenes de los pasos plegados
  const stepState = (id: DeliveryStepId): "done" | "blocked" | "pending" =>
    blocked.has(id) ? "blocked" : previewReady ? "done" : "pending";
  const firstName = values.advisor.name.trim().split(/\s+/)[0] ?? "";
  const calls = [
    localEcho(values.call_day2_at, tz) ? `Día 2: ${localEcho(values.call_day2_at, tz)}` : null,
    localEcho(values.call_day5_at, tz) ? `Día 5: ${localEcho(values.call_day5_at, tz)}` : null,
  ].filter((part): part is string => part !== null);
  const summaries: Record<"offer" | "trial" | "mail", React.ReactNode> = {
    offer: quoteData ? (
      <SummaryParts
        parts={[
          quoteData.plan_name,
          quoteData.volume_tier_label,
          values.offer.billing_period === "annual" ? "anual" : "mensual",
          <strong key="price" className="font-medium text-foreground tabular-nums">
            {formatMoney(quoteData.amount_cents, quoteData.currency)}
          </strong>,
          quoteData.promotion_name,
        ]}
      />
    ) : quote.isFetching ? (
      "Calculando el precio…"
    ) : (
      "Sin cotizar"
    ),
    trial: (
      <>
        <SummaryParts
          parts={[
            values.restart_trial ? "Reinicia hoy" : "Sin reinicio",
            values.restart_trial ? `${formatZonedDay(restart.starts_at, tz)} → ${formatZonedDay(restart.ends_at, tz)}` : null,
            conversations !== null ? `${conversations.toLocaleString("es-CO")} conversaciones` : null,
          ]}
        />
        <span className="block">{calls.length > 0 ? <SummaryParts parts={calls} /> : "Faltan las citas"}</span>
      </>
    ),
    mail: (
      <SummaryParts
        parts={[
          `Para ${owner ? owner.name : "—"}`,
          values.cc.length === 0 ? "sin copia al equipo" : values.cc.length === 1 ? "1 copia al equipo" : `${values.cc.length} copias al equipo`,
          firstName ? `firma ${firstName}` : "sin firma",
        ]}
      />
    ),
  };

  // ------------------------------------------------ la barra de envío
  const readyGroups = checks.filter((check) => check.state !== "blocked").length;
  const missing = checks.filter((check) => check.state === "blocked").map((check) => check.label.toLowerCase());
  const dockTitle = canSend
    ? "Lista para enviar"
    : !roleAllowed
      ? "Solo lectura"
      : !previewReady
        ? "Revisando la entrega…"
        : "Casi lista";
  const dockDetail = canSend
    ? "Todo en orden. Revisa la vista previa y envía."
    : !roleAllowed
      ? "Tu rol puede revisar la entrega, pero no enviarla."
      : !previewReady
        ? "Esperando la vista previa del correo."
        : `Falta: ${missing.join(", ")}`;

  // ------------------------------------------------ render
  const currentTrialEnds = context.trial.trial_ends_at;
  // Días de calendario en la zona del tenant (QA-8), no bloques de 24 h.
  const daysLeft = currentTrialEnds ? Math.max(0, calendarDaysUntil(currentTrialEnds, tz) ?? 0) : null;
  const toggle = (id: DeliveryStepId) => setStep((current) => (current === id ? "review" : id));

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">Preparar entrega</h2>
          <p className="text-sm text-muted-foreground">
            Cada paso llega precargado. Abre el que quieras cambiar; la vista previa se actualiza sola.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5" aria-live="polite">
            {savedAt ? (
              <>
                <Check aria-hidden="true" className="size-3.5 text-success" />
                Borrador guardado · {formatInstantTime(savedAt, tz)}
              </>
            ) : (
              <>
                <Save aria-hidden="true" className="size-3.5" />
                El borrador se guarda solo en este navegador
              </>
            )}
          </span>
          {daysLeft !== null && context.trial.status === "trial" ? (
            <span className="tabular-nums">
              Prueba actual: {daysLeft === 0 ? "termina hoy" : `vence en ${daysLeft === 1 ? "1 día" : `${daysLeft} días`}`}
            </span>
          ) : null}
        </div>
      </div>

      {resumable ? (
        <Alert variant="warning">
          <History aria-hidden="true" />
          <AlertDescription>
            Hay una entrega a medias del {formatDayTime(resumable.created_at, tz)}. Al enviar se retoma con la misma
            clave: completa lo que faltó y nunca manda dos invitaciones.
          </AlertDescription>
        </Alert>
      ) : null}
      {stored ? (
        <Alert>
          <Save aria-hidden="true" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Retomaste tu borrador del {formatDayTime(stored.saved_at, tz)}.</span>
            <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
              Descartar borrador
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <DynamicForm<DeliveryFormValues>
          id={FORM_ID}
          schema={deliveryFormSchema}
          defaultValues={defaults}
          fields={fields}
          mode="onBlur"
          columns={{ base: 1, md: 2 }}
          renderFieldsWrapper={(grid) => (
            <div aria-label="Pasos de la entrega" role="group" className="min-w-0 space-y-3">
              {DELIVERY_STEPS.filter((item) => item.id !== "review").map((item, index) => {
                const id = item.id as "offer" | "trial" | "mail";
                const open = step === id;
                return (
                  <StepCard
                    key={id}
                    index={index + 1}
                    title={item.label}
                    summary={summaries[id]}
                    state={stepState(id)}
                    open={open}
                    onToggle={() => toggle(id)}
                  >
                    {open ? (
                      <>
                        {stepExtras.before}
                        {grid}
                        {stepExtras.after}
                      </>
                    ) : null}
                  </StepCard>
                );
              })}
              <BeforeSendCard issues={issues} onGo={setStep} onSupport={canEnterSupport ? setSupportIssue : undefined} />
              <FormObserver onValues={onValues} onInvalidSubmit={onInvalidSubmit} />
            </div>
          )}
          onSubmit={onSubmit}
        />

        <div className="min-w-0 lg:sticky lg:top-20">
          <DeliveryPreviewPanel
            ownerHtml={preview.data?.email_html_owner ?? null}
            teamHtml={preview.data?.email_html_team ?? null}
            kitData={kitData}
            subject={preview.data?.subject ?? null}
            loading={!preview.data && (preview.isFetching || preview.settling || previewDraft !== null) && !preview.error}
            refreshing={Boolean(preview.data) && (preview.isFetching || preview.settling)}
            error={preview.error ? errorMessage(preview.error) : previewDraft === null ? "Completa las citas para ver el correo." : null}
          />
        </div>
      </div>

      {!roleAllowed ? (
        <Alert>
          <Lock aria-hidden="true" />
          <AlertDescription>
            Con tu rol (soporte) puedes revisar la entrega y su vista previa. Enviar la bienvenida, reenviarla y guardar
            la oferta es de super_admin.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* La barra de envío: isla de tinta pegada abajo, con el progreso por tramos
          (uno por grupo de la revisión, cada uno lleva a su paso) y «Enviar». */}
      <footer
        aria-label="Estado del envío"
        className="sticky bottom-3 z-10 mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl bg-foreground p-3 pl-5 text-background shadow-[var(--shadow-overlay)] sm:flex-nowrap sm:rounded-full dark:border dark:border-border dark:bg-card dark:text-foreground"
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold whitespace-nowrap">{dockTitle}</span>
            <span className="text-xs tabular-nums opacity-70">
              {readyGroups}/{checks.length}
            </span>
          </div>
          <ul className="flex gap-1" aria-label="Qué falta">
            {checks.map((check) => (
              <li key={check.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => setStep(check.step)}
                  title={check.label}
                  className="block h-1.5 w-full rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "block h-full rounded-full",
                      check.state === "ok" ? "bg-current" : check.state === "warn" ? "bg-warning" : "bg-current/20",
                    )}
                  />
                  <span className="sr-only">
                    {check.label}
                    {check.state === "ok" ? ": listo" : check.state === "warn" ? ": con un aviso" : ": por resolver"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="truncate text-xs opacity-70">{dockDetail}</p>
        </div>
        <Button
          type="submit"
          form={FORM_ID}
          size="lg"
          disabled={create.isPending || !roleAllowed}
          aria-disabled={!canSend}
          aria-describedby="delivery-send-state"
          className={cn("w-full shrink-0 rounded-full sm:w-auto", !canSend && !create.isPending && "opacity-60")}
        >
          {create.isPending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : <Send aria-hidden="true" />}
          {create.isPending ? "Enviando…" : "Enviar bienvenida"}
        </Button>
        <span id="delivery-send-state" className="sr-only" aria-live="polite">
          {canSend
            ? "Todo listo para enviar."
            : !roleAllowed
              ? "Tu rol puede revisar la entrega, pero no enviarla."
              : !previewReady
                ? "Esperando la vista previa."
                : `${blockerCount === 1 ? "Falta 1 cosa" : `Faltan ${blockerCount} cosas`} por resolver.`}
        </span>
      </footer>

      {supportIssue ? (
        <SupportSessionDialog
          open
          onOpenChange={(open) => {
            if (!open) setSupportIssue(null);
          }}
          tenant={{ id: tenantId, name: context.tenant.name }}
          initialReason={supportReasonFor(supportIssue.message)}
          next={supportIssue.support?.next}
        />
      ) : null}
    </div>
  );
}
