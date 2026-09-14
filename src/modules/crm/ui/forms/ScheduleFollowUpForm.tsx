"use client";

import { useEffect, useMemo, useState } from "react";
import { CircleUser, Sparkles } from "lucide-react";
import { applyServerValidation, errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useEntitlements } from "@/shared/auth/entitlements.hooks";
import { createCustomField, DynamicForm } from "@/shared/components/features/dynamic-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { getTenantAgents, type AssignableAgent } from "@/modules/agents/public";
import { loadMyCompanyOnce } from "@/modules/companies/public";
import { isUsableAsOpening, listHsmTemplates, type HsmTemplateDTO } from "@/modules/marketing/public";
import type { ActivityDTO } from "@/modules/crm/domain/activity";
import type { AgentTaskSettings } from "@/modules/crm/domain/agent-task-settings";
import { dateShortcuts, type ContactReachabilityDTO } from "@/modules/crm/domain/schedule-follow-up";
import {
  createAgentTask,
  updateAgentTask,
} from "@/modules/crm/infrastructure/services/activities-service.adapter";
import { getAgentTaskSettings } from "@/modules/crm/infrastructure/services/agent-task-settings-service.adapter";
import { getContact } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { getContactReachability } from "@/modules/crm/infrastructure/services/follow-up-service.adapter";
import { ContactPicker } from "@/modules/crm/ui/forms/ContactPicker";
import {
  availableMedia,
  buildScheduleFollowUpSchema,
  defaultScheduleFollowUpValues,
  editScheduleFollowUpValues,
  NO_AGENT,
  NO_TEMPLATE,
  toCreateFollowUpDTO,
  toUpdateFollowUpDTO,
  type ScheduleFollowUpValues,
} from "./config/schedule-follow-up.config";
import {
  MediumPicker,
  ObjectiveField,
  OpeningTemplatePicker,
  PromiseLine,
  WhenPicker,
  WindowNoticeCard,
} from "./follow-up/ScheduleFollowUpFields";

const TEMPLATES_HREF = "/marketing/settings/meta-templates";
const DEFAULT_TZ = "America/Bogota";

/**
 * «Programar seguimiento» (F2 del seguimiento autónomo): el flujo propio de
 * las tareas de agente. Sustituye al ramal de IA del formulario genérico de
 * actividades, que pedía elegir «Un agente de IA» en un `<select>` nativo y
 * una fecha en un `datetime-local` vacío sin zona horaria.
 *
 * Trae al formulario lo que hasta ahora solo sabía el motor: la zona del
 * negocio, el horario silencioso, si el contacto está dentro de la ventana de
 * 24 h de WhatsApp a la hora ELEGIDA, y con qué plantilla abriría si no.
 * Guardar dispara `requestSubmit()` por `crm-follow-up-form`.
 */
export function ScheduleFollowUpForm({
  presetContact,
  dealId,
  task,
  onSuccess,
}: {
  presetContact?: { id: string; label: string };
  dealId?: string;
  /** Presente = edición (reprogramar reinicia los intentos). */
  task?: ActivityDTO;
  onSuccess: () => void;
}) {
  const { showAlert } = useAlert();
  const { hasCapability } = useEntitlements();
  const now = useMemo(() => new Date(), []);
  // F3: llamar es capacidad del plan. Si los entitlements no cargaron,
  // `hasCapability` responde true y el backend es quien rechaza (422).
  const hasCalls = hasCapability("calls");
  const media = useMemo(() => availableMedia(hasCalls), [hasCalls]);

  const [agents, setAgents] = useState<readonly AssignableAgent[]>([]);
  const [company, setCompany] = useState<{ tz: string; name: string }>({ tz: DEFAULT_TZ, name: "" });
  const [settings, setSettings] = useState<AgentTaskSettings | null>(null);
  const [contactId, setContactId] = useState<string | null>(presetContact?.id ?? task?.contact_id ?? null);
  const [contact, setContact] = useState<{ first_name: string | null; full_name: string | null }>({
    first_name: null,
    full_name: presetContact?.label ?? null,
  });
  const [reach, setReach] = useState<ContactReachabilityDTO | null>(null);
  const [templates, setTemplates] = useState<readonly HsmTemplateDTO[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    task?.opening_template?.channel_template_id ?? NO_TEMPLATE,
  );

  useEffect(() => {
    getTenantAgents().then(setAgents).catch(() => setAgents([]));
    loadMyCompanyOnce()
      .then((data) => setCompany({ tz: data.timezone || DEFAULT_TZ, name: data.name }))
      .catch(() => undefined);
    // Sin permiso de lectura no hay aviso de silencio: el motor lo aplica igual.
    getAgentTaskSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  // El contacto cambia → se relee su alcanzabilidad (una query) y su nombre.
  useEffect(() => {
    if (contactId === null) {
      setReach(null);
      return;
    }
    let alive = true;
    setReach(null);
    getContactReachability(contactId)
      .then((fresh) => alive && setReach(fresh))
      .catch(() => undefined);
    getContact(contactId)
      .then((fresh) => alive && setContact({ first_name: fresh.first_name, full_name: fresh.full_name }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [contactId]);

  // Plantillas aprobadas del canal Cloud del contacto: solo si hay uno.
  useEffect(() => {
    if (reach === null || !reach.supports_templates || reach.channel_id === null) {
      setTemplates([]);
      return;
    }
    let alive = true;
    listHsmTemplates({ channel_id: reach.channel_id, approval_status: "approved" })
      .then((all) => alive && setTemplates(all.filter(isUsableAsOpening)))
      .catch(() => alive && setTemplates([]));
    return () => {
      alive = false;
    };
  }, [reach]);

  const editing = task !== undefined;
  const tz = company.tz;
  const firstName = contact.first_name?.trim() || contact.full_name?.trim().split(/\s+/)[0] || "";
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);

  const defaultValues = useMemo(
    () =>
      task === undefined
        ? defaultScheduleFollowUpValues({ contact: presetContact, shortcut: dateShortcuts(now, tz)[1] })
        : editScheduleFollowUpValues(task, tz, presetContact),
    [task, presetContact, tz, now],
  );

  // El esquema conoce la alcanzabilidad y las plantillas: exige la plantilla
  // solo si, a la hora que el operador eligió, el contacto estará fuera de la
  // ventana — la misma regla que pinta el aviso.
  const schema = useMemo(
    () => buildScheduleFollowUpSchema({ tz, now, reach, templates, media }),
    [tz, now, reach, templates, media],
  );

  const fields = useMemo(
    () => [
      createCustomField<ScheduleFollowUpValues>(
        "contact",
        ({ value, setValue, getError }) =>
          presetContact !== undefined || editing ? (
            <p className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted px-3 text-sm">
              <CircleUser aria-hidden className="size-4 text-muted-foreground" />
              {(value as ScheduleFollowUpValues["contact"])?.label || contact.full_name || "Contacto"}
            </p>
          ) : (
            <ContactPicker
              value={value as ScheduleFollowUpValues["contact"]}
              onChange={(next) => {
                setValue("contact", next);
                setContactId(next?.id ?? null);
              }}
              error={getError()}
            />
          ),
        { label: "Contacto" },
      ),
      createCustomField<ScheduleFollowUpValues>(
        "agent_id",
        ({ value, setValue, getError }) => (
          <div className="space-y-1">
            <Select
              value={value === NO_AGENT ? undefined : (value as string)}
              onValueChange={(next) => setValue("agent_id", next)}
            >
              <SelectTrigger aria-label="Agente" aria-invalid={Boolean(getError())}>
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
            {getError() && <p className="text-xs text-destructive">{getError()}</p>}
            {agents.length === 0 && (
              <p className="text-xs text-muted-foreground">Activa un agente de IA para poder delegarle seguimientos.</p>
            )}
          </div>
        ),
        { label: "Agente" },
      ),
      createCustomField<ScheduleFollowUpValues>(
        "medium",
        ({ value, setValue }) => (
          <MediumPicker
            value={value as ScheduleFollowUpValues["medium"]}
            available={media}
            onChange={(medium) => setValue("medium", medium)}
          />
        ),
        { label: "Cómo contacta", colSpan: { base: 1, md: 2 } },
      ),
      createCustomField<ScheduleFollowUpValues>(
        "objective",
        ({ value, setValue, getError }) => (
          <ObjectiveField
            value={value as string}
            onChange={(next) => setValue("objective", next)}
            {...(getError() === undefined ? {} : { error: getError() })}
          />
        ),
        {
          label: "Objetivo",
          description: "Una meta en tus palabras, no un guion. El agente redacta con su tono, su catálogo y sus reglas.",
          colSpan: { base: 1, md: 2 },
        },
      ),
      createCustomField<ScheduleFollowUpValues>(
        "date",
        ({ control, setValue, value }) => (
          <WhenPicker
            control={control}
            values={{ date: value as string, time: "" }}
            onChange={(next) => {
              setValue("date", next.date);
              setValue("time", next.time);
            }}
            tz={tz}
            now={now}
            settings={settings}
          />
        ),
        { label: "Cuándo", colSpan: { base: 1, md: 2 } },
      ),
      createCustomField<ScheduleFollowUpValues>(
        "opening_template_id",
        ({ control, value, setValue }) => (
          <div className="space-y-3">
            <WindowNoticeCard
              control={control}
              reach={reach}
              firstName={firstName}
              tz={tz}
              hasApprovedTemplates={templates.length > 0}
              now={now}
              templatesHref={TEMPLATES_HREF}
            />
            {templates.length > 0 && (
              <OpeningTemplatePicker
                control={control}
                templates={templates}
                values={{ opening_template_id: value as string, topic: "" }}
                onChange={(next) => {
                  if (next.opening_template_id !== undefined) {
                    setValue("opening_template_id", next.opening_template_id);
                    setSelectedTemplateId(next.opening_template_id);
                  }
                  if (next.topic !== undefined) setValue("topic", next.topic);
                }}
                contact={contact}
                companyName={company.name}
              />
            )}
          </div>
        ),
        {
          label: "Estado del contacto en WhatsApp",
          colSpan: { base: 1, md: 2 },
          isVisible: (values) => values.medium !== "call",
        },
      ),
      createCustomField<ScheduleFollowUpValues>(
        "agent_id",
        ({ control }) => (
          <PromiseLine
            control={control}
            agents={agents}
            contactFirstName={firstName}
            tz={tz}
            reach={reach}
            hasApprovedTemplates={templates.length > 0}
            settings={settings}
            now={now}
          />
        ),
        { colSpan: { base: 1, md: 2 } },
      ),
    ],
    [agents, presetContact, editing, contact, reach, templates, media, tz, now, settings, company.name, firstName],
  );

  return (
    <DynamicForm<ScheduleFollowUpValues>
      id="crm-follow-up-form"
      schema={schema}
      fields={fields}
      defaultValues={defaultValues}
      columns={{ base: 1, md: 2 }}
      actions={{ render: () => null }}
      onSubmit={async (values, form) => {
        try {
          if (task !== undefined) {
            await updateAgentTask(task.id, toUpdateFollowUpDTO(values, { tz, template: selectedTemplate }));
          } else {
            await createAgentTask(toCreateFollowUpDTO(values, { tz, deal_id: dealId, template: selectedTemplate }));
          }
          showAlert({
            tone: "success",
            title: editing ? "Seguimiento actualizado" : "Seguimiento programado",
            open: true,
          });
          onSuccess();
        } catch (err) {
          if (!applyServerValidation(err, form)) {
            showAlert({
              tone: "error",
              title: errorMessage(err, "No se pudo programar el seguimiento"),
              open: true,
            });
          }
        }
      }}
    />
  );
}
