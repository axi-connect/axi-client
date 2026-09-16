"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CircleDollarSign,
  Clock,
  Gauge,
  Info,
  MessageSquare,
  Users,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
import { Input } from "@/shared/components/ui/input";
import { StepIndicator } from "@/shared/components/ui/step-indicator";
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
import {
  getMessagingWindow,
  listHsmTemplates,
  listTemplates,
} from "@/modules/marketing/infrastructure/services/templates-service.adapter";
import { messagingWindowNotice } from "@/modules/marketing/domain/messaging-window";
import {
  isUsableForMarketing,
  type HsmTemplateDTO,
  type MessagingWindowDTO,
} from "@/modules/marketing/domain/template-catalog";
import { HsmTemplatePicker } from "@/modules/marketing/ui/components/HsmTemplatePicker";
import { renderHsmPreview } from "@/modules/marketing/domain/hsm-preview";
import { hsmPreviewValue } from "@/modules/marketing/domain/hsm-params";
import { bulkOpeningCost, formatUsd } from "@/modules/marketing/domain/template-cost";
import { listChannels } from "@/modules/channels/public";
import { loadMyCompanyOnce } from "@/modules/companies/public";

/** Las etiquetas en el orden del asistente, que es lo que pide `StepIndicator`. */
const STEP_LABELS = WIZARD_STEPS.map((step) => WIZARD_STEP_LABELS[step]);

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
  /** `null` = todavía buscando; `[]` = no hay ninguna aprobada de marketing. */
  const [hsmTemplates, setHsmTemplates] = useState<HsmTemplateDTO[] | null>(null);
  const [cloudChannels, setCloudChannels] = useState<{ id: string; name: string }[]>([]);
  const [cloudChannelId, setCloudChannelId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("tu empresa");
  const [window_, setWindow] = useState<MessagingWindowDTO | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      listSegments().then(setSegments).catch(() => setSegments([])),
      listTags().then(setTags).catch(() => setTags([])),
      listTemplates()
        .then((rows) => setTemplates(rows.filter((t) => t.is_active)))
        .catch(() => setTemplates([])),
      loadMyCompanyOnce()
        .then((company) => setCompanyName(company.name || "tu empresa"))
        .catch(() => undefined),
    ]);
  }, []);

  // Las plantillas de Meta viven en la WABA, no en la campaña, y una campaña no
  // elige canal: el despacho lo resuelve por contacto. Se toma el primer
  // WhatsApp Cloud, igual que hace el seguimiento masivo del CRM y por el mismo
  // motivo — en un lote no hay UN contacto del que deducirlo.
  useEffect(() => {
    void listChannels()
      .then((res) => {
        const cloud = res.data.filter((channel) => channel.kind === "whatsapp_cloud");
        setCloudChannels(cloud.map((channel) => ({ id: channel.id, name: channel.name })));
        setCloudChannelId(cloud[0]?.id ?? null);
        if (cloud.length === 0) setHsmTemplates([]);
      })
      .catch(() => {
        setCloudChannels([]);
        setHsmTemplates([]);
      });
  }, []);

  // Las plantillas son del canal elegido: cambiar de número cambia la lista, y
  // la que estuviera elegida deja de existir.
  useEffect(() => {
    if (cloudChannelId === null) return;
    setHsmTemplates(null);
    void listHsmTemplates({ channel_id: cloudChannelId, approval_status: "approved" })
      .then((rows) => setHsmTemplates(rows.filter(isUsableForMarketing)))
      .catch(() => setHsmTemplates([]));
    // El cupo de Meta es del portafolio: hace falta para decir en cuántos días
    // sale la campaña ANTES de lanzarla, no después.
    void getMessagingWindow(cloudChannelId)
      .then(setWindow)
      .catch(() => setWindow(null));
  }, [cloudChannelId]);

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
  const selectedHsm = hsmTemplates?.find((t) => t.id === draft.hsmChannelTemplateId) ?? null;
  /** Un destinatario de ejemplo, para que la previa no se lea en abstracto. */
  const previewSample = { first_name: "Laura", full_name: "Laura Restrepo", company_name: companyName };
  // Tope, no previsión: la estimación no dice cuántos están fuera de la ventana.
  const hsmCost =
    selectedHsm === null || estimate === null
      ? null
      : bulkOpeningCost(estimate.estimatedReach, selectedHsm.category);
  const windowNotice =
    selectedHsm === null || estimate === null
      ? null
      : messagingWindowNotice(estimate.estimatedReach, window_);

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

      {/* El indicador es el compartido: este asistente tenía una copia propia
          que pintaba «completado» en verde, contra la gramática de marca
          (violeta) que ya seguían los otros seis consumidores. */}
      <StepIndicator
        steps={STEP_LABELS}
        current={stepIndex}
        onStepClick={(index) => setStep(WIZARD_STEPS[index])}
        ariaLabel="Progreso de la campaña"
      />

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
            <div>
              <h2 className="text-lg font-semibold tracking-tight">¿Qué les dices?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Son dos mensajes, no uno: el que ve quien te escribió hace poco y el que necesita
                quien lleva más de 24 h en silencio.
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
              {/* Dentro de la ventana: el mensaje de siempre, texto libre. */}
              <section className="overflow-clip rounded-xl border border-border">
                <header className="flex items-center gap-2.5 border-b border-border bg-foreground/[0.025] px-3.5 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-foreground/[0.06] text-muted-foreground">
                    <MessageSquare aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">A quien te escribió hace poco</span>
                    <span className="block text-xs text-muted-foreground">
                      Dentro de las 24 h · texto libre
                    </span>
                  </span>
                </header>
                <div className="flex flex-col gap-3 p-3.5">
                  {templates.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                      No tienes plantillas activas.{" "}
                      <Link href="/marketing/settings/templates" className="underline">
                        Crea una
                      </Link>
                      .
                    </p>
                  ) : (
                    <>
                      <select
                        id="c-template"
                        aria-label="Plantilla del tenant"
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
                        Se rellenan <span className="font-mono">{"{{first_name}}"}</span>,{" "}
                        <span className="font-mono">{"{{contact_name}}"}</span> y{" "}
                        <span className="font-mono">{"{{company_name}}"}</span>.
                      </p>
                      {selectedTemplate?.body ? (
                        <div className="rounded-lg border border-border/60 bg-foreground/[0.03] p-3.5">
                          <div className="max-w-[32ch] rounded-2xl rounded-bl-sm border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed shadow-sm">
                            {previewTemplate(selectedTemplate.body, CAMPAIGN_TEMPLATE_VARIABLES)}
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </section>

              {/* Fuera de la ventana: solo cruza una plantilla aprobada de Meta. */}
              <section className="overflow-clip rounded-xl border border-border">
                <header className="flex items-center gap-2.5 border-b border-border bg-foreground/[0.025] px-3.5 py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-foreground/[0.06] text-muted-foreground">
                    <Clock aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">A quien lleva más de 24 h</span>
                    <span className="block text-xs text-muted-foreground">
                      Fuera de ventana · solo plantilla de Meta
                    </span>
                  </span>
                </header>
                <div className="flex flex-col gap-3 p-3.5">
                  {cloudChannelId === null ? (
                    <Callout tone="warn" icon={AlertTriangle}>
                      Las plantillas de Meta viven en un número de{" "}
                      <strong className="font-medium text-foreground">WhatsApp Cloud</strong>, y
                      todavía no tienes ninguno conectado. La campaña puede salir igual: solo
                      llegará a quien esté dentro de la ventana.{" "}
                      <Link href="/settings/channels" className="underline">
                        Conectar WhatsApp
                      </Link>
                    </Callout>
                  ) : hsmTemplates === null ? (
                    <p className="text-xs text-muted-foreground">Buscando tus plantillas…</p>
                  ) : hsmTemplates.length === 0 ? (
                    // Aquí vivía la franja ámbar que solo avisaba y enlazaba
                    // fuera: ahora el aviso trae su propia salida.
                    <Callout tone="warn" icon={AlertTriangle}>
                      Meta solo deja abrir una conversación fría con una{" "}
                      <strong className="font-medium text-foreground">plantilla aprobada</strong> de
                      categoría marketing, y no tienes ninguna. Sin ella, esos contactos se omiten y
                      lo verás en el detalle de la campaña.{" "}
                      <Link href="/marketing/settings/meta-templates" className="underline">
                        Crear una plantilla
                      </Link>
                    </Callout>
                  ) : (
                    <>
                      {/* Con un solo número no hay nada que elegir y el selector
                          sería ruido. Con varios SÍ hay que decirlo: la
                          plantilla pertenece a uno solo, y Meta no la conoce en
                          los demás. */}
                      {cloudChannels.length > 1 && (
                        <div className="space-y-1.5">
                          <label
                            htmlFor="c-cloud-channel"
                            className="text-xs font-medium text-muted-foreground"
                          >
                            Número desde el que sale
                          </label>
                          <select
                            id="c-cloud-channel"
                            value={cloudChannelId ?? ""}
                            onChange={(e) => {
                              setCloudChannelId(e.target.value);
                              patch({ hsmChannelTemplateId: null, hsmParamMapping: [] });
                            }}
                            className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm"
                          >
                            {cloudChannels.map((channel) => (
                              <option key={channel.id} value={channel.id}>
                                {channel.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <HsmTemplatePicker
                      templates={hsmTemplates}
                      value={draft.hsmChannelTemplateId}
                      onChange={(id) => patch({ hsmChannelTemplateId: id })}
                      mapping={draft.hsmParamMapping}
                      onMappingChange={(mapping) => patch({ hsmParamMapping: mapping })}
                      sample={previewSample}
                      recipients={estimate?.estimatedReach ?? null}
                        emptyLabel="Sin plantilla · se omiten los que lleven más de 24 h"
                      />
                    </>
                  )}
                </div>
              </section>
            </div>
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
              <Summary
                label="Coste tope"
                value={
                  hsmCost === null
                    ? "Sin plantilla de Meta"
                    : `${formatUsd(hsmCost.total_usd)}`
                }
              />
              <Summary
                label="Salida"
                value={draft.scheduledDate === "" ? "Ahora mismo" : `${draft.scheduledDate} ${draft.scheduledTime}`}
              />
            </dl>

            {/* Los DOS mensajes, no uno: es lo que de verdad va a salir. */}
            <div className="grid gap-3 lg:grid-cols-2">
              <ReviewMessage
                icon={MessageSquare}
                title="Dentro de 24 h"
                subtitle={selectedTemplate?.name ?? "Sin plantilla"}
              >
                {selectedTemplate?.body
                  ? previewTemplate(selectedTemplate.body, CAMPAIGN_TEMPLATE_VARIABLES)
                  : null}
              </ReviewMessage>
              <ReviewMessage
                icon={Clock}
                title="Fuera de 24 h"
                subtitle={selectedHsm?.name ?? "Se omiten los contactos fríos"}
              >
                {selectedHsm === null
                  ? null
                  : renderHsmPreview(selectedHsm.body, (index) => {
                      const entry = draft.hsmParamMapping.find((row) => row.index === index);
                      return entry === undefined ? null : hsmPreviewValue(entry.source, previewSample);
                    }).map((segment, position) => (
                      <span
                        key={position}
                        className={segment.variable ? "rounded bg-primary/15 px-1 font-medium" : undefined}
                      >
                        {segment.text}
                      </span>
                    ))}
              </ReviewMessage>
            </div>

            {windowNotice !== null && (
              <Callout tone="warn" icon={Gauge}>
                Meta te deja abrir{" "}
                <strong className="font-medium text-foreground">
                  {windowNotice.limit.toLocaleString("es-CO")} conversaciones nuevas cada 24 h
                </strong>
                , y ese cupo lo comparten todos tus números. Esta campaña{" "}
                <strong className="font-medium text-foreground">
                  saldrá repartida en {windowNotice.days} días
                </strong>
                : no tienes que hacer nada, se reparte sola. Mandarlo todo de golpe es lo que baja
                el cupo, no lo que lo sube.
              </Callout>
            )}

            {hsmCost !== null && hsmCost.category === "marketing" && (
              <Callout tone="warn" icon={CircleDollarSign}>
                Es una plantilla de <strong className="font-medium text-foreground">marketing</strong>,
                unas 25 veces más cara que una utility. Como mucho{" "}
                <strong className="font-medium text-foreground">{formatUsd(hsmCost.total_usd)}</strong>,
                y solo por las que Meta entregue de verdad.
              </Callout>
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

/** Una de las dos mitades del envío, en la revisión: quién lo recibe y qué lee. */
function ReviewMessage({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-clip rounded-xl border border-border">
      <header className="flex items-center gap-2.5 border-b border-border bg-foreground/[0.025] px-3.5 py-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-foreground/[0.06] text-muted-foreground">
          <Icon aria-hidden className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
      </header>
      <div className="p-3.5">
        {children === null ? (
          <p className="text-xs text-muted-foreground">Nada que enviar por aquí.</p>
        ) : (
          <div className="max-w-[32ch] rounded-2xl rounded-bl-sm border border-border/60 bg-background px-3 py-2 text-sm leading-relaxed shadow-sm">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
