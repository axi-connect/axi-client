"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Info, Users } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { FormSkeleton } from "@/shared/components/features/loading";
import {
  AudienceFilterBuilder,
  compactSegmentFilters,
  describeSegmentFilters,
  listSegments,
  listTags,
  type SegmentDTO,
  type TagDTO,
} from "@/modules/crm/public";
import type { AudiencePreviewDTO, CampaignDTO } from "@/modules/marketing/domain/campaign";
import {
  blockerForStep,
  defaultScheduleSlot,
  EMPTY_DRAFT,
  isScheduleInThePast,
  readAudienceEstimate,
  scheduledAtISO,
  toCreateCampaignDTO,
  toUpdateCampaignDTO,
  WIZARD_STEPS,
  WIZARD_STEP_LABELS,
  type AudienceEstimate,
  type CampaignDraft,
  type WizardStep,
} from "@/modules/marketing/domain/campaign-draft";
import {
  CAMPAIGN_TEMPLATE_VARIABLES,
  previewTemplate,
} from "@/modules/marketing/domain/template";
import type { TemplateDTO } from "@/modules/marketing/domain/template-catalog";
import {
  createCampaign,
  launchCampaign,
  previewAudience,
  updateCampaign,
} from "@/modules/marketing/infrastructure/services/campaigns-service.adapter";
import { listTemplates } from "@/modules/marketing/infrastructure/services/templates-service.adapter";

/**
 * Wizard de creación de campaña.
 *
 * La restricción que lo gobierna: `preview-audience` es un POST sobre una
 * campaña que YA EXISTE. Por eso al salir del paso 1 se crea el BORRADOR — no
 * es un formulario en memoria que se envía al final. Lo bueno es que además
 * nada se pierde si el usuario se va a mitad: la campaña queda en borrador.
 */
export function CampaignWizard() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert, showModal, closeModal } = useAlert();
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>("audiencia");
  const [draft, setDraft] = useState<CampaignDraft>(EMPTY_DRAFT);
  /** Id del borrador ya creado en el backend; `null` hasta salir del paso 1. */
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<AudienceEstimate | null>(null);
  const [segments, setSegments] = useState<SegmentDTO[]>([]);
  const [tags, setTags] = useState<TagDTO[]>([]);
  const [templates, setTemplates] = useState<TemplateDTO[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      listSegments().then(setSegments).catch(() => setSegments([])),
      listTags().then(setTags).catch(() => setTags([])),
      listTemplates()
        .then((rows) => setTemplates(rows.filter((t) => t.is_active)))
        .catch(() => setTemplates([])),
    ]);
  }, []);

  const patch = useCallback(
    (next: Partial<CampaignDraft>) => setDraft((prev) => ({ ...prev, ...next })),
    [],
  );

  const blocker = blockerForStep(step, draft);
  const stepIndex = WIZARD_STEPS.indexOf(step);

  /** Crea el borrador (paso 1) o lo actualiza (resto) y refresca la estimación. */
  async function persistAndAdvance() {
    setBusy(true);
    try {
      let id = campaignId;
      let campaign: CampaignDTO;
      if (id === null) {
        campaign = await createCampaign(toCreateCampaignDTO(draft));
        id = campaign.id;
        setCampaignId(id);
      } else {
        campaign = await updateCampaign(id, toUpdateCampaignDTO(draft));
      }

      if (step === "audiencia") {
        // La estimación solo se puede pedir con la campaña ya guardada.
        const preview: AudiencePreviewDTO = await previewAudience(id);
        setEstimate(readAudienceEstimate(preview));
      }

      setStep(WIZARD_STEPS[stepIndex + 1]);
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo guardar el borrador"),
        open: true,
      });
    } finally {
      setBusy(false);
    }
  }

  async function recalculate() {
    if (campaignId === null) return;
    setBusy(true);
    try {
      await updateCampaign(campaignId, toUpdateCampaignDTO(draft));
      setEstimate(readAudienceEstimate(await previewAudience(campaignId)));
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo recalcular la audiencia"),
        open: true,
      });
    } finally {
      setBusy(false);
    }
  }

  function confirmLaunch() {
    if (campaignId === null) return;
    const reach = estimate?.estimatedReach;
    const scheduled = scheduledAtISO(draft);
    showModal({
      title: `¿Lanzar «${draft.name.trim()}»?`,
      description: scheduled
        ? `Quedará programada y saldrá sola en la fecha que elegiste${reach !== undefined ? `, a unas ${reach.toLocaleString("es-CO")} personas` : ""}. Podrás cancelarla antes de que salga.`
        : `Vas a escribirle ${reach !== undefined ? `a unas ${reach.toLocaleString("es-CO")} personas` : "a tu audiencia"}. Los mensajes empiezan a salir de inmediato y esto no se puede deshacer: podrás pausar la campaña, pero no recuperar lo ya enviado.`,
      actions: [
        { label: "Revisar otra vez", variant: "outline", asClose: true },
        {
          label: scheduled ? "Programar campaña" : "Lanzar campaña",
          variant: "default",
          onClick: () => {
            closeModal();
            void (async () => {
              setBusy(true);
              try {
                await updateCampaign(campaignId, toUpdateCampaignDTO(draft));
                await launchCampaign(campaignId);
                router.push(`/marketing/campaigns/${campaignId}`);
              } catch (err) {
                showAlert({
                  tone: "error",
                  title: errorMessage(err, "No se pudo lanzar la campaña"),
                  open: true,
                });
                setBusy(false);
              }
            })();
          },
        },
      ],
    });
  }

  if (!canManage) {
    return (
      <p className="rounded-2xl border border-border bg-background px-4 py-6 text-sm text-muted-foreground">
        Necesitas permisos de gestión de marketing para crear campañas.
      </p>
    );
  }

  if (templates === null) return <FormSkeleton fields={5} />;

  const selectedTemplate = templates.find((t) => t.id === draft.templateId) ?? null;
  const selectedSegment = segments.find((s) => s.id === draft.segmentId) ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 mb-1" asChild>
          <Link href="/marketing/campaigns">
            <ArrowLeft className="size-4" aria-hidden="true" />
            Campañas
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva campaña</h1>
      </div>

      <ol className="flex flex-wrap items-center gap-2">
        {WIZARD_STEPS.map((s, index) => {
          const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
          return (
            <li key={s} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true" className="h-px w-5 bg-border" />}
              <span
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  state === "current" ? "font-medium text-foreground" : "text-muted-foreground",
                )}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex size-5.5 items-center justify-center rounded-full border text-[0.6875rem] font-semibold",
                    state === "current" && "border-primary bg-primary text-primary-foreground",
                    state === "done" && "border-success/45 bg-success/15 text-success",
                    state === "todo" && "border-border",
                  )}
                >
                  {state === "done" ? <Check className="size-3" aria-hidden="true" /> : index + 1}
                </span>
                {WIZARD_STEP_LABELS[s]}
              </span>
            </li>
          );
        })}
      </ol>

      <section className="rounded-2xl border border-border bg-background p-5">
        {step === "audiencia" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">¿A quién le hablas?</h2>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="c-name" className="text-xs font-medium text-muted-foreground">
                  Nombre de la campaña
                </label>
                <Input
                  id="c-name"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="Black Friday"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="c-desc" className="text-xs font-medium text-muted-foreground">
                  Descripción (opcional)
                </label>
                <Input
                  id="c-desc"
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  placeholder="Para acordarte de qué se trataba"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <AudienceOption
                checked={draft.audienceMode === "all"}
                onSelect={() => patch({ audienceMode: "all" })}
                title="Todos los contactos"
                description="Tu base completa, menos quienes pidieron no recibir promociones."
              />

              <AudienceOption
                checked={draft.audienceMode === "segment"}
                onSelect={() => patch({ audienceMode: "segment" })}
                title="Un segmento guardado"
                description="Reutiliza los segmentos que ya creaste en el CRM."
              />
              {draft.audienceMode === "segment" && (
                <div className="ml-7 flex flex-col gap-1.5">
                  {segments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Todavía no tienes segmentos.{" "}
                      <Link href="/crm/settings/segments" className="underline">
                        Crear uno en el CRM
                      </Link>{" "}
                      o usa los filtros a medida de abajo.
                    </p>
                  ) : (
                    <>
                      <select
                        aria-label="Segmento"
                        value={draft.segmentId ?? ""}
                        onChange={(e) => patch({ segmentId: e.target.value || null })}
                        className="h-9 max-w-md rounded-md border border-input bg-background px-2.5 text-sm"
                      >
                        <option value="">Elige un segmento…</option>
                        {segments.map((segment) => (
                          <option key={segment.id} value={segment.id}>
                            {segment.name}
                          </option>
                        ))}
                      </select>
                      {selectedSegment && (
                        <p className="text-xs text-muted-foreground">
                          {describeSegmentFilters(
                            compactSegmentFilters(selectedSegment.filters as never),
                            tags,
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              <AudienceOption
                checked={draft.audienceMode === "filters"}
                onSelect={() => patch({ audienceMode: "filters" })}
                title="Filtros a medida"
                description="Arma la audiencia con los mismos filtros de los segmentos del CRM."
              />
              {draft.audienceMode === "filters" && (
                <div className="ml-7 rounded-xl border border-border bg-foreground/[0.02] p-4">
                  <AudienceFilterBuilder
                    value={draft.filters}
                    onChange={(filters) => patch({ filters })}
                    tags={tags}
                    idPrefix="campaign"
                  />
                </div>
              )}
            </div>

            {estimate !== null && <AudienceSummary estimate={estimate} onRecalculate={recalculate} busy={busy} />}

            <p className="flex gap-2.5 rounded-xl border border-info/25 bg-info/5 px-4 py-3 text-sm text-muted-foreground">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-info" />
              <span>
                Al continuar se guarda como{" "}
                <strong className="font-medium text-foreground">borrador</strong>: es lo que nos
                permite calcular tu audiencia real. Puedes editarla hasta que la lances.
              </span>
            </p>
          </div>
        )}

        {step === "contenido" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">¿Qué les dices?</h2>

            {templates.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                No tienes plantillas activas.{" "}
                <Link href="/marketing/settings/templates" className="underline">
                  Crea una
                </Link>{" "}
                para poder enviar la campaña.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 md:items-start">
                <div className="space-y-1.5">
                  <label htmlFor="c-template" className="text-xs font-medium text-muted-foreground">
                    Plantilla
                  </label>
                  <select
                    id="c-template"
                    value={draft.templateId ?? ""}
                    onChange={(e) => patch({ templateId: e.target.value || null })}
                    className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                  >
                    <option value="">Elige una plantilla…</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    En campañas solo se rellenan{" "}
                    <span className="font-mono">{"{{first_name}}"}</span>,{" "}
                    <span className="font-mono">{"{{contact_name}}"}</span> y{" "}
                    <span className="font-mono">{"{{company_name}}"}</span>. Para dar un cupón,
                    escribe el código compartido de tu promoción dentro del texto.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Vista previa</span>
                  <div className="rounded-md border border-border/60 bg-foreground/[0.03] p-3.5">
                    {selectedTemplate?.body ? (
                      <div className="max-w-[32ch] rounded-2xl rounded-bl-sm border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed shadow-sm">
                        {previewTemplate(selectedTemplate.body, CAMPAIGN_TEMPLATE_VARIABLES)}
                        <span className="mt-1 block text-right text-[0.625rem] text-muted-foreground">
                          12:04 ✓✓
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Elige una plantilla y aquí verás cómo le llega al cliente.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <p className="flex gap-2.5 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm leading-relaxed text-muted-foreground">
              <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
              <span>
                Los contactos que lleven más de 24 h sin escribirte solo pueden recibir una{" "}
                <strong className="font-medium text-foreground">plantilla de Meta</strong>. Sin ella,
                esos se omitirán y lo verás en el detalle de la campaña.{" "}
                <Link href="/marketing/settings/meta-templates" className="underline">
                  Ver las plantillas de Meta
                </Link>
              </span>
            </p>
          </div>
        )}

        {step === "programacion" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">¿Cuándo sale?</h2>

            <div className="flex flex-col gap-2">
              <AudienceOption
                checked={draft.scheduledDate === ""}
                onSelect={() => patch({ scheduledDate: "", scheduledTime: "" })}
                title="Ahora mismo"
                description="Empieza a enviarse en cuanto la lances."
              />
              <AudienceOption
                checked={draft.scheduledDate !== ""}
                onSelect={() => {
                  const slot = defaultScheduleSlot(new Date());
                  patch({
                    scheduledDate: draft.scheduledDate || slot.date,
                    scheduledTime: draft.scheduledTime || slot.time,
                  });
                }}
                title="Programar"
                description="Elige día y hora; la campaña sale sola."
              />
            </div>

            {draft.scheduledDate !== "" && (
              <div className="ml-7 grid max-w-md gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="c-date" className="text-xs font-medium text-muted-foreground">
                    Fecha
                  </label>
                  <input
                    id="c-date"
                    type="date"
                    value={draft.scheduledDate}
                    onChange={(e) => patch({ scheduledDate: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="c-time" className="text-xs font-medium text-muted-foreground">
                    Hora
                  </label>
                  <input
                    id="c-time"
                    type="time"
                    value={draft.scheduledTime}
                    onChange={(e) => patch({ scheduledTime: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  />
                </div>
              </div>
            )}

            {isScheduleInThePast(draft, new Date()) && (
              <p className="flex gap-2.5 rounded-xl border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm text-muted-foreground">
                <AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
                <span>Esa fecha ya pasó: la campaña saldría en cuanto la lances.</span>
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Los envíos salen a goteo para proteger tus canales: una campaña grande tarda un rato en
              completarse, y eso es deliberado.
            </p>
          </div>
        )}

        {step === "revision" && (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold tracking-tight">Revisa antes de lanzar</h2>

            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Summary label="Campaña" value={draft.name.trim()} />
              <Summary
                label="Audiencia"
                value={
                  estimate
                    ? `≈ ${estimate.estimatedReach.toLocaleString("es-CO")} personas`
                    : "Sin calcular"
                }
              />
              <Summary label="Contenido" value={selectedTemplate?.name ?? "Sin plantilla"} />
              <Summary
                label="Salida"
                value={draft.scheduledDate === "" ? "Ahora mismo" : `${draft.scheduledDate} ${draft.scheduledTime}`}
              />
            </dl>

            {selectedTemplate?.body && (
              <div className="rounded-md border border-border/60 bg-foreground/[0.03] p-3.5">
                <div className="max-w-[32ch] rounded-2xl rounded-bl-sm border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed shadow-sm">
                  {previewTemplate(selectedTemplate.body, CAMPAIGN_TEMPLATE_VARIABLES)}
                  <span className="mt-1 block text-right text-[0.625rem] text-muted-foreground">
                    12:04 ✓✓
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {stepIndex > 0 && (
            <Button variant="ghost" disabled={busy} onClick={() => setStep(WIZARD_STEPS[stepIndex - 1])}>
              Atrás
            </Button>
          )}
          {blocker !== null && <span className="text-xs text-muted-foreground">{blocker}</span>}
        </div>

        {step === "revision" ? (
          <Button disabled={busy} onClick={confirmLaunch}>
            {scheduledAtISO(draft) ? "Programar campaña" : "Lanzar campaña"}
          </Button>
        ) : (
          <Button disabled={blocker !== null || busy} onClick={() => void persistAndAdvance()}>
            {busy ? "Guardando…" : "Continuar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function AudienceOption({
  checked,
  onSelect,
  title,
  description,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors",
        checked ? "border-primary bg-accent" : "border-border hover:bg-accent/60",
      )}
    >
      <input
        type="radio"
        className="mt-0.5 accent-primary"
        checked={checked}
        onChange={onSelect}
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

/**
 * Estimación de audiencia. Se dice EXPLÍCITAMENTE que las bajas son una
 * proyección sobre una muestra: presentarlas como cifra exacta sería mentir,
 * porque el backend solo mira 1000 contactos.
 */
function AudienceSummary({
  estimate,
  onRecalculate,
  busy,
}: {
  estimate: AudienceEstimate;
  onRecalculate: () => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent-amber/30 bg-accent-amber/[0.07] px-4 py-3.5">
      <div>
        <p className="text-base font-semibold tabular-nums">
          <Users aria-hidden="true" className="mr-1.5 inline size-4 text-accent-amber" />
          {estimate.total.toLocaleString("es-CO")} contactos · ≈{" "}
          {estimate.estimatedReach.toLocaleString("es-CO")} recibirán el mensaje
        </p>
        <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
          {estimate.exact
            ? `${estimate.estimatedOptedOut.toLocaleString("es-CO")} pidieron no recibir promociones`
            : `≈ ${estimate.estimatedOptedOut.toLocaleString("es-CO")} pidieron no recibir promociones (estimado sobre una muestra de ${estimate.sampleSize.toLocaleString("es-CO")})`}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={busy} onClick={onRecalculate}>
        Recalcular audiencia
      </Button>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}
