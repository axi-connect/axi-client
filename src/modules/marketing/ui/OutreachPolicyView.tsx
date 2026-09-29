"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Lock, Mail, MessageSquareText, Phone } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Island } from "@/shared/components/features/island";
import { FormSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";
import { Switch } from "@/shared/components/ui/switch";
import {
  ChannelKindIcon,
  listChannels,
  readQualityRating,
  type ChannelDTO,
  type HealthReading,
} from "@/modules/channels/public";
import {
  describeChanges,
  formatHour,
  isHighRisk,
  MODE_OPTIONS,
  OUTREACH_CHANNELS_SHOWN,
  validateHours,
  type HoursErrors,
  type OutreachChannelKey,
  type OutreachChannelMeta,
  type OutreachPolicy,
  type OutreachPolicyView as PolicyView,
  type OutreachTimeRange,
} from "@/modules/marketing/domain/outreach-policy";
import { listOptOuts } from "@/modules/marketing/infrastructure/services/opt-outs-service.adapter";
import {
  getOutreachPolicy,
  putOutreachPolicy,
} from "@/modules/marketing/infrastructure/services/outreach-policy-service.adapter";
import { LoadError } from "@/modules/marketing/ui/components/premium";

/**
 * Marketing › Configuración › Política de contacto (P1 del piloto de
 * captación, tablero 6). El guardián que aplica esto vive en el servidor
 * (`OUTREACH_POLICY`): pilotos, secuencias, campañas, recuperación, lotes y
 * llamadas preguntan ahí antes de abrir contacto. Esta vista solo lo configura.
 *
 * El PUT exige la política COMPLETA: se parte del GET y, si falla, no se
 * ofrece guardar (escribir sobre defaults inventados pisaría lo real).
 */
export function OutreachPolicyView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert } = useAlert();

  const [view, setView] = useState<PolicyView | null>(null);
  const [draft, setDraft] = useState<OutreachPolicy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hoursErrors, setHoursErrors] = useState<HoursErrors>({});
  const [saving, setSaving] = useState(false);

  // Lo que acompaña (bajas, calidad del número) se pide aparte: si falla, la
  // política se puede seguir editando y la ficha dice que no pudo leerlo.
  const [optOutCount, setOptOutCount] = useState<number | null | "error">(null);
  const [whatsapp, setWhatsapp] = useState<ChannelDTO[] | null | "error">(null);

  const load = useCallback(async () => {
    try {
      const next = await getOutreachPolicy();
      setView(next);
      setDraft(next.policy);
      setHoursErrors({});
      setLoadError(null);
    } catch (err) {
      setLoadError(errorMessage(err, "No pudimos cargar tu política de contacto"));
    }
  }, []);

  useEffect(() => {
    void load();
    listOptOuts({ active_only: true, page: 1, page_size: 1 })
      .then((page) => setOptOutCount(page.meta.total))
      .catch(() => setOptOutCount("error"));
    listChannels()
      .then((list) =>
        setWhatsapp(list.data.filter((c) => c.kind === "whatsapp_cloud" && c.status === "connected")),
      )
      .catch(() => setWhatsapp("error"));
  }, [load]);

  const summary = useMemo(
    () => (view !== null && draft !== null ? describeChanges(view.policy, draft) : null),
    [view, draft],
  );

  function setChannel(key: OutreachChannelKey, patch: Partial<OutreachPolicy["channels"][OutreachChannelKey]>) {
    setDraft((prev) =>
      prev === null ? prev : { ...prev, channels: { ...prev.channels, [key]: { ...prev.channels[key], ...patch } } },
    );
  }

  function setHours(patch: Partial<OutreachPolicy["hours"]>) {
    setDraft((prev) => (prev === null ? prev : { ...prev, hours: { ...prev.hours, ...patch } }));
  }

  async function handleSave() {
    if (view === null || draft === null) return;
    const found = validateHours(draft.hours, view.floor);
    setHoursErrors(found);
    if (Object.keys(found).length > 0) {
      showAlert({ tone: "error", title: "Revisa el horario", description: "Solo puede estrecharse." });
      return;
    }
    setSaving(true);
    try {
      const next = await putOutreachPolicy(draft);
      setView(next);
      setDraft(next.policy);
      showAlert({ tone: "success", title: "Política guardada" });
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo guardar",
        description: errorMessage(err, "Inténtalo de nuevo en un momento"),
      });
    } finally {
      setSaving(false);
    }
  }

  if (loadError !== null) return <LoadError message={loadError} onRetry={load} />;
  if (view === null || draft === null) return <FormSkeleton fields={8} />;

  const disabled = !canManage || saving;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <header className="flex min-w-0 flex-col gap-1">
        <h2 className="font-heading text-xl font-bold tracking-tight">Por dónde puede contactar Axi</h2>
        <p className="text-muted-foreground max-w-3xl text-sm text-pretty">
          Tú decides los canales. Axi te dice el riesgo de cada uno y lo aplica en todo: pilotos,
          secuencias, campañas, recuperación, lotes y llamadas. Las bajas se respetan siempre.
        </p>
      </header>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] [&>*]:min-w-0">
        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="op-channels" className="border-border bg-card @container rounded-3xl border">
            <header className="flex flex-col gap-1 px-5 pt-5 pb-3 sm:px-6">
              <h3 id="op-channels" className="font-heading text-lg font-bold tracking-tight">
                Canales para iniciar el contacto
              </h3>
              <p className="text-muted-foreground text-sm text-pretty">
                «A cualquier lead» incluye los que salieron de un mapa o del registro mercantil, sin
                que te hayan escrito antes.
              </p>
            </header>
            <ul>
              {OUTREACH_CHANNELS_SHOWN.map((meta) => (
                <ChannelRow
                  key={meta.key}
                  meta={meta}
                  policy={draft.channels[meta.key]}
                  whatsapp={meta.key === "whatsapp_cloud" ? whatsapp : null}
                  disabled={disabled}
                  onChange={(patch) => setChannel(meta.key, patch)}
                />
              ))}
            </ul>
          </section>

          <HoursCard
            hours={draft.hours}
            floor={view.floor}
            errors={hoursErrors}
            disabled={disabled}
            onChange={setHours}
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-4" aria-label="Lo que se respeta siempre">
          <NeverOpened optOutCount={optOutCount} />
          <NumberHealth whatsapp={whatsapp} />
          <section className="border-border bg-card rounded-3xl border p-5">
            <h3 className="text-muted-foreground text-xs">Cada contacto guarda</h3>
            <p className="mt-2 text-sm text-pretty">
              Con qué derecho lo tienes (escribió él, consentimiento, referido o dato público),
              cuándo y por dónde dio su consentimiento, y qué canales permite. Dar su número o
              escribir por cualquier canal cuenta como consentimiento para todos; darse de baja de
              uno no apaga los demás.
            </p>
          </section>
        </aside>
      </div>

      {canManage && summary !== null && (
        <Island
          as="footer"
          material="ink"
          role="region"
          aria-label="Cambios sin guardar"
          className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-3 sm:rounded-full sm:py-2.5 sm:pr-2.5"
        >
          <p className="min-w-0 text-sm text-pretty">
            <span className="font-semibold">{summary.title}</span>
            {summary.detail !== undefined && <span className="text-muted-foreground"> · {summary.detail}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="glass" disabled={saving} onClick={() => setDraft(view.policy)}>
              Descartar
            </Button>
            <Button variant="contrast" className="rounded-full" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Guardando…" : "Guardar política"}
            </Button>
          </div>
        </Island>
      )}
    </div>
  );
}

// ── Canales ──────────────────────────────────────────────────────────────────

function ChannelGlyph({ channel }: { channel: OutreachChannelKey }) {
  const box = "bg-muted text-foreground flex size-8 shrink-0 items-center justify-center rounded-[10px]";
  if (channel === "whatsapp_cloud" || channel === "instagram_dm" || channel === "facebook_messenger") {
    return (
      <span aria-hidden="true" className={box}>
        <ChannelKindIcon kind={channel} className="size-4" />
      </span>
    );
  }
  const Icon = channel === "email" ? Mail : channel === "call" ? Phone : MessageSquareText;
  return (
    <span aria-hidden="true" className={box}>
      <Icon className="size-4" />
    </span>
  );
}

function ChannelRow({
  meta,
  policy,
  whatsapp,
  disabled,
  onChange,
}: {
  meta: OutreachChannelMeta;
  policy: OutreachPolicy["channels"][OutreachChannelKey];
  whatsapp: ChannelDTO[] | null | "error";
  disabled: boolean;
  onChange: (patch: Partial<OutreachPolicy["channels"][OutreachChannelKey]>) => void;
}) {
  const highRisk = isHighRisk(meta, policy);
  const quality = whatsapp !== null && whatsapp !== "error" ? worstQuality(whatsapp) : null;
  return (
    <li
      className={cn(
        "border-border grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 border-t px-5 py-4 sm:px-6",
        "@2xl:grid-cols-[2rem_minmax(0,1fr)_auto_auto] @2xl:items-center",
        !policy.enabled && "[&_.op-desc]:opacity-70",
      )}
    >
      <ChannelGlyph channel={meta.key} />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium">{meta.label}</span>
        <span className="op-desc text-muted-foreground text-xs text-pretty">{meta.description}</span>
        {(highRisk || quality !== null) && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {highRisk && <StatePill tone="warning">Riesgo alto para tu número</StatePill>}
            {quality !== null && (
              <StatePill tone={pillTone(quality)}>Calidad hoy: {quality.label.toLowerCase()}</StatePill>
            )}
          </span>
        )}
      </div>
      <div className="col-span-2 col-start-2 row-start-2 min-w-0 @2xl:col-span-1 @2xl:col-start-3 @2xl:row-start-1">
        {meta.choice.kind === "mode" ? (
          <SegmentedControl
            label={`Modo de ${meta.label}`}
            size="sm"
            surface="inline"
            value={policy.mode === "any_lead" ? "any_lead" : "opt_in_only"}
            items={MODE_OPTIONS.map((option) => ({
              ...option,
              disabled: disabled || !policy.enabled,
            }))}
            onValueChange={(mode) => onChange({ mode })}
          />
        ) : (
          <StatePill tone="neutral">{meta.choice.label}</StatePill>
        )}
      </div>
      <Switch
        className="col-start-3 row-start-1 mt-1 @2xl:col-start-4 @2xl:mt-0"
        checked={policy.enabled}
        disabled={disabled}
        aria-label={`${meta.label}: ${policy.enabled ? "activo" : "apagado"}`}
        onCheckedChange={(enabled) => onChange({ enabled })}
      />
    </li>
  );
}

const QUALITY_ORDER: Record<HealthReading["tone"], number> = { bad: 0, warning: 1, neutral: 2, good: 3 };

/** Con varios números, manda el peor: es el que Meta va a castigar primero. */
function worstQuality(channels: readonly ChannelDTO[]): HealthReading | null {
  const readings = channels.map((channel) => readQualityRating(channel.quality_rating));
  if (readings.length === 0) return null;
  return readings.reduce((worst, next) => (QUALITY_ORDER[next.tone] < QUALITY_ORDER[worst.tone] ? next : worst));
}

function pillTone(reading: HealthReading): StatePillTone {
  return reading.tone === "good"
    ? "success"
    : reading.tone === "warning"
      ? "warning"
      : reading.tone === "bad"
        ? "destructive"
        : "neutral";
}

// ── Horario ──────────────────────────────────────────────────────────────────

function HoursCard({
  hours,
  floor,
  errors,
  disabled,
  onChange,
}: {
  hours: OutreachPolicy["hours"];
  floor: PolicyView["floor"];
  errors: HoursErrors;
  disabled: boolean;
  onChange: (patch: Partial<OutreachPolicy["hours"]>) => void;
}) {
  const satFloor = floor.saturday;
  const floorText = `lunes a viernes de ${formatHour(floor.weekdays.start)} a ${formatHour(floor.weekdays.end)}${
    satFloor === null ? "" : `, sábados de ${formatHour(satFloor.start)} a ${formatHour(satFloor.end)}`
  }, nunca domingos ni festivos de Colombia, un toque por canal y contacto al día`;
  const ok = Object.keys(errors).length === 0;
  return (
    <section aria-labelledby="op-hours" className="border-border bg-card @container rounded-3xl border p-5 sm:p-6">
      <header className="mb-4 flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h3 id="op-hours" className="font-heading text-lg font-bold tracking-tight">
            Horario y ritmo
          </h3>
          <StatePill tone={ok ? "success" : "warning"}>{ok ? "Dentro del criterio" : "Fuera del criterio"}</StatePill>
        </div>
        <p className="text-muted-foreground text-sm text-pretty">
          Criterio prudente adoptado sobre la Ley 2300 de 2023: {floorText}. Se aplica a todo envío
          comercial, también B2B (pendiente de validación jurídica). Puedes estrecharlo, no abrirlo más.
        </p>
      </header>

      <div className="grid gap-3.5 @lg:grid-cols-2 @4xl:grid-cols-3">
        <RangeField
          id="op-weekdays"
          label="Lunes a viernes"
          value={hours.weekdays}
          error={errors.weekdays}
          disabled={disabled}
          onChange={(weekdays) => onChange({ weekdays })}
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span id="op-saturday-label" className="text-muted-foreground text-xs font-medium">
              Sábado
            </span>
            <Switch
              size="default"
              checked={hours.saturday !== null}
              disabled={disabled || satFloor === null}
              aria-label={`Enviar los sábados: ${hours.saturday !== null ? "sí" : "no"}`}
              onCheckedChange={(on) => onChange({ saturday: on ? satFloor : null })}
            />
          </div>
          {hours.saturday === null ? (
            <p className="border-input text-muted-foreground flex h-9 items-center rounded-md border px-2.5 text-sm">
              Sin envíos
            </p>
          ) : (
            <TimeRangeInputs
              id="op-saturday"
              labelledBy="op-saturday-label"
              value={hours.saturday}
              invalid={errors.saturday !== undefined}
              disabled={disabled}
              onChange={(saturday) => onChange({ saturday })}
            />
          )}
          {errors.saturday && <p className="text-destructive text-xs">{errors.saturday}</p>}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">Domingos y festivos</span>
          <p className="border-input text-muted-foreground flex h-9 items-center rounded-md border px-2.5 text-sm">
            Sin envíos
          </p>
        </div>
      </div>
    </section>
  );
}

function RangeField({
  id,
  label,
  value,
  error,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: OutreachTimeRange;
  error?: string;
  disabled: boolean;
  onChange: (value: OutreachTimeRange) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={`${id}-label`} className="text-muted-foreground text-xs font-medium">
        {label}
      </span>
      <TimeRangeInputs
        id={id}
        labelledBy={`${id}-label`}
        value={value}
        invalid={error !== undefined}
        disabled={disabled}
        onChange={onChange}
      />
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

function TimeRangeInputs({
  id,
  labelledBy,
  value,
  invalid,
  disabled,
  onChange,
}: {
  id: string;
  labelledBy: string;
  value: OutreachTimeRange;
  invalid: boolean;
  disabled: boolean;
  onChange: (value: OutreachTimeRange) => void;
}) {
  const input = cn(
    "h-9 min-w-[7.5rem] flex-1 rounded-md border bg-background px-2 text-sm tabular-nums focus:outline-none focus:ring-3 focus:ring-primary/20 disabled:opacity-60",
    invalid ? "border-destructive" : "border-input focus:border-primary",
  );
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex min-w-0 items-center gap-1.5">
      <input
        id={`${id}-start`}
        type="time"
        step={900}
        aria-label="Desde"
        value={value.start}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(e) => onChange({ ...value, start: e.target.value })}
        className={input}
      />
      <span aria-hidden="true" className="text-muted-foreground text-sm">
        –
      </span>
      <input
        id={`${id}-end`}
        type="time"
        step={900}
        aria-label="Hasta"
        value={value.end}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(e) => onChange({ ...value, end: e.target.value })}
        className={input}
      />
    </div>
  );
}

// ── Lo que se respeta siempre ────────────────────────────────────────────────

function NeverOpened({ optOutCount }: { optOutCount: number | null | "error" }) {
  const count =
    optOutCount === "error"
      ? "no pudimos contarlas ahora"
      : optOutCount === null
        ? "contando…"
        : `${optOutCount.toLocaleString("es-CO")} ${optOutCount === 1 ? "contacto pidió" : "contactos pidieron"} no recibir más`;
  const rows: { title: string; detail: string }[] = [
    { title: "Bajas", detail: `${count}; de todo o de un canal` },
    { title: "Lista de supresión", detail: "teléfonos, correos y dominios que bloqueaste en captación" },
    { title: "Solicitudes de habeas data", detail: "Ley 1581: quien lo pide no vuelve a recibir nada" },
    {
      title: "Registro de excluidos (RNE)",
      detail: "la CRC aún no publica cómo consultarlo; en cuanto lo haga, se revisa antes de llamar o enviar SMS",
    },
  ];
  return (
    <section className="border-border bg-card rounded-3xl border p-5" aria-labelledby="op-never">
      <h3 id="op-never" className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span>Lo que nunca se abre</span>
        <Lock aria-hidden="true" className="size-3.5" />
      </h3>
      <ul className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <li key={row.title} className="flex gap-2.5 text-sm">
            <span aria-hidden="true" className="bg-destructive mt-[7px] size-1.5 shrink-0 rounded-full" />
            <span className="min-w-0 text-pretty">
              <span className="font-medium">{row.title}</span>
              <span className="text-muted-foreground"> · {row.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground mt-3 text-xs">Estas reglas no tienen interruptor.</p>
    </section>
  );
}

function NumberHealth({ whatsapp }: { whatsapp: ChannelDTO[] | null | "error" }) {
  return (
    <section className="border-border bg-card rounded-3xl border p-5" aria-labelledby="op-health">
      <h3 id="op-health" className="text-muted-foreground text-xs">
        Salud de tus números de WhatsApp
      </h3>
      {whatsapp === null ? (
        <p className="text-muted-foreground mt-2 text-sm">Leyendo la calidad…</p>
      ) : whatsapp === "error" ? (
        <p className="mt-2 text-sm">No pudimos leer tus canales ahora. La política se aplica igual.</p>
      ) : whatsapp.length === 0 ? (
        <p className="mt-2 text-sm text-pretty">
          Aún no tienes un WhatsApp conectado: las plantillas no salen hasta que lo conectes.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {whatsapp.map((channel) => {
            const reading = readQualityRating(channel.quality_rating);
            return (
              <li key={channel.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate" title={channel.name}>
                  {channel.name}
                </span>
                <StatePill tone={pillTone(reading)}>{reading.label}</StatePill>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-muted-foreground mt-3 text-xs text-pretty">
        La califica Meta según cómo reaccionan quienes reciben tus mensajes: los bloqueos y los
        reportes la bajan.
      </p>
    </section>
  );
}
