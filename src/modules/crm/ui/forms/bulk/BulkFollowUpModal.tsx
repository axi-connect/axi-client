"use client";

import { META_TEMPLATES_HREF } from "@/core/lib/hsm-copy";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CircleAlert,
  CircleDollarSign,
  Gauge,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/core/lib/utils";
import { plural as n } from "@/core/lib/plural";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { Button } from "@/shared/components/ui/button";
import { Callout } from "@/shared/components/ui/callout";
import { Input } from "@/shared/components/ui/input";
import { Modal } from "@/shared/components/ui/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getTenantAgents, type AssignableAgent } from "@/modules/agents/public";
import { loadMyCompanyOnce } from "@/modules/companies/public";
import { listChannels } from "@/modules/channels/public";
import {
  bulkOpeningCost,
  countTemplateVariables,
  formatUsd,
  isUsableAsOpening,
  listHsmTemplates,
  type HsmTemplateDTO,
} from "@/modules/marketing/public";
import {
  DEFAULT_AGENT_TASK_SETTINGS,
  type AgentTaskSettings,
} from "@/modules/crm/domain/agent-task-settings";
import {
  BULK_RATES,
  BULK_SKIP_HINTS,
  BULK_SKIP_LABELS,
  bulkFinishesAt,
  bulkPromise,
  exceedsDailyCap,
  type BulkDTO,
  type BulkPreviewDTO,
} from "@/modules/crm/domain/bulk-follow-up";
import {
  businessDateTimeToIso,
  dateShortcuts,
  isInPast,
  quietHoursShift,
  type FollowUpMedium,
} from "@/modules/crm/domain/schedule-follow-up";
import { availableMedia } from "@/modules/crm/ui/forms/config/schedule-follow-up.config";
import { MediumPicker, ObjectiveField } from "@/modules/crm/ui/forms/follow-up/ScheduleFollowUpFields";
import { OpeningParamsEditor } from "@/modules/crm/ui/forms/follow-up/OpeningParamsEditor";
import {
  defaultOpeningHoles,
  encodeOpeningHoles,
  unresolvedHoles,
  type OpeningHole,
} from "@/modules/crm/domain/opening-params";
import { useContactFieldCatalog } from "@/modules/crm/infrastructure/hooks/use-contact-field-catalog";
import { getAgentTaskSettings } from "@/modules/crm/infrastructure/services/agent-task-settings-service.adapter";
import {
  createBulk,
  previewBulk,
  type BulkAudience,
} from "@/modules/crm/infrastructure/services/bulk-service.adapter";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { CallTypeSelect, type ProactiveCallType } from "@/modules/calls/public";

const DEFAULT_TZ = "America/Bogota";
const NO_TEMPLATE = "__none__";
const OBJECTIVE_MIN = 12;


/**
 * «Pon al agente a trabajar con estos N contactos» (F4a, rediseñada 2026-09-28).
 *
 * Es el flujo de F2 con el contacto sustituido por una audiencia, más las dos
 * cosas que solo existen en lote: el REPARTO en el tiempo —sin él, 268
 * aperturas salen de golpe y Meta baja el límite del número— y el recuento de
 * a quién NO se le va a escribir, con su motivo, antes de confirmar.
 *
 * Lo que cambió en el rediseño: el recuento es un bloque siempre visible
 * («Quién recibe esto») y no un `<details>` que en el móvil no se abría; el
 * servidor ahora distingue a quien NUNCA ha escrito (F5: se alcanza por
 * teléfono, pero Meta exige plantilla) y la modal lo cuenta en cifras y hace
 * la plantilla obligatoria solo para ellos; y con 0 elegibles se explica qué
 * pasó y qué hacer en vez de ofrecer «Programar 0 seguimientos».
 */
export function BulkFollowUpModal({
  open,
  audience,
  audienceLabel,
  onOpenChange,
  onScheduled,
}: {
  open: boolean;
  audience: BulkAudience;
  /** De dónde salen los contactos, en palabras del operador. */
  audienceLabel: string;
  onOpenChange: (open: boolean) => void;
  onScheduled: (bulk: BulkDTO) => void;
}) {
  const { showAlert } = useAlert();
  const { hasCapability } = useEntitlements();
  const now = useMemo(() => new Date(), []);
  const media = useMemo(() => availableMedia(hasCapability("calls")), [hasCapability]);

  const [agents, setAgents] = useState<readonly AssignableAgent[]>([]);
  const [company, setCompany] = useState({ tz: DEFAULT_TZ, name: "" });
  const [settings, setSettings] = useState<AgentTaskSettings>(DEFAULT_AGENT_TASK_SETTINGS);
  const [templates, setTemplates] = useState<readonly HsmTemplateDTO[]>([]);
  const [preview, setPreview] = useState<BulkPreviewDTO | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [agentId, setAgentId] = useState<string>("");
  const [medium, setMedium] = useState<FollowUpMedium>("message");
  // Plan de modos §7: el marco de las llamadas del lote (solo si llama).
  const [callType, setCallType] = useState<ProactiveCallType>("followup");
  const [objective, setObjective] = useState("");
  const [when, setWhen] = useState(() => dateShortcuts(now, DEFAULT_TZ)[1]);
  const [perHour, setPerHour] = useState(20);
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [topic, setTopic] = useState("");
  /** Qué va en cada `{{n}}` de la plantilla elegida (hotfix 2026-09-29). */
  const [holes, setHoles] = useState<OpeningHole[]>([]);
  const fields = useContactFieldCatalog();
  const [saving, setSaving] = useState(false);

  const tz = company.tz;

  useEffect(() => {
    if (!open) return;
    getTenantAgents()
      .then((list) => {
        setAgents(list);
        setAgentId((current) => current || (list[0]?.id ?? ""));
      })
      .catch(() => setAgents([]));
    loadMyCompanyOnce()
      .then((data) => setCompany({ tz: data.timezone || DEFAULT_TZ, name: data.name }))
      .catch(() => undefined);
    getAgentTaskSettings()
      .then(setSettings)
      .catch(() => setSettings(DEFAULT_AGENT_TASK_SETTINGS));
    // Plantillas del primer canal Cloud del tenant: en un lote no hay UN
    // contacto del que deducir el canal, y las HSM viven en la WABA.
    listChannels()
      .then(async (res) => {
        const cloud = res.data.find((channel) => channel.kind === "whatsapp_cloud");
        if (cloud === undefined) return [];
        const all = await listHsmTemplates({ channel_id: cloud.id, approval_status: "approved" });
        return all.filter(isUsableAsOpening);
      })
      .then((usable) => setTemplates(usable))
      .catch(() => setTemplates([]));
  }, [open]);

  // El recuento se pide al abrir: es lo que convierte «268 contactos» en «268
  // de 300, y estos 32 por estas razones».
  const audienceKey =
    audience.source === "contacts"
      ? audience.contact_ids.join(",")
      : audience.source === "segment"
        ? audience.segment_id
        : audience.import_job_id;
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setPreview(null);
    setPreviewError(null);
    previewBulk(audience)
      .then((fresh) => alive && setPreview(fresh))
      .catch((err: unknown) => {
        if (alive) setPreviewError(errorMessage(err, "No pudimos contar la audiencia"));
      });
    return () => {
      alive = false;
    };
    // `audienceKey` resume la audiencia: el objeto cambia de identidad en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audience.source, audienceKey]);

  // Hotfix 2026-09-29: a quién le falta cada campo del contacto que pide la
  // plantilla, ANTES del botón. Va en un segundo preflight, solo cuando hay
  // huecos «Campo del contacto» decididos: cambiar un texto fijo no recuenta.
  const fieldCodesKey = [...new Set(holes.flatMap((hole) => (hole.kind === "custom_field" && hole.code !== "" ? [hole.code] : [])))]
    .sort()
    .join(",");
  const [missingFields, setMissingFields] = useState<BulkPreviewDTO["missing_fields"]>([]);
  useEffect(() => {
    if (!open || fieldCodesKey === "") {
      setMissingFields([]);
      return;
    }
    let alive = true;
    previewBulk({
      ...audience,
      opening_template: { params: fieldCodesKey.split(",").map((code) => `custom_field:${code}`) },
    })
      .then((fresh) => alive && setMissingFields(fresh.missing_fields))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, audience.source, audienceKey, fieldCodesKey]);

  const eligible = preview?.eligible ?? 0;
  const needsOpening = preview?.needs_opening ?? 0;
  const counted = preview !== null && preview.within_limit;
  const nobody = counted && eligible === 0;
  const startsAtIso = when === undefined ? "" : businessDateTimeToIso(when.date, when.time, tz);
  const finishes =
    startsAtIso === "" ? null : bulkFinishesAt(new Date(startsAtIso), perHour, eligible);
  const cap = exceedsDailyCap(eligible, settings.daily_cap);
  const quiet =
    when === undefined
      ? null
      : quietHoursShift(when.date, when.time, settings.quiet_start_hour, settings.quiet_end_hour);
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const agentName = agents.find((agent) => agent.id === agentId)?.name ?? "El agente";
  // La plantilla es obligatoria cuando hay quien NUNCA ha escrito: Meta no deja
  // abrir sin una (F5). Para el resto sigue siendo opcional: solo sale si la
  // ventana está cerrada cuando la tarea corra.
  const templateRequired = medium !== "call" && needsOpening > 0;
  const templateMissing = templateRequired && selectedTemplate === undefined;
  const pendingHoles = selectedTemplate === undefined ? [] : unresolvedHoles(holes, topic);
  const openingCost =
    selectedTemplate === undefined
      ? null
      : {
          atLeast: bulkOpeningCost(needsOpening, selectedTemplate.category),
          atMost: bulkOpeningCost(eligible, selectedTemplate.category),
        };

  const tooLate = when !== undefined && isInPast(when.date, when.time, tz, now);
  const canSubmit =
    !saving &&
    counted &&
    eligible > 0 &&
    agentId !== "" &&
    objective.trim().length >= OBJECTIVE_MIN &&
    !tooLate &&
    !templateMissing &&
    pendingHoles.length === 0;

  const submit = useCallback(async () => {
    if (!canSubmit || when === undefined) return;
    setSaving(true);
    try {
      const bulk = await createBulk({
        ...audienceBody(audience),
        assigned_agent_id: agentId,
        objective: objective.trim(),
        task_channel: medium,
        ...(medium === "message" ? {} : { call_type: callType }),
        starts_at: businessDateTimeToIso(when.date, when.time, tz),
        per_hour: perHour,
        ...(selectedTemplate === undefined
          ? {}
          : {
              opening_template: {
                channel_template_id: selectedTemplate.id,
                params: encodeOpeningHoles(holes),
                ...(holes.some((hole) => hole.kind === "topic") ? { topic: topic.trim() } : {}),
              },
            }),
      });
      onScheduled(bulk);
      onOpenChange(false);
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo programar el lote",
        description: errorMessage(err, "Inténtalo de nuevo en un momento"),
      });
    } finally {
      setSaving(false);
    }
  }, [
    canSubmit,
    when,
    audience,
    agentId,
    objective,
    medium,
    callType,
    tz,
    perHour,
    selectedTemplate,
    holes,
    topic,
    onScheduled,
    onOpenChange,
    showAlert,
  ]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      config={{
        title: counted ? `Seguimiento para ${n(eligible, "contacto", "contactos")}` : "Seguimiento en lote",
        description: audienceLabel,
        // UN solo scroller (auditoría B2): el diálogo es una columna flex a la
        // altura real de la pantalla; cabecera, recuento y botones quedan
        // fijos y solo el formulario scrollea. Sin esto el diálogo scrolleaba
        // por fuera y el formulario por dentro, con «Programar» fuera de la
        // pantalla a 1280×800 y en cualquier celular.
        className: "flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden sm:max-w-2xl",
        // El recuento va FUERA del área que scrollea: Radix enfoca el primer
        // control al abrir y, dentro, el scroll se lo llevaba por arriba —el
        // operador veía «Agente» y nunca a quién le iba a escribir. En el
        // celular va compacto (tres chips) y el detalle de exclusiones baja
        // al área que scrollea, para que el formulario tenga sitio.
        body: counted ? <AudiencePanel preview={preview} /> : undefined,
        actions: [
          { label: "Cancelar", variant: "outline" },
          {
            label: saving
              ? "Programando…"
              : eligible > 0
                ? `Programar ${n(eligible, "seguimiento", "seguimientos")}`
                : "Programar",
            // Quien pide no cerrar es quien cierra: el submit cierra al terminar.
            keepOpen: true,
            disabled: !canSubmit,
            onClick: () => void submit(),
          },
        ],
      }}
    >
      <div className="grid min-h-0 min-w-0 flex-1 content-start gap-4 overflow-x-hidden overflow-y-auto pr-1 axi-scroll">
        {counted && preview.skipped.length > 0 && <ExclusionsDetails preview={preview} className="sm:hidden" />}
        {previewError !== null && (
          <Callout tone="warn" icon={TriangleAlert}>
            {previewError}
          </Callout>
        )}
        {preview !== null && !preview.within_limit && (
          <Callout tone="warn" icon={TriangleAlert}>
            Esa audiencia tiene <strong>{preview.total}</strong> contactos y el tope de un lote son{" "}
            <strong>{preview.max}</strong>. Divídela en segmentos más pequeños: un lote que tarda
            semanas en salir es una secuencia, y eso se configura aparte.
          </Callout>
        )}

        {preview === null && previewError === null && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            Contando la audiencia…
          </p>
        )}

        {nobody && (
          <div className="flex flex-col items-start gap-1.5 rounded-2xl border border-dashed border-border p-4">
            <span className="font-heading text-[15px] font-bold">Nadie puede recibir este seguimiento todavía</span>
            <p className="text-sm text-pretty text-muted-foreground">
              {preview.skipped.some((group) => group.reason === "no_channel")
                ? "Hay contactos sin teléfono ni WhatsApp: complétales el teléfono o importa una lista con teléfonos y vuelve a intentarlo."
                : "Todos los contactos de esta audiencia quedan fuera por los motivos de arriba."}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="contrast" className="rounded-full">
                <Link href="/crm/contacts">Ver contactos</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href="/crm/settings/imports">Importar contactos</Link>
              </Button>
            </div>
          </div>
        )}

        {counted && !nobody && (
          <>
            <Field label="Agente">
              <Select value={agentId || undefined} onValueChange={setAgentId}>
                <SelectTrigger className="w-full" aria-label="Agente">
                  <SelectValue placeholder="Elige el agente" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <span className="flex items-center gap-2">
                        <Sparkles aria-hidden className="size-3.5 text-accent-violet" />
                        {agent.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Cómo contacta">
              <MediumPicker value={medium} available={media} onChange={setMedium} />
              {medium !== "message" && (
                <div className="mt-3">
                  <CallTypeSelect value={callType} onChange={setCallType} />
                </div>
              )}
            </Field>

            <Field label="Objetivo">
              <ObjectiveField value={objective} onChange={setObjective} />
            </Field>

            <Field label="Cuándo empieza y a qué ritmo">
              <div className="grid min-w-0 gap-2 rounded-xl bg-secondary/70 p-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
                <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
                  Empieza
                  <Input
                    type="date"
                    value={when?.date ?? ""}
                    onChange={(e) => setWhen((prev) => ({ ...prev!, date: e.target.value }))}
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
                  Hora · {tzCity(tz)}
                  <Input
                    type="time"
                    value={when?.time ?? ""}
                    onChange={(e) => setWhen((prev) => ({ ...prev!, time: e.target.value }))}
                  />
                </label>
                <label className="grid min-w-0 gap-1 text-xs text-muted-foreground">
                  Ritmo
                  <Select value={String(perHour)} onValueChange={(v) => setPerHour(Number(v))}>
                    <SelectTrigger className="w-full min-w-0" aria-label="Ritmo">
                      {/* En el disparador solo la cifra: la pista («recomendado») vive en la lista. */}
                      <SelectValue>{`${String(perHour)} por hora`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {BULK_RATES.map((rate) => (
                        <SelectItem key={rate.value} value={String(rate.value)}>
                          {rate.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
              </div>
              {tooLate && <p className="text-xs text-destructive">Esa hora ya pasó.</p>}
              {finishes !== null && eligible > 0 && (
                <p className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Gauge aria-hidden className="mt-0.5 size-3.5 shrink-0 text-info" />
                  <span>
                    {n(eligible, "contacto", "contactos")} a {perHour} por hora: la última sale el{" "}
                    <strong className="font-medium text-foreground">
                      {finishes.toLocaleString("es-CO", {
                        timeZone: tz,
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </strong>
                    .
                  </span>
                </p>
              )}
              {cap.exceeds && (
                <Callout tone="warn" icon={TriangleAlert}>
                  Tu cupo diario son <strong>{settings.daily_cap}</strong> tareas, así que el lote cruza a{" "}
                  <strong>{cap.days} días</strong>. El agente no se lo salta: lo que sobra sale al día
                  siguiente, no se pierde.
                </Callout>
              )}
              {quiet !== null && quiet.quiet && (
                <Callout tone="info" icon={Info}>
                  A esa hora el agente no escribe (horario silencioso {quiet.window}). Las primeras
                  saldrán a las <strong>{quiet.resumes_at.time}</strong>.
                </Callout>
              )}
            </Field>

            {medium !== "call" && (
              <Field
                label={
                  templateRequired
                    ? "Con qué abre a quien nunca te ha escrito"
                    : "Con qué abre a quien lleve más de 24 h sin escribir"
                }
                hint={templateRequired ? `obligatoria para ${String(needsOpening)}` : "opcional"}
              >
                {templates.length === 0 ? (
                  <Callout tone={templateRequired ? "warn" : "info"} icon={templateRequired ? TriangleAlert : Info}>
                    {templateRequired
                      ? `${n(needsOpening, "contacto nunca te ha escrito", "contactos nunca te han escrito")} y no hay ninguna plantilla de Meta aprobada para abrirles. `
                      : "No hay plantillas de Meta aprobadas: a quien lleve más de 24 h sin escribir se le esperará. "}
                    <Link href={META_TEMPLATES_HREF} className="font-medium underline underline-offset-4">
                      Ver plantillas de Meta
                    </Link>
                  </Callout>
                ) : (
                  <>
                    <Select
                      value={templateId}
                      onValueChange={(next) => {
                        setTemplateId(next);
                        const chosen = templates.find((template) => template.id === next);
                        setHoles(chosen === undefined ? [] : defaultOpeningHoles(countTemplateVariables(chosen.body) ?? 0));
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-label="Plantilla de apertura"
                        aria-invalid={templateMissing || undefined}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_TEMPLATE} disabled={templateRequired}>
                          {templateRequired ? "Elige una plantilla" : "Sin plantilla · esperar a que escriban"}
                        </SelectItem>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} · {template.language}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedTemplate !== undefined && holes.length > 0 && (
                      <OpeningParamsEditor
                        idPrefix="bulk-hole"
                        body={selectedTemplate.body}
                        holes={holes}
                        onHolesChange={setHoles}
                        topic={topic}
                        onTopicChange={setTopic}
                        fields={fields}
                        // En un lote no hay UN contacto: la vista previa enseña de dónde sale cada dato.
                        sources={{
                          first_name: "Ana",
                          full_name: "Ana",
                          company_name: company.name || "tu empresa",
                          topic,
                          custom_fields: Object.fromEntries(fields.map((field) => [field.code, `«${field.label}»`])),
                        }}
                        previewName="cada contacto (con «Ana» de ejemplo)"
                      />
                    )}
                    {missingFields.length > 0 && (
                      <Callout tone="warn" icon={CircleAlert}>
                        {missingFields.map((entry, index) => (
                          <span key={entry.code}>
                            {index === 0 ? "A " : index === missingFields.length - 1 ? " y a " : ", a "}
                            <strong>{n(entry.count, "contacto", "contactos")}</strong>{" "}
                            {entry.count === 1 ? "le" : "les"} falta «
                            {fields.find((field) => field.code === entry.code)?.label ?? entry.code}»
                          </span>
                        ))}
                        : su seguimiento quedará en espera hasta que alguien complete la ficha, y se reintenta solo.
                      </Callout>
                    )}
                    {openingCost !== null && (
                      <Callout tone={openingCost.atMost.category === "marketing" ? "warn" : "info"} icon={CircleDollarSign}>
                        Meta cobra solo las que entrega.{" "}
                        {needsOpening > 0 && (
                          <>
                            Seguro para los {needsOpening} que nunca te han escrito:{" "}
                            <strong>{formatUsd(openingCost.atLeast.total_usd)}</strong>.{" "}
                          </>
                        )}
                        Como mucho, {eligible} × {formatUsd(openingCost.atMost.unit_usd, 4)} ≈{" "}
                        <strong>{formatUsd(openingCost.atMost.total_usd)}</strong>
                        {openingCost.atMost.category === "marketing" && (
                          <>
                            {" "}
                            — es una plantilla de <strong>marketing</strong>, unas 25 veces más cara que una de
                            utilidad.
                          </>
                        )}
                        .
                      </Callout>
                    )}
                  </>
                )}
              </Field>
            )}

            {eligible > 0 && when !== undefined && (
              <p className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
                <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-violet" />
                <span>
                  {bulkPromise({
                    agentName,
                    eligible,
                    medium,
                    startLabel: `${when.date} a las ${when.time}`,
                    perHour,
                  })}{" "}
                  Puedes pararlo entero mientras no haya salido.
                </span>
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/** El cuerpo que espera el backend según de dónde salga la audiencia. */
function audienceBody(audience: BulkAudience) {
  if (audience.source === "contacts") {
    return { source: "contacts" as const, contact_ids: audience.contact_ids };
  }
  if (audience.source === "segment") {
    return { source: "segment" as const, segment_id: audience.segment_id };
  }
  return { source: "import" as const, import_job_id: audience.import_job_id };
}

/** «America/Bogota» → «Bogotá» no se puede adivinar; «Bogota» sí se lee. */
function tzCity(tz: string): string {
  return (tz.split("/").at(-1) ?? tz).replace(/_/g, " ");
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-xs font-medium">
        {label}
        {hint && <span className="font-normal text-muted-foreground"> · {hint}</span>}
      </span>
      {children}
    </div>
  );
}

/**
 * «Quién recibe esto»: siempre visible, en cifras, ANTES de confirmar. Es lo
 * que evita que el operador cuente 300 y reciba 268 sin entender la diferencia,
 * y lo que le dice que a 12 se les abrirá con plantilla porque nunca han escrito.
 */
function AudiencePanel({ preview }: { preview: BulkPreviewDTO }) {
  const out = preview.total - preview.eligible;
  return (
    <section aria-label="Quién recibe esto" className="shrink-0 overflow-hidden rounded-2xl border border-border">
      {/* Tres cifras en fila; en el celular con etiquetas cortas, que a 375 px
          la columna no da ni para la palabra «seguimiento». */}
      <dl className="grid grid-cols-[repeat(3,minmax(0,1fr))] divide-x divide-border bg-secondary/70">
        <Figure value={preview.eligible} label="recibirán seguimiento" short="reciben" />
        <Figure value={preview.needs_opening} label="nunca te han escrito · abre con plantilla" short="abren con plantilla" />
        <Figure value={out} label="quedan fuera" short="fuera" muted />
      </dl>
      {preview.skipped.length > 0 && <ExclusionsList preview={preview} className="hidden border-t border-border sm:block" />}
    </section>
  );
}

function Figure({ value, label, short, muted = false }: { value: number; label: string; short: string; muted?: boolean }) {
  return (
    // En el DOM va dt→dd (lo exige el HTML); la cifra se pinta primero por CSS.
    <div className="flex min-w-0 flex-col-reverse justify-end gap-0.5 px-2.5 py-2 sm:px-3.5 sm:py-3">
      <dt className="min-w-0 text-[11px] leading-snug text-pretty text-muted-foreground sm:text-[11.5px]">
        <span className="sm:hidden">{short}</span>
        <span className="hidden sm:inline">{label}</span>
      </dt>
      <dd className={cn("m-0 font-heading text-lg leading-none font-bold tabular-nums sm:text-[22px]", muted && "text-muted-foreground")}>
        {value}
      </dd>
    </div>
  );
}

/** Quién queda fuera y por qué, con su acción. Fijo desde `sm`; plegado en el celular. */
function ExclusionsList({ preview, className }: { preview: BulkPreviewDTO; className?: string }) {
  return (
    <ul className={cn("divide-y divide-border", className)}>
      {preview.skipped.map((group) => (
        <li key={group.reason} className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-2 gap-y-1 px-3.5 py-2 text-xs">
          <strong className="text-right leading-6 tabular-nums">{group.count}</strong>
          <span className="min-w-0 leading-6 text-pretty">
            {BULK_SKIP_LABELS[group.reason]}
            {BULK_SKIP_HINTS[group.reason] !== null && (
              <span className="text-muted-foreground"> · {BULK_SKIP_HINTS[group.reason]}</span>
            )}
          </span>
          {group.reason === "no_channel" && (
            <Link
              href={group.count === 1 && group.contact_ids[0] ? `/crm/contacts/${group.contact_ids[0]}` : "/crm/contacts"}
              className="col-start-2 inline-flex min-h-6 w-fit items-center font-medium underline underline-offset-4"
            >
              Completar teléfono
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function ExclusionsDetails({ preview, className }: { preview: BulkPreviewDTO; className?: string }) {
  const out = preview.total - preview.eligible;
  // La lista solo se monta abierta: cerrada, un <details> sigue midiendo su
  // contenido y el arnés lo lee como un desborde que no existe.
  const [open, setOpen] = useState(false);
  return (
    <details
      className={cn("rounded-2xl border border-border", className)}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer px-3.5 py-2 text-xs font-medium">
        {n(out, "contacto queda fuera", "contactos quedan fuera")} · ver por qué
      </summary>
      {open && <ExclusionsList preview={preview} className="border-t border-border" />}
    </details>
  );
}
