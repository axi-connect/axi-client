"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, MessageSquare } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Island } from "@/shared/components/features/island";
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
  fromCampaignDTO,
  resumeStep,
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
  getCampaign,
  launchCampaign,
  previewAudience,
  updateCampaign,
} from "@/modules/marketing/infrastructure/services/campaigns-service.adapter";
import { canEditCampaign } from "@/modules/marketing/domain/campaign-state";
import { LoadError } from "@/modules/marketing/ui/components/premium";
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

/** El título de cada paso cuando está abierto (la pregunta que responde). */
const STEP_QUESTIONS: Record<WizardStep, string> = {
  audiencia: "¿A quién le hablas?",
  contenido: "¿Qué les dices?",
  programacion: "¿Cuándo sale?",
  revision: "Antes de enviar",
};

/**
 * Wizard de creación de campaña.
 *
 * La restricción que lo gobierna: `preview-audience` es un POST sobre una
 * campaña que YA EXISTE. Por eso al salir del paso 1 se crea el BORRADOR — no
 * es un formulario en memoria que se envía al final. Lo bueno es que además
 * nada se pierde si el usuario se va a mitad: la campaña queda en borrador.
 *
 * `resumeId` RETOMA un borrador (o edita una programada) donde se quedó: antes
 * un borrador no se podía reabrir. Una programada no se relanza: se guarda.
 *
 * Presentación (canvas 2026-09-26): los pasos hechos quedan plegados con su
 * resumen y «Cambiar», el actual abierto, y la navegación en una barra de tinta
 * pegada abajo (§9.7 y §9.5.1).
 */
export function CampaignWizard({ resumeId = null }: { resumeId?: string | null }) {
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
  /** Al retomar: `loading` hasta traer la campaña; `blocked` si ya no se puede editar. */
  const [resume, setResume] = useState<{ state: "idle" | "loading" | "ready" | "blocked" | "error"; status?: CampaignDTO["status"]; error?: string }>(
    resumeId ? { state: "loading" } : { state: "idle" },
  );
  const editingScheduled = resume.status === "scheduled";

  const loadResume = useCallback(async () => {
    if (!resumeId) return;
    setResume({ state: "loading" });
    try {
      const campaign = await getCampaign(resumeId);
      if (!canEditCampaign(campaign.status)) {
        setResume({ state: "blocked", status: campaign.status });
        return;
      }
      const loaded = fromCampaignDTO(campaign);
      setCampaignId(campaign.id);
      setDraft(loaded);
      setStep(resumeStep(loaded));
      setResume({ state: "ready", status: campaign.status });
      // La estimación se pide aparte: si falla, el borrador igual se puede seguir editando.
      void previewAudience(campaign.id)
        .then((preview) => setEstimate(readAudienceEstimate(preview)))
        .catch(() => undefined);
    } catch (err) {
      setResume({ state: "error", error: errorMessage(err, "No pudimos abrir esta campaña") });
    }
  }, [resumeId]);

  useEffect(() => {
    void loadResume();
  }, [loadResume]);

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
      });
    } finally {
      setBusy(false);
    }
  }

  /** Una campaña programada no se relanza: se guardan los cambios y sigue programada. */
  async function saveScheduled() {
    if (campaignId === null) return;
    setBusy(true);
    try {
      await updateCampaign(campaignId, toUpdateCampaignDTO(draft));
      showAlert({ tone: "success", title: "Cambios guardados", description: "La campaña sigue programada." });
      router.push(`/marketing/campaigns/${campaignId}`);
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudieron guardar los cambios") });
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
      <div className="flex flex-col gap-4">
        <WizardBack />
        <p className="border-border bg-card text-muted-foreground rounded-3xl border px-5 py-6 text-sm text-pretty">
          Necesitas permisos de gestión de marketing para crear o editar campañas.
        </p>
      </div>
    );
  }

  if (resume.state === "error") {
    return (
      <div className="flex flex-col gap-4">
        <WizardBack />
        <LoadError message={resume.error ?? "No pudimos abrir esta campaña"} onRetry={loadResume} />
      </div>
    );
  }

  if (resume.state === "blocked") {
    return (
      <div className="flex flex-col gap-4">
        <WizardBack />
        <div className="border-border bg-card flex flex-col items-start gap-3 rounded-3xl border p-6">
          <p className="font-heading text-xl font-bold tracking-tight">Esta campaña ya salió</p>
          <p className="text-muted-foreground text-sm text-pretty">
            Al lanzarla se congelaron la audiencia y el mensaje. Puedes verla o duplicarla como punto de partida.
          </p>
          {resumeId ? (
            <Button variant="outline" className="rounded-full" asChild>
              <Link href={`/marketing/campaigns/${resumeId}`}>Ver la campaña</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (templates === null || resume.state === "loading") return <FormSkeleton fields={5} />;

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
  const scheduled = scheduledAtISO(draft);
  const scheduleLabel =
    scheduled === null
      ? "Ahora mismo, en cuanto la lances"
      : new Date(scheduled).toLocaleString("es-CO", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" });

  /** Lo que se decidió en cada paso, en una línea: el resumen de un paso plegado. */
  const stepSummary: Record<WizardStep, string> = {
    audiencia:
      (draft.audienceMode === "all"
        ? "Todos los contactos"
        : draft.audienceMode === "segment"
          ? selectedSegment
            ? `Segmento «${selectedSegment.name}»`
            : "Segmento sin elegir"
          : "Filtros a medida") +
      (estimate ? ` · ≈ ${estimate.estimatedReach.toLocaleString("es-CO")} personas` : ""),
    contenido:
      [selectedTemplate ? `«${selectedTemplate.name}»` : null, selectedHsm ? `plantilla de Meta «${selectedHsm.name}»` : null]
        .filter(Boolean)
        .join(" · ") || "Sin mensaje elegido",
    programacion: scheduleLabel,
    revision: "",
  };

  // El título ya dice «Nueva campaña» mientras no tenga nombre: el kicker dice dónde estás y en qué estado va.
  const kicker = editingScheduled ? "Campañas · programada" : campaignId === null ? "Campañas · nueva" : "Campañas · borrador guardado";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <WizardBack />
      <header className="flex min-w-0 flex-col gap-1.5">
        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">{kicker}</p>
        <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance break-words sm:text-[2.5rem]">
          {draft.name.trim() || "Nueva campaña"}
        </h1>
      </header>

      <ol className="flex min-w-0 flex-col gap-3" aria-label="Pasos de la campaña">
        {WIZARD_STEPS.map((current, index) => {
          const done = index < stepIndex;
          const open = current === step;
          if (!open) {
            return (
              <li
                key={current}
                className={cn(
                  "border-border bg-card flex min-w-0 items-center gap-4 rounded-3xl border px-5 py-4",
                  !done && "opacity-60",
                )}
              >
                <StepMark done={done} number={index + 1} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{WIZARD_STEP_LABELS[current]}</span>
                  {done && stepSummary[current] ? (
                    <span className="text-muted-foreground truncate text-xs" title={stepSummary[current]}>
                      {stepSummary[current]}
                    </span>
                  ) : null}
                </div>
                {done ? (
                  <Button variant="ghost" size="sm" className="rounded-full" disabled={busy} onClick={() => setStep(current)}>
                    Cambiar
                  </Button>
                ) : null}
              </li>
            );
          }
          return (
            <li key={current} aria-current="step" className="border-border bg-card @container min-w-0 rounded-3xl border p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3">
                <StepMark current number={index + 1} />
                <h2 className="font-heading text-xl font-bold tracking-tight">{STEP_QUESTIONS[current]}</h2>
              </div>

              {current === "audiencia" && (
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor="c-name" className="text-muted-foreground text-xs font-medium">
                        Nombre de la campaña
                      </label>
                      <Input
                        id="c-name"
                        value={draft.name}
                        onChange={(e) => patch({ name: e.target.value })}
                        placeholder="Black Friday"
                        maxLength={80}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor="c-desc" className="text-muted-foreground text-xs font-medium">
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
                      <div className="flex flex-col gap-1.5 pl-1 sm:ml-7">
                        {segments.length === 0 ? (
                          <p className="text-muted-foreground text-xs text-pretty">
                            Todavía no tienes segmentos.{" "}
                            <Link href="/crm/settings/segments" className="text-foreground font-medium underline underline-offset-4">
                              Crear uno en el CRM
                            </Link>{" "}
                            o usa los filtros a medida de abajo.
                          </p>
                        ) : (
                          <>
                            <Select value={draft.segmentId ?? ""} onValueChange={(value: string) => patch({ segmentId: value || null })}>
                              <SelectTrigger className="h-10 w-full max-w-md rounded-xl" aria-label="Segmento">
                                <SelectValue placeholder="Elige un segmento…" />
                              </SelectTrigger>
                              <SelectContent>
                                {segments.map((segment) => (
                                  <SelectItem key={segment.id} value={segment.id}>
                                    {segment.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedSegment && (
                              <p className="text-muted-foreground text-xs text-pretty">
                                {describeSegmentFilters(compactSegmentFilters(selectedSegment.filters as never), tags)}
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
                      <div className="bg-muted/40 min-w-0 rounded-2xl p-4 sm:ml-7">
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

                  <p className="text-muted-foreground text-xs text-pretty">
                    Al continuar se guarda como borrador: es lo que nos permite calcular tu audiencia real. Puedes
                    retomarla y editarla hasta que la lances.
                  </p>
                </div>
              )}

              {current === "contenido" && (
                <div className="flex flex-col gap-4">
                  <p className="text-muted-foreground -mt-2 text-sm text-pretty">
                    Son dos mensajes, no uno: el que ve quien te escribió hace poco y el que necesita quien lleva más de
                    24 h en silencio.
                  </p>
                  <div className="grid gap-4 @2xl:grid-cols-2 @2xl:items-start [&>*]:min-w-0">
                    <MessageHalf
                      icon={MessageSquare}
                      title="A quien te escribió hace poco"
                      subtitle="Dentro de las 24 h · texto libre"
                    >
                      {templates.length === 0 ? (
                        <p className="text-muted-foreground text-sm text-pretty">
                          No tienes mensajes guardados activos.{" "}
                          <Link href="/marketing/settings/templates" className="text-foreground font-medium underline underline-offset-4">
                            Crea uno
                          </Link>
                          .
                        </p>
                      ) : (
                        <>
                          <Select value={draft.templateId ?? ""} onValueChange={(value: string) => patch({ templateId: value || null })}>
                            <SelectTrigger className="h-10 w-full rounded-xl" aria-label="Mensaje guardado">
                              <SelectValue placeholder="Elige un mensaje…" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-muted-foreground text-xs text-pretty">
                            Se rellenan <span className="font-mono">{"{{first_name}}"}</span>,{" "}
                            <span className="font-mono">{"{{contact_name}}"}</span> y{" "}
                            <span className="font-mono">{"{{company_name}}"}</span>.
                          </p>
                          {selectedTemplate?.body ? (
                            <Bubble>{previewTemplate(selectedTemplate.body, CAMPAIGN_TEMPLATE_VARIABLES)}</Bubble>
                          ) : null}
                        </>
                      )}
                    </MessageHalf>

                    <MessageHalf icon={Clock} title="A quien lleva más de 24 h" subtitle="Fuera de ventana · solo plantilla de Meta">
                      {cloudChannelId === null ? (
                        <Notice>
                          Las plantillas de Meta viven en un número de WhatsApp Cloud y todavía no tienes ninguno
                          conectado. La campaña puede salir igual: solo llegará a quien esté dentro de la ventana.{" "}
                          <Link href="/settings/channels" className="text-foreground font-medium underline underline-offset-4">
                            Conectar WhatsApp
                          </Link>
                        </Notice>
                      ) : hsmTemplates === null ? (
                        <p className="text-muted-foreground text-xs">Buscando tus plantillas…</p>
                      ) : hsmTemplates.length === 0 ? (
                        <Notice>
                          Meta solo deja abrir una conversación fría con una plantilla aprobada de categoría marketing, y
                          no tienes ninguna. Sin ella, esos contactos se omiten y lo verás en el detalle de la campaña.{" "}
                          <Link href="/marketing/settings/meta-templates" className="text-foreground font-medium underline underline-offset-4">
                            Crear una plantilla
                          </Link>
                        </Notice>
                      ) : (
                        <>
                          {/* Con un solo número no hay nada que elegir; con varios sí: la plantilla es de uno solo. */}
                          {cloudChannels.length > 1 && (
                            <div className="space-y-1.5">
                              <span className="text-muted-foreground text-xs font-medium">Número desde el que sale</span>
                              <Select
                                value={cloudChannelId ?? ""}
                                onValueChange={(value: string) => {
                                  setCloudChannelId(value);
                                  patch({ hsmChannelTemplateId: null, hsmParamMapping: [] });
                                }}
                              >
                                <SelectTrigger className="h-10 w-full rounded-xl" aria-label="Número desde el que sale">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {cloudChannels.map((channel) => (
                                    <SelectItem key={channel.id} value={channel.id}>
                                      {channel.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
                            emptyLabel="Sin plantilla de Meta"
                          />
                        </>
                      )}
                    </MessageHalf>
                  </div>
                </div>
              )}

              {current === "programacion" && (
                <div className="flex flex-col gap-4">
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
                    <div className="grid max-w-md gap-3 sm:ml-7 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label htmlFor="c-date" className="text-muted-foreground text-xs font-medium">
                          Fecha
                        </label>
                        <Input id="c-date" type="date" value={draft.scheduledDate} onChange={(e) => patch({ scheduledDate: e.target.value })} />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor="c-time" className="text-muted-foreground text-xs font-medium">
                          Hora
                        </label>
                        <Input id="c-time" type="time" value={draft.scheduledTime} onChange={(e) => patch({ scheduledTime: e.target.value })} />
                      </div>
                    </div>
                  )}
                  {isScheduleInThePast(draft, new Date()) && <Notice>Esa fecha ya pasó: la campaña saldría en cuanto la lances.</Notice>}
                  <p className="text-muted-foreground text-xs text-pretty">
                    Los envíos salen a goteo para proteger tus canales: una campaña grande tarda un rato en completarse,
                    y eso es deliberado.
                  </p>
                </div>
              )}

              {current === "revision" && (
                <div className="grid gap-5 @4xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] @4xl:items-start">
                  <dl className="divide-border flex min-w-0 flex-col divide-y">
                    <ReviewRow label="Audiencia">
                      {estimate ? (
                        <>
                          <b className="font-semibold tabular-nums">≈ {estimate.estimatedReach.toLocaleString("es-CO")}</b> personas{" "}
                          <span className="text-muted-foreground">· {stepSummary.audiencia.split(" · ")[0]}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Sin calcular</span>
                      )}
                    </ReviewRow>
                    <ReviewRow label="Cuándo sale">{scheduleLabel}</ReviewRow>
                    <ReviewRow label="Cuánto cuesta">
                      {hsmCost === null ? (
                        <span className="text-muted-foreground">Sin plantilla de Meta: no hay costo por mensaje</span>
                      ) : (
                        <>
                          <b className="font-heading text-xl font-bold tabular-nums">≈ {formatUsd(hsmCost.total_usd)}</b>{" "}
                          <span className="text-muted-foreground">
                            como mucho · solo por lo que Meta entregue
                            {hsmCost.category === "marketing" ? " · plantilla de marketing, unas 25 veces más cara que una utility" : ""}
                          </span>
                        </>
                      )}
                    </ReviewRow>
                    {windowNotice !== null && (
                      <ReviewRow label="Tu cupo de Meta">
                        <span className="flex flex-col gap-1.5">
                          <span>
                            Meta te deja abrir{" "}
                            <b className="font-semibold tabular-nums">{windowNotice.limit.toLocaleString("es-CO")}</b> conversaciones
                            nuevas cada 24 h, compartidas por todos tus números.
                          </span>
                          <Notice>
                            Esta campaña saldrá repartida en {windowNotice.days} días: se reparte sola, no tienes que hacer nada.
                          </Notice>
                        </span>
                      </ReviewRow>
                    )}
                    <ReviewRow label="Quién no lo recibe">
                      <span className="text-muted-foreground">Las bajas y quien recibió algo tuyo hace muy poco (tus límites de Ajustes)</span>
                    </ReviewRow>
                  </dl>
                  <div className="flex min-w-0 flex-col gap-3">
                    <p className="text-muted-foreground text-xs">Así lo verá Laura, un contacto de ejemplo</p>
                    <MessageHalf icon={MessageSquare} title="Dentro de 24 h" subtitle={selectedTemplate?.name ?? "Sin mensaje"}>
                      {selectedTemplate?.body ? (
                        <Bubble>{previewTemplate(selectedTemplate.body, CAMPAIGN_TEMPLATE_VARIABLES)}</Bubble>
                      ) : (
                        <p className="text-muted-foreground text-xs">Nada que enviar por aquí.</p>
                      )}
                    </MessageHalf>
                    <MessageHalf icon={Clock} title="Fuera de 24 h" subtitle={selectedHsm?.name ?? "Se omiten los contactos fríos"}>
                      {selectedHsm === null ? (
                        <p className="text-muted-foreground text-xs">Nada que enviar por aquí.</p>
                      ) : (
                        <Bubble>
                          {renderHsmPreview(selectedHsm.body, (index) => {
                            const entry = draft.hsmParamMapping.find((row) => row.index === index);
                            return entry === undefined ? null : hsmPreviewValue(entry.source, previewSample);
                          }).map((segment, position) => (
                            <span key={position} className={segment.variable ? "bg-brand/15 rounded px-1 font-medium" : undefined}>
                              {segment.text}
                            </span>
                          ))}
                        </Bubble>
                      )}
                    </MessageHalf>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* La navegación del asistente en una barra de tinta pegada abajo (§9.7, §9.5.1). */}
      <Island
        as="footer"
        material="ink"
        role="region"
        aria-label="Avanzar en la campaña"
        className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-3 sm:rounded-full sm:py-2.5 sm:pr-2.5"
      >
        <p className="min-w-0 text-sm text-pretty">
          {step === "revision" ? (
            <>
              <span className="font-semibold">
                {editingScheduled ? "Programada" : scheduled ? "Lista para salir" : "Lista para lanzar"}
              </span>
              <span className="text-muted-foreground">
                {estimate ? (
                  <>
                    {" · "}
                    <span className="whitespace-nowrap">≈ {estimate.estimatedReach.toLocaleString("es-CO")} personas</span>
                  </>
                ) : null}
                {hsmCost ? (
                  <>
                    {" · "}
                    <span className="whitespace-nowrap">≈ {formatUsd(hsmCost.total_usd)}</span>
                  </>
                ) : null}
              </span>
            </>
          ) : blocker !== null ? (
            <span className="text-muted-foreground">{blocker}</span>
          ) : (
            <span className="text-muted-foreground">
              Paso {stepIndex + 1} de {WIZARD_STEPS.length} · se guarda como borrador al continuar
            </span>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {stepIndex > 0 && (
            <Button variant="glass" disabled={busy} onClick={() => setStep(WIZARD_STEPS[stepIndex - 1])}>
              Atrás
            </Button>
          )}
          {step === "revision" ? (
            editingScheduled ? (
              <Button variant="contrast" className="rounded-full" disabled={busy} onClick={() => void saveScheduled()}>
                {busy ? "Guardando…" : "Guardar cambios"}
              </Button>
            ) : (
              <Button variant="contrast" className="rounded-full" disabled={busy} onClick={confirmLaunch}>
                {scheduled ? "Programar campaña" : "Lanzar campaña"}
              </Button>
            )
          ) : (
            <Button variant="contrast" className="rounded-full" disabled={blocker !== null || busy} onClick={() => void persistAndAdvance()}>
              {busy ? "Guardando…" : "Continuar"}
            </Button>
          )}
        </div>
      </Island>
    </div>
  );
}

function WizardBack() {
  return (
    <Link
      href="/marketing/campaigns"
      className="text-muted-foreground hover:text-foreground inline-flex min-h-6 w-fit items-center gap-1.5 text-sm underline-offset-4 hover:underline"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      Campañas
    </Link>
  );
}

/** La marca de un paso: ✓ si está hecho, el número con anillo coral si es el actual, el número tenue si falta. */
function StepMark({ done = false, current = false, number }: { done?: boolean; current?: boolean; number: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        done && "bg-foreground text-background",
        current && "ring-brand ring-2 ring-inset",
        !done && !current && "text-muted-foreground ring-border ring-1 ring-inset",
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={2.6} /> : number}
    </span>
  );
}

/** Un aviso: punto ámbar + texto en foreground. Sin caja tintada (el color va en el punto, DS §9.5). */
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2.5 text-sm text-pretty">
      <span aria-hidden="true" className="bg-warning mt-[0.45em] size-2 shrink-0 rounded-full" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/** Una fila de «Antes de enviar»: etiqueta y valor. */
function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3.5 @lg:grid-cols-[9rem_minmax(0,1fr)] @lg:gap-4">
      <dt className="text-muted-foreground text-xs @lg:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm text-pretty">{children}</dd>
    </div>
  );
}

/** El globo de un mensaje de WhatsApp, para la vista previa. */
function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-2xl p-3">
      <div className="bg-card border-border max-w-[34ch] rounded-2xl rounded-bl-sm border px-3.5 py-2.5 text-sm leading-relaxed shadow-xs text-pretty">
        {children}
      </div>
    </div>
  );
}

/** Una de las dos mitades del envío: a quién va y con qué. */
function MessageHalf({
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
    <section className="border-border min-w-0 overflow-clip rounded-2xl border">
      <header className="bg-muted/40 border-border flex items-center gap-2.5 border-b px-4 py-3">
        <span className="bg-card grid size-8 shrink-0 place-items-center rounded-xl">
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="text-muted-foreground block truncate text-xs" title={subtitle}>
            {subtitle}
          </span>
        </span>
      </header>
      <div className="flex min-w-0 flex-col gap-3 p-4">{children}</div>
    </section>
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
        "flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition-colors",
        checked ? "border-foreground/40 bg-muted/50" : "border-border hover:bg-muted/40",
      )}
    >
      <input type="radio" className="accent-foreground mt-1 size-4" checked={checked} onChange={onSelect} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">{description}</span>
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
    <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-pretty">
          <b className="font-heading text-xl font-bold tabular-nums">≈ {estimate.estimatedReach.toLocaleString("es-CO")}</b>{" "}
          recibirán el mensaje <span className="text-muted-foreground">de {estimate.total.toLocaleString("es-CO")} contactos</span>
        </p>
        <p className="text-muted-foreground mt-0.5 text-xs text-pretty tabular-nums">
          {estimate.exact
            ? `${estimate.estimatedOptedOut.toLocaleString("es-CO")} pidieron no recibir promociones`
            : `≈ ${estimate.estimatedOptedOut.toLocaleString("es-CO")} pidieron no recibir promociones (estimado sobre una muestra de ${estimate.sampleSize.toLocaleString("es-CO")})`}
        </p>
      </div>
      <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={onRecalculate}>
        Recalcular audiencia
      </Button>
    </div>
  );
}
