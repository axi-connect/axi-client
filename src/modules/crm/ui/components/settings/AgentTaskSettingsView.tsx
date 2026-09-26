"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Info, PauseCircle, Power, Sparkles } from "lucide-react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { FormSkeleton } from "@/shared/components/features/loading";
import { Button } from "@/shared/components/ui/button";
import { InkIsland, Kicker } from "@/shared/components/features/bento";
import { UnsavedChangesDock } from "@/shared/components/features/island";
import { formatHour } from "@/modules/cmo/domain/proposal-labels";
import {
  AGENT_TASK_LIMITS,
  agentDaySentence,
  describeQuietHours,
  isQuietHour,
  validateAgentTaskSettings,
  type AgentTaskSettings,
  type AgentTaskSettingsErrors,
} from "@/modules/crm/domain/agent-task-settings";
import {
  getAgentTaskSettings,
  putAgentTaskSettings,
} from "@/modules/crm/infrastructure/services/agent-task-settings-service.adapter";

const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

/**
 * Política del motor de tareas de agente.
 *
 * El PUT manda la sección COMPLETA, así que el formulario parte SIEMPRE de lo
 * que devuelve el GET y reenvía todo. Si el GET falla no se ofrece guardar:
 * escribir sobre defaults inventados pisaría la configuración real del tenant.
 *
 * El interruptor de apagado NO es un campo más del formulario (ver más abajo):
 * guarda solo y al instante, porque es lo que se usa en una incidencia.
 */
export function AgentTaskSettingsView() {
  const { hasPermission } = useAuth();
  const canAutomate = hasPermission("crm:automate");
  const { showAlert, showModal, closeModal } = useAlert();

  const [settings, setSettings] = useState<AgentTaskSettings | null>(null);
  /** Lo último GUARDADO. El interruptor escribe sobre esto, nunca sobre el borrador. */
  const [saved, setSaved] = useState<AgentTaskSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<AgentTaskSettingsErrors>({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const fresh = await getAgentTaskSettings();
      setSettings(fresh);
      setSaved(fresh);
      setLoadError(null);
      setDirty(false);
    } catch (err) {
      setLoadError(errorMessage(err, "No pudimos cargar la configuración"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(next: Partial<AgentTaskSettings>) {
    setSettings((prev) => (prev === null ? prev : { ...prev, ...next }));
    setDirty(true);
  }

  async function handleSave() {
    if (settings === null) return;
    const found = validateAgentTaskSettings(settings);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showAlert({ tone: "error", title: "Revisa los campos marcados" });
      return;
    }
    setSaving(true);
    try {
      const fresh = await putAgentTaskSettings(settings);
      setSettings(fresh);
      setSaved(fresh);
      setDirty(false);
      showAlert({ tone: "success", title: "Configuración guardada" });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo guardar la configuración"),
      });
    } finally {
      setSaving(false);
    }
  }

  /**
   * El interruptor escribe sobre los últimos valores GUARDADOS, no sobre el
   * borrador en pantalla: si no, el clic de emergencia comitearía de paso unos
   * números a medio teclear. El borrador se conserva y se avisa.
   */
  async function toggleEnabled(next: boolean) {
    if (saved === null) return;
    setToggling(true);
    try {
      const fresh = await putAgentTaskSettings({ ...saved, enabled: next });
      setSaved(fresh);
      setSettings((prev) => (prev === null ? fresh : { ...prev, enabled: fresh.enabled }));
      showAlert({
        tone: "success",
        title: next
          ? "El agente vuelve a ejecutar las tareas programadas"
          : dirty
            ? "Se apagó. Tus cambios sin guardar siguen en pantalla."
            : "Se apagó: el agente no ejecutará ninguna tarea",
      });
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo cambiar el interruptor"),
      });
    } finally {
      setToggling(false);
    }
  }

  function confirmEnable() {
    showModal({
      title: "¿Reactivar las tareas de agente?",
      description:
        "Las tareas vencidas volverán a ejecutarse y el agente escribirá a tus clientes.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true },
        {
          label: "Reactivar",
          variant: "default",
          onClick: () => {
            closeModal();
            void toggleEnabled(true);
          },
        },
      ],
    });
  }

  if (loadError !== null) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-destructive/35 bg-destructive/5 px-5 py-4">
        <p className="flex-1 text-sm text-muted-foreground">{loadError}</p>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (settings === null) return <FormSkeleton fields={7} />;

  const quiet = describeQuietHours(settings.quiet_start_hour, settings.quiet_end_hour);

  return (
    <form
      className="@container flex min-w-0 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSave();
      }}
      onReset={(event) => {
        // Descartar vuelve a lo último guardado, sin otro viaje al servidor.
        event.preventDefault();
        if (saved !== null) setSettings(saved);
        setErrors({});
        setDirty(false);
      }}
    >
      <div className="grid min-w-0 gap-4 @min-[52rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Interruptor: sección propia y no un campo del formulario. Un switch
            perdido entre seis inputs se lee como "una preferencia más". */}
        <section
          className={cn(
            "flex min-w-0 flex-col justify-center gap-3 rounded-3xl border px-5 py-5",
            settings.enabled ? "border-border bg-card" : "border-accent-amber/30 bg-accent-amber/[0.07]",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="flex items-center gap-2 font-heading text-lg font-bold">
                {settings.enabled ? (
                  <Sparkles aria-hidden className="size-4 shrink-0 text-accent-violet" />
                ) : (
                  <PauseCircle aria-hidden className="size-4 shrink-0 text-accent-amber" />
                )}
                {settings.enabled ? "Las tareas de agente están activas" : "Tareas de agente apagadas"}
              </h2>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                {settings.enabled
                  ? "El agente ejecuta los seguimientos programados y le escribe a tus clientes."
                  : "Las tareas programadas no se ejecutan (quedan en espera y se reanudan al encender) y nadie puede crear tareas nuevas."}
              </p>
              {!settings.enabled && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No detiene un mensaje que ya se esté enviando.
                </p>
              )}
            </div>
            {canAutomate && (
              <Button
                type="button"
                variant={settings.enabled ? "outline" : "default"}
                className="rounded-full"
                disabled={toggling}
                onClick={() => (settings.enabled ? void toggleEnabled(false) : confirmEnable())}
              >
                <Power className="size-4" aria-hidden />
                {settings.enabled ? "Apagar" : "Encender"}
              </Button>
            )}
          </div>
        </section>

        <InkIsland label="El día del agente" className="gap-3 p-5">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <Kicker>El día del agente</Kicker>
            <span className="text-xs whitespace-nowrap text-muted-foreground">hora local del negocio</span>
          </div>
          <p className="font-heading text-xl leading-tight font-bold text-pretty">{agentDaySentence(settings)}</p>
          {/* Tira 0→23: el silencio rayado, el trabajo en violeta. Un rango que
              cruza medianoche se ve en los dos extremos: la FORMA dice el
              wrap sin una palabra. La frase es la fuente accesible. */}
          <div>
            <div aria-hidden className="grid h-6 grid-cols-24 gap-0.5">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className={cn(
                    "rounded-[4px]",
                    isQuietHour(hour, settings.quiet_start_hour, settings.quiet_end_hour)
                      ? "bg-[repeating-linear-gradient(135deg,color-mix(in_srgb,var(--foreground)_14%,transparent)_0_3px,transparent_3px_6px)] ring-1 ring-foreground/10 ring-inset"
                      : settings.enabled
                        ? "bg-accent-violet"
                        : "bg-foreground/20",
                  )}
                />
              ))}
            </div>
            <div aria-hidden className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>12 a.m.</span>
              <span>6 a.m.</span>
              <span>12 p.m.</span>
              <span>6 p.m.</span>
              <span>12 a.m.</span>
            </div>
          </div>
        </InkIsland>
      </div>

      <div className="grid min-w-0 gap-4 @min-[48rem]:grid-cols-2">
        <Card title="Horario silencioso">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">No escribir entre</span>
            <HourSelect
              id="qs-start"
              label="Hora de inicio del silencio"
              value={settings.quiet_start_hour}
              disabled={!canAutomate}
              onChange={(v) => patch({ quiet_start_hour: v })}
            />
            <span className="text-muted-foreground">y</span>
            <HourSelect
              id="qs-end"
              label="Hora de fin del silencio"
              value={settings.quiet_end_hour}
              disabled={!canAutomate}
              onChange={(v) => patch({ quiet_end_hour: v })}
            />
          </div>

          {/* La frase es la fuente accesible: dice "del día siguiente" cuando el
              rango cruza medianoche, y desmiente el falso "24 h" de start===end. */}
          <Hint>
            {quiet.text} Hora local de tu negocio (se cambia en el perfil de la empresa). Aplica a mensajes y
            llamadas.
          </Hint>
        </Card>

        <Card title="Cuánto puede trabajar al día">
          <div className="grid gap-3.5 @min-[28rem]/card:grid-cols-2">
            <NumberField
              id="at-daily-cap"
              label="Máximo de tareas ejecutadas por día"
              value={settings.daily_cap}
              error={errors.daily_cap}
              limits={AGENT_TASK_LIMITS.daily_cap}
              disabled={!canAutomate}
              onChange={(v) => patch({ daily_cap: v })}
            />
            <NumberField
              id="at-call-daily-cap"
              label="Máximo de llamadas por día"
              value={settings.call_daily_cap}
              error={errors.call_daily_cap}
              limits={AGENT_TASK_LIMITS.call_daily_cap}
              disabled={!canAutomate}
              onChange={(v) => patch({ call_daily_cap: v })}
            />
          </div>
          <Hint>
            Alcanzado un tope, el resto de tareas de ese medio quedan en espera y se reintentan mañana. No se
            pierden. Las llamadas tienen su propio cupo porque cada una cuesta lo que decenas de mensajes; su
            horario silencioso se ajusta en Llamadas.
          </Hint>
        </Card>

        <Card title="Cuando abre con una plantilla de Meta">
          <div className="grid gap-3.5 @min-[28rem]/card:grid-cols-2">
            <NumberField
              id="at-reply-wait"
              label="Horas esperando la respuesta"
              value={settings.reply_wait_hours}
              error={errors.reply_wait_hours}
              limits={AGENT_TASK_LIMITS.reply_wait_hours}
              disabled={!canAutomate}
              onChange={(v) => patch({ reply_wait_hours: v })}
            />
          </div>
          <Hint>
            <span className="tabular-nums">
              Si el contacto lleva más de 24 h sin escribir, el agente abre con la plantilla elegida y espera{" "}
              <strong className="text-foreground">{settings.reply_wait_hours} h</strong> a que responda. Si
              responde, retoma el objetivo en ese mismo chat; si no, la tarea cierra como{" "}
              <strong className="whitespace-nowrap text-foreground">«Enviado · sin respuesta»</strong>.{" "}
              <Link
                href="/marketing/settings/meta-templates"
                className="inline-flex min-h-6 items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
              >
                Gestionar plantillas <ArrowRight aria-hidden className="size-3" />
              </Link>
            </span>
          </Hint>
        </Card>

        <Card title="Cuánto insiste">
          <div className="grid gap-3.5 @min-[28rem]/card:grid-cols-2">
            <NumberField
              id="at-attempts"
              label="Intentos por tarea"
              value={settings.max_attempts}
              error={errors.max_attempts}
              limits={AGENT_TASK_LIMITS.max_attempts}
              disabled={!canAutomate}
              onChange={(v) => patch({ max_attempts: v })}
            />
            <NumberField
              id="at-defer"
              label="Horas máximas insistiendo"
              value={settings.max_defer_hours}
              error={errors.max_defer_hours}
              limits={AGENT_TASK_LIMITS.max_defer_hours}
              disabled={!canAutomate}
              onChange={(v) => patch({ max_defer_hours: v })}
            />
          </div>
          {/* Traduce dos números abstractos a lo que significan de verdad. */}
          <Hint>
            <span className="tabular-nums">
              Como mucho <strong className="text-foreground">{settings.max_attempts} intentos</strong>, y deja de
              intentarlo <strong className="text-foreground">{settings.max_defer_hours} h</strong> después del
              primero — lo que ocurra antes. Esperar por horario silencioso o por falta de cupo no gasta
              intentos. Las etapas con cadencia propia en Recorrido usan la suya.
            </span>
          </Hint>
        </Card>
      </div>

      {canAutomate && (
        <UnsavedChangesDock
          dirty={dirty}
          submitting={saving}
          invalid={false}
          detail="Se aplica a las próximas tareas que ejecute el agente."
          submitLabel="Guardar configuración"
        />
      )}
    </form>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 flex gap-2.5 text-xs text-pretty text-muted-foreground">
      <Info aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="@container/card flex min-w-0 flex-col rounded-3xl border border-border bg-card px-5 py-5">
      <h2 className="mb-3 font-heading text-base font-bold">{title}</h2>
      {children}
    </section>
  );
}

function HourSelect({
  id,
  label,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={String(value)}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-9 rounded-xl border border-input bg-background px-2.5 text-sm tabular-nums disabled:opacity-60"
    >
      {HOURS.map((hour) => (
        <option key={hour} value={hour}>
          {formatHour(hour)}
        </option>
      ))}
    </select>
  );
}

function NumberField({
  id,
  label,
  value,
  error,
  limits,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  error?: string;
  limits: { min: number; max: number };
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={limits.min}
        max={limits.max}
        value={String(value)}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={cn(
          "h-9 w-full rounded-xl border bg-background px-2.5 text-sm tabular-nums focus:outline-none focus:ring-3 focus:ring-primary/20 disabled:opacity-60",
          error ? "border-destructive" : "border-input focus:border-primary",
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
