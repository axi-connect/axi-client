"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleDollarSign,
  Gauge,
  Info,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
  UserRoundX,
} from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
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
import { getAgentTaskSettings } from "@/modules/crm/infrastructure/services/agent-task-settings-service.adapter";
import {
  createBulk,
  previewBulk,
  type BulkAudience,
} from "@/modules/crm/infrastructure/services/bulk-service.adapter";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";

const DEFAULT_TZ = "America/Bogota";
const NO_TEMPLATE = "__none__";
const OBJECTIVE_MIN = 12;

/**
 * «Pon al agente a trabajar con estos N contactos» (F4a).
 *
 * Es el flujo de F2 con el contacto sustituido por una audiencia, más las dos
 * cosas que solo existen en lote y que el mockup puso en el centro: el REPARTO
 * en el tiempo —sin él, 268 aperturas salen de golpe y Meta baja el límite del
 * número— y el recuento de a quién NO se le va a escribir, con su motivo, antes
 * de confirmar. Ese recuento sale del mismo servicio que luego aplica el job.
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
  const [objective, setObjective] = useState("");
  const [when, setWhen] = useState(() => dateShortcuts(now, DEFAULT_TZ)[1]);
  const [perHour, setPerHour] = useState(20);
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const [topic, setTopic] = useState("");
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

  const eligible = preview?.eligible ?? 0;
  const startsAtIso = when === undefined ? "" : businessDateTimeToIso(when.date, when.time, tz);
  const finishes =
    startsAtIso === "" ? null : bulkFinishesAt(new Date(startsAtIso), perHour, eligible);
  const cap = exceedsDailyCap(eligible, settings.daily_cap);
  const quiet =
    when === undefined
      ? null
      : quietHoursShift(when.date, when.time, settings.quiet_start_hour, settings.quiet_end_hour);
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const openingCost =
    selectedTemplate === undefined ? null : bulkOpeningCost(eligible, selectedTemplate.category);
  const agentName = agents.find((agent) => agent.id === agentId)?.name ?? "El agente";

  const tooLate = when !== undefined && isInPast(when.date, when.time, tz, now);
  const canSubmit =
    !saving &&
    preview !== null &&
    preview.within_limit &&
    eligible > 0 &&
    agentId !== "" &&
    objective.trim().length >= OBJECTIVE_MIN &&
    !tooLate &&
    (templateId === NO_TEMPLATE || topic.trim().length > 0 || !usesTopic(selectedTemplate));

  const submit = useCallback(async () => {
    if (!canSubmit || when === undefined) return;
    setSaving(true);
    try {
      const bulk = await createBulk({
        ...audienceBody(audience),
        assigned_agent_id: agentId,
        objective: objective.trim(),
        task_channel: medium,
        starts_at: businessDateTimeToIso(when.date, when.time, tz),
        per_hour: perHour,
        ...(selectedTemplate === undefined
          ? {}
          : {
              opening_template: {
                channel_template_id: selectedTemplate.id,
                params: ["first_name", "topic"] as const,
                topic: topic.trim(),
              },
            }),
      });
      onScheduled(bulk);
      onOpenChange(false);
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo programar el lote"),
        open: true,
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
    tz,
    perHour,
    selectedTemplate,
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
        title: preview === null ? "Seguimiento en lote" : `Seguimiento para ${String(eligible)} contactos`,
        description: audienceLabel,
        className: "sm:max-w-2xl",
        actions: [
          { label: "Cancelar", variant: "outline" },
          {
            label: saving ? "Programando…" : `Programar ${String(eligible)} seguimientos`,
            // Quien pide no cerrar es quien cierra: el submit cierra al terminar.
            keepOpen: true,
            onClick: () => void submit(),
          },
        ],
      }}
    >
      <div className="grid max-h-[65vh] gap-4 overflow-y-auto pr-1">
        {previewError !== null && <p className="text-sm text-destructive">{previewError}</p>}
        {preview !== null && !preview.within_limit && (
          <Callout tone="warn" icon={TriangleAlert}>
            Esa audiencia tiene <strong>{preview.total}</strong> contactos y el tope de un lote son{" "}
            <strong>{preview.max}</strong>. Divídela en segmentos más pequeños: un lote que tarda
            semanas en salir es una secuencia, y eso se configura aparte.
          </Callout>
        )}

        <ExclusionsPanel preview={preview} />

        <Field label="Agente">
          <Select value={agentId || undefined} onValueChange={setAgentId}>
            <SelectTrigger aria-label="Agente">
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
        </Field>

        <Field label="Objetivo">
          <ObjectiveField value={objective} onChange={setObjective} />
        </Field>

        <Field label="Cuándo empieza y a qué ritmo">
          <div className="grid gap-2 rounded-xl bg-secondary/70 p-3 sm:grid-cols-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Empieza
              <Input
                type="date"
                value={when?.date ?? ""}
                onChange={(e) => setWhen((prev) => ({ ...prev!, date: e.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Hora ({tz.replace(/_/g, " ")})
              <Input
                type="time"
                value={when?.time ?? ""}
                onChange={(e) => setWhen((prev) => ({ ...prev!, time: e.target.value }))}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Ritmo
              <Select value={String(perHour)} onValueChange={(v) => setPerHour(Number(v))}>
                <SelectTrigger aria-label="Ritmo">
                  <SelectValue />
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
                {eligible} contactos a {perHour} por hora: la última sale el{" "}
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

        {medium !== "call" && templates.length > 0 && (
          <Field label="Con qué abre a quien lleve más de 24 h sin escribir">
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger aria-label="Plantilla de apertura">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TEMPLATE}>Sin plantilla · esperar a que escriban</SelectItem>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} · {template.language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate !== undefined && usesTopic(selectedTemplate) && (
              <Input
                aria-label="Tema"
                placeholder="el tema del que le escribes, ej. tu pedido de septiembre"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            )}
            {selectedTemplate !== undefined && (
              <Callout tone={openingCost?.category === "marketing" ? "warn" : "info"} icon={CircleDollarSign}>
                Solo se cobra a quien la reciba de verdad: los que hayan escrito en las últimas 24 h
                siguen por mensaje normal. Como mucho, {eligible} ×{" "}
                {formatUsd(openingCost?.unit_usd ?? 0, 4)} ≈{" "}
                <strong>{formatUsd(openingCost?.total_usd ?? 0)}</strong>
                {openingCost?.category === "marketing" && (
                  <>
                    {" "}
                    — es una plantilla de <strong>marketing</strong>, unas 25 veces más cara que una
                    utility.
                  </>
                )}
                .
              </Callout>
            )}
          </Field>
        )}

        {preview === null && previewError === null && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            Contando la audiencia…
          </p>
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

function usesTopic(template: HsmTemplateDTO | undefined): boolean {
  return template !== undefined && template.body.includes("{{2}}");
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium">{label}</span>
      {children}
    </div>
  );
}

/** Quién queda fuera y por qué, ANTES de confirmar. Es lo que evita que el
 *  operador cuente 300 y reciba 268 sin entender la diferencia. */
function ExclusionsPanel({ preview }: { preview: BulkPreviewDTO | null }) {
  if (preview === null || preview.skipped.length === 0) return null;
  const out = preview.total - preview.eligible;
  return (
    <details className="overflow-hidden rounded-xl border border-border">
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 bg-secondary/70 px-3 py-2 text-xs">
        <UserRoundX aria-hidden className="size-3.5 text-muted-foreground" />
        <strong className="tabular-nums">{out}</strong> de {preview.total} no van a recibir nada —
        mira por qué
      </summary>
      <ul className="divide-y divide-border">
        {preview.skipped.map((group) => (
          <li key={group.reason} className="flex flex-wrap items-baseline gap-2 px-3 py-2 text-xs">
            <strong className="min-w-6 text-right tabular-nums">{group.count}</strong>
            <span>{BULK_SKIP_LABELS[group.reason]}</span>
            {BULK_SKIP_HINTS[group.reason] !== null && (
              <span className="text-muted-foreground">{BULK_SKIP_HINTS[group.reason]}</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
