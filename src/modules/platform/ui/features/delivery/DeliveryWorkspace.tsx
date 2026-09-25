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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useFormContext, useFormState, useWatch, type UseFormReturn } from "react-hook-form";
import { AlertTriangle, Check, CircleAlert, History, Info, LoaderCircle, Lock, Save, Send } from "lucide-react";
import { isHttpError } from "@/core/api/problem";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { formatDayTime, formatMoney } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { DynamicForm } from "@/shared/components/features/dynamic-form";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  blockedSteps,
  createAttemptKeyHolder,
  DELIVERY_STEPS,
  deliveryDraftStorageKey,
  deliveryIssues,
  formatTrialRange,
  formatZonedDay,
  isDeliveryStep,
  needsConfirmation,
  NO_RESTART_BLOCKERS,
  restartShortensTrial,
  stepOfField,
  summarizeChecks,
  timeZoneLabel,
  warningFor,
  type DeliveryIssue,
  type DeliveryStepId,
} from "../../../domain/delivery";
import { canSendDelivery } from "../../../domain/platform-role";
import { usePlatformRole } from "../../../infrastructure/auth/use-platform-role";
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

function ReviewRow({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 py-2 text-sm">
      {ok ? (
        <Check aria-label="Listo" className="mt-0.5 size-4 shrink-0 text-success" />
      ) : (
        <CircleAlert aria-label="Por resolver" className="mt-0.5 size-4 shrink-0 text-warning" />
      )}
      <span className="min-w-0">{children}</span>
    </li>
  );
}

function IssueList({ issues, onGo }: { issues: readonly DeliveryIssue[]; onGo: (step: DeliveryStepId) => void }) {
  const blockers = issues.filter((issue) => issue.kind === "blocker");
  if (blockers.length === 0) return null;
  return (
    <div className="space-y-2 rounded-xl border border-warning/35 bg-warning/5 p-3">
      <p className="text-sm font-medium">Si falta algo, el envío se bloquea</p>
      <ul className="space-y-1.5">
        {blockers.map((issue) => (
          <li key={issue.code} className="flex items-start gap-2 text-sm">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-warning" />
            <span className="min-w-0">
              {issue.message}.{" "}
              {issue.fix ? (
                <Link href={issue.fix.href} className="font-medium underline underline-offset-2">
                  {issue.fix.label}
                </Link>
              ) : issue.step !== "review" ? (
                <button
                  type="button"
                  onClick={() => onGo(issue.step)}
                  className="font-medium underline underline-offset-2"
                >
                  Ir al paso
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
  const tz = context.tenant.timezone;
  const storageKey = deliveryDraftStorageKey(tenantId);

  const [stored, setStored] = useState<StoredDeliveryDraft | null>(() => readStoredDraft(storageKey));
  const [defaults, setDefaults] = useState<DeliveryFormValues>(
    () => stored?.values ?? formValuesFromContext(context, catalog),
  );
  const [values, setValues] = useState<DeliveryFormValues>(defaults);
  const [step, setStep] = useState<DeliveryStepId>("offer");

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

  const fields = useMemo(
    () =>
      buildDeliveryFields({
        step,
        catalog,
        ownerEmail: context.owner?.email ?? null,
        restartRangeLabel,
        restartDisabled,
        warnings: {
          call_day2_at: warningFor(issues, "call_day2_at"),
          call_day5_at: warningFor(issues, "call_day5_at"),
        },
      }),
    [step, catalog, context.owner, restartRangeLabel, restartDisabled, issues],
  );

  // ------------------------------------------------ enviar
  const create = useCreateDelivery(tenantId);
  const role = usePlatformRole();
  const roleAllowed = canSendDelivery(role);
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

  function saveDraft() {
    if (writeStoredDraft(storageKey, values)) {
      setStored({ saved_at: new Date().toISOString(), values });
      showAlert({ tone: "success", title: "Borrador guardado", description: "Queda en este navegador para este tenant.", autoCloseMs: 4000 });
    } else {
      showAlert({ tone: "error", title: "No pudimos guardar el borrador", description: "Este navegador no permite guardar datos del sitio." });
    }
  }

  function discardDraft() {
    clearStoredDraft(storageKey);
    setStored(null);
    const fresh = formValuesFromContext(context, catalog);
    lastValuesJson.current = JSON.stringify(fresh);
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
          <Callout tone={shortens ? "warn" : "neutral"} icon={shortens ? AlertTriangle : Info}>
            {!values.restart_trial ? (
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

  const review = (
    <div className="space-y-4">
      <ul className="divide-y divide-border">
        <ReviewRow ok={checks.find((c) => c.id === "offer")?.state !== "blocked"}>
          Oferta:{" "}
          {quoteData
            ? `${quoteData.plan_name}${quoteData.volume_tier_label ? ` · ${quoteData.volume_tier_label}` : ""} · ${formatMoney(quoteData.amount_cents, quoteData.currency)}${quoteData.promotion_name ? ` ${quoteData.promotion_name.toLowerCase()}` : ""}`
            : "sin cotizar"}
        </ReviewRow>
        <ReviewRow ok={checks.find((c) => c.id === "trial")?.state !== "blocked"}>
          Prueba:{" "}
          {values.restart_trial
            ? `${formatZonedDay(restart.starts_at, tz)} → ${formatZonedDay(restart.ends_at, tz)}`
            : "sin reinicio"}
          {conversations !== null ? ` · ${conversations.toLocaleString("es-CO")} conversaciones` : ""}
        </ReviewRow>
        <ReviewRow ok={checks.find((c) => c.id === "kit")?.state !== "blocked"}>
          {preview.data
            ? `Agente «${preview.data.kit_data.agent.name ?? "sin nombre"}» · ${preview.data.kit_data.catalog.product_count} productos · ${preview.data.kit_data.payment_methods.length} medios de pago${preview.data.kit_data.team_hours ? " · horario cargado" : ""}`
            : context.agent
              ? `Agente «${context.agent.name}»`
              : "Sin agente"}
        </ReviewRow>
        <ReviewRow ok={checks.find((c) => c.id === "calls")?.state === "ok"}>
          Citas:{" "}
          {preview.data
            ? `${preview.data.kit_data.calls.day2.date_label} y ${preview.data.kit_data.calls.day5.date_label}`
            : "por definir"}
        </ReviewRow>
        <ReviewRow ok={checks.find((c) => c.id === "mail")?.state !== "blocked"}>
          Para {owner?.email ?? "—"} · CC: {values.cc.length} · firma {values.advisor.name.trim().split(/\s+/)[0] || "—"}
        </ReviewRow>
      </ul>
      <IssueList issues={issues} onGo={setStep} />
      <p className="text-sm text-muted-foreground">
        Al enviar: se guarda la oferta, se reinicia la prueba, se emite el enlace de un solo uso, se crea el kit y se
        encolan dos correos, uno al dueño y una copia sin enlace al equipo. Si algo falla, reintentar completa lo que
        faltó y nunca manda dos invitaciones.
      </p>
    </div>
  );

  // ------------------------------------------------ render
  const currentTrialEnds = context.trial.trial_ends_at;
  const daysLeft = currentTrialEnds
    ? Math.max(0, Math.ceil((new Date(currentTrialEnds).getTime() - Date.now()) / 86_400_000))
    : null;

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Preparar entrega</h2>
          <p className="text-sm text-muted-foreground">
            Salta a cualquier paso: la barra de abajo dice qué falta.
          </p>
        </div>
        {daysLeft !== null && context.trial.status === "trial" ? (
          <Badge variant="outline" className="tabular-nums">
            Prueba actual: {daysLeft === 0 ? "vence hoy" : `vence en ${daysLeft === 1 ? "1 día" : `${daysLeft} días`}`}
          </Badge>
        ) : null}
      </div>

      {resumable ? (
        <Callout tone="warn" icon={History}>
          Hay una entrega a medias del {formatDayTime(resumable.created_at, tz)}. Al enviar se retoma con la misma
          clave: completa lo que faltó y nunca manda dos invitaciones.
        </Callout>
      ) : null}
      {stored ? (
        <div className="flex flex-wrap items-center gap-2">
          <Callout tone="neutral" icon={Save} className="flex-1">
            Retomaste tu borrador del {formatDayTime(stored.saved_at, tz)}.
          </Callout>
          <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
            Descartar borrador
          </Button>
        </div>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-label="Pasos de la entrega" className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5">
          <Tabs value={step} onValueChange={(next) => isDeliveryStep(next) && setStep(next)} className="gap-5">
            <TabsList aria-label="Pasos" surface="inline" className="w-full">
              {DELIVERY_STEPS.map((item, index) => {
                const isBlocked = blocked.has(item.id);
                const done = !isBlocked && item.id !== "review" && previewReady;
                return (
                  <TabsTrigger key={item.id} value={item.id}>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold",
                        isBlocked ? "bg-warning/15 text-warning" : done ? "bg-success/15 text-success" : "bg-muted",
                      )}
                    >
                      {isBlocked ? "!" : done ? <Check className="size-3" /> : index + 1}
                    </span>
                    {item.label}
                    {isBlocked ? <span className="sr-only"> (por resolver)</span> : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <DynamicForm<DeliveryFormValues>
              id={FORM_ID}
              schema={deliveryFormSchema}
              defaultValues={defaults}
              fields={fields}
              mode="onBlur"
              columns={{ base: 1, md: 2 }}
              renderFieldsWrapper={(grid) => (
                <TabsContent value={step} className="space-y-5">
                  {stepExtras.before}
                  {step === "review" ? review : grid}
                  {stepExtras.after}
                  <FormObserver onValues={onValues} onInvalidSubmit={onInvalidSubmit} />
                </TabsContent>
              )}
              onSubmit={onSubmit}
            />
          </Tabs>
        </section>

        <div className="min-w-0 lg:sticky lg:top-4">
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
        <Callout tone="neutral" icon={Lock}>
          Con tu rol (soporte) puedes revisar la entrega y su vista previa. Enviar la bienvenida, reenviarla y guardar la
          oferta es de super_admin.
        </Callout>
      ) : null}

      <footer
        aria-label="Estado del envío"
        className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 rounded-2xl border bg-background/95 px-4 py-3 shadow-[var(--shadow-float)] backdrop-blur"
      >
        <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-xs" aria-label="Qué falta">
          {checks.map((check) => (
            <li key={check.id}>
              <button
                type="button"
                onClick={() => setStep(check.step)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full font-medium focus-visible:outline-2 focus-visible:outline-ring",
                  check.state === "ok" ? "text-success" : check.state === "warn" ? "text-warning" : "text-destructive",
                )}
              >
                <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
                {check.label}
                <span className="sr-only">
                  {check.state === "ok" ? ": listo" : check.state === "warn" ? ": con un aviso" : ": por resolver"}
                </span>
              </button>
            </li>
          ))}
          {blockerCount > 0 ? (
            <li>
              <button
                type="button"
                onClick={() => setStep("review")}
                className="font-medium underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
              >
                Revisa el paso 4
              </button>
            </li>
          ) : null}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={saveDraft}>
            <Save aria-hidden="true" />
            Guardar borrador
          </Button>
          <Button
            type="submit"
            form={FORM_ID}
            disabled={create.isPending || !roleAllowed}
            aria-disabled={!canSend}
            aria-describedby="delivery-send-state"
            className={cn(!canSend && !create.isPending && "opacity-60")}
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
        </div>
      </footer>
    </div>
  );
}
