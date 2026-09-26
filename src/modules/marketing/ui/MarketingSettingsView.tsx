"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/core/lib/error-messages";
import { cn } from "@/core/lib/utils";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { FormSkeleton } from "@/shared/components/features/loading";
import { OptionsInput } from "@/shared/components/features/options-input";
import { Island } from "@/shared/components/features/island";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { LoadError } from "@/modules/marketing/ui/components/premium";
import {
  normalizeKeywords,
  SETTINGS_LIMITS,
  validateMarketingSettings,
  wwebHoursToDailyCap,
  wwebMessagesPerHour,
  type MarketingSettings,
  type SettingsErrors,
} from "@/modules/marketing/domain/settings";
import {
  getMarketingSettings,
  putMarketingSettings,
} from "@/modules/marketing/infrastructure/services/settings-service.adapter";

/**
 * Ajustes del módulo.
 *
 * El PUT exige la sección COMPLETA, así que el formulario parte SIEMPRE de lo
 * que devuelve el GET y reenvía todo: mandar un parche borraría las claves que
 * no viajen. Por eso, si el GET falla, no se ofrece guardar — escribir sobre
 * unos defaults inventados pisaría la configuración real del tenant.
 */
export function MarketingSettingsView() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("marketing:manage");
  const { showAlert } = useAlert();

  const [settings, setSettings] = useState<MarketingSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      setSettings(await getMarketingSettings());
      setLoadError(null);
      setDirty(false);
    } catch (err) {
      setLoadError(errorMessage(err, "No pudimos cargar tu configuración"));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(next: Partial<MarketingSettings>) {
    setSettings((prev) => (prev ? { ...prev, ...next } : prev));
    setDirty(true);
  }

  async function handleSave() {
    if (!settings) return;
    const normalized: MarketingSettings = {
      ...settings,
      opt_out: {
        ...settings.opt_out,
        keywords: normalizeKeywords(settings.opt_out.keywords),
        confirmation_body: settings.opt_out.confirmation_body.trim(),
      },
    };
    const found = validateMarketingSettings(normalized);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      showAlert({ tone: "error", title: "Revisa los campos marcados" });
      return;
    }
    setSaving(true);
    try {
      setSettings(await putMarketingSettings(normalized));
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

  if (loadError !== null) {
    return <LoadError message={loadError} onRetry={load} />;
  }

  if (settings === null) return <FormSkeleton fields={6} />;

  const perHour = wwebMessagesPerHour(settings.wweb);
  const hoursToCap = wwebHoursToDailyCap(settings.wweb);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Card title="Cada cuánto puedes escribirle a alguien">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            id="s-cooldown"
            label="Horas entre mensajes al mismo contacto"
            value={settings.cooldown_hours}
            error={errors.cooldown_hours}
            limits={SETTINGS_LIMITS.cooldown_hours}
            disabled={!canManage}
            onChange={(v) => patch({ cooldown_hours: v })}
          />
          <NumberField
            id="s-cap"
            label="Máximo de mensajes por contacto al día"
            value={settings.daily_cap_per_contact}
            error={errors.daily_cap_per_contact}
            limits={SETTINGS_LIMITS.daily_cap_per_contact}
            disabled={!canManage}
            onChange={(v) => patch({ daily_cap_per_contact: v })}
          />
          <NumberField
            id="s-attrib"
            label="Ventana de atribución de campañas (horas)"
            value={settings.attribution_window_hours}
            error={errors.attribution_window_hours}
            limits={SETTINGS_LIMITS.attribution_window_hours}
            disabled={!canManage}
            onChange={(v) => patch({ attribution_window_hours: v })}
          />
        </div>

        <div className="border-border mt-4 flex max-w-2xl items-center justify-between gap-4 rounded-2xl border px-4 py-3">
          <label htmlFor="s-human" className="min-w-0">
            <span className="block text-sm font-medium">No interrumpir conversaciones que atiende un asesor</span>
            <span className="text-muted-foreground mt-0.5 block text-xs text-pretty">
              Si alguien de tu equipo está respondiendo, ninguna regla se mete en medio.
            </span>
          </label>
          <Switch
            id="s-human"
            checked={settings.exclude_human_active}
            disabled={!canManage}
            onCheckedChange={(checked) => patch({ exclude_human_active: checked })}
          />
        </div>
      </Card>

      <Card title="Bajas automáticas">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Palabras que dan de baja
          </span>
          <OptionsInput
            value={settings.opt_out.keywords}
            max={SETTINGS_LIMITS.keywords.max}
            maxLength={SETTINGS_LIMITS.keywords.maxLength}
            disabled={!canManage}
            ariaLabel="Nueva palabra de baja"
            onChange={(keywords) =>
              patch({ opt_out: { ...settings.opt_out, keywords } })
            }
          />
          {errors.keywords ? (
            <p className="text-xs text-destructive">{errors.keywords}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Hasta {SETTINGS_LIMITS.keywords.max} palabras. Si el cliente escribe cualquiera de
              ellas, deja de recibir promociones al instante.
            </p>
          )}
        </div>

        <div className="mt-3.5 flex flex-col gap-1.5">
          <label htmlFor="s-confirm" className="text-xs font-medium text-muted-foreground">
            Mensaje de confirmación
          </label>
          <textarea
            id="s-confirm"
            rows={2}
            value={settings.opt_out.confirmation_body}
            disabled={!canManage}
            maxLength={SETTINGS_LIMITS.confirmation_body.maxLength}
            aria-invalid={Boolean(errors.confirmation_body)}
            onChange={(e) =>
              patch({ opt_out: { ...settings.opt_out, confirmation_body: e.target.value } })
            }
            className={cn(
              "w-full resize-y rounded-md border bg-background px-2.5 py-2 text-sm leading-relaxed focus:outline-none focus:ring-3 focus:ring-primary/20",
              errors.confirmation_body ? "border-destructive" : "border-input focus:border-primary",
            )}
          />
          {errors.confirmation_body && (
            <p className="text-xs text-destructive">{errors.confirmation_body}</p>
          )}
        </div>
      </Card>

      <Card
        title="Protección de tu número de WhatsApp Web"
        description="Límites conservadores a propósito: protegen tu número de bloqueos de Meta. Súbelos solo si sabes lo que haces."
      >
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <NumberField
            id="s-wweb-cap"
            label="Máximo diario por canal"
            value={settings.wweb.daily_cap}
            error={errors.wweb_daily_cap}
            limits={SETTINGS_LIMITS.wweb.daily_cap}
            disabled={!canManage}
            onChange={(v) => patch({ wweb: { ...settings.wweb, daily_cap: v } })}
          />
          <NumberField
            id="s-wweb-interval"
            label="Segundos entre mensajes"
            value={settings.wweb.min_interval_seconds}
            error={errors.wweb_min_interval_seconds}
            limits={SETTINGS_LIMITS.wweb.min_interval_seconds}
            disabled={!canManage}
            onChange={(v) => patch({ wweb: { ...settings.wweb, min_interval_seconds: v } })}
          />
          <NumberField
            id="s-wweb-jitter"
            label="Aleatoriedad del intervalo (%)"
            value={settings.wweb.jitter_pct}
            error={errors.wweb_jitter_pct}
            limits={SETTINGS_LIMITS.wweb.jitter_pct}
            disabled={!canManage}
            onChange={(v) => patch({ wweb: { ...settings.wweb, jitter_pct: v } })}
          />
        </div>

        {/* Traduce tres números abstractos a lo que significan de verdad. */}
        <p className="text-muted-foreground mt-4 text-xs text-pretty">
          <span className="tabular-nums">
            A este ritmo saldrán unos <strong className="text-foreground">{perHour} mensajes por
            hora</strong> por canal, así que agotar el cupo diario de{" "}
            {settings.wweb.daily_cap.toLocaleString("es-CO")} llevará cerca de {hoursToCap} horas.
          </span>
        </p>
      </Card>

      {/* Guardar en una barra de tinta pegada abajo (§9.5.1), solo cuando hay algo que guardar. */}
      {canManage && dirty && (
        <Island
          as="footer"
          material="ink"
          role="region"
          aria-label="Cambios sin guardar"
          className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl px-5 py-3 sm:rounded-full sm:py-2.5 sm:pr-2.5"
        >
          <p className="text-sm">
            <span className="font-semibold">Tienes cambios sin guardar</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="glass" disabled={saving} onClick={() => void load()}>
              Descartar
            </Button>
            <Button variant="contrast" className="rounded-full" disabled={saving} onClick={() => void handleSave()}>
              {saving ? "Guardando…" : "Guardar configuración"}
            </Button>
          </div>
        </Island>
      )}
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border bg-card min-w-0 rounded-3xl border p-5 sm:p-6">
      <header className="mb-4 flex flex-col gap-1">
        <h2 className="font-heading text-lg font-bold tracking-tight">{title}</h2>
        {description ? <p className="text-muted-foreground text-sm text-pretty">{description}</p> : null}
      </header>
      {children}
    </section>
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
          "h-9 w-full rounded-md border bg-background px-2.5 text-sm tabular-nums focus:outline-none focus:ring-3 focus:ring-primary/20 disabled:opacity-60",
          error ? "border-destructive" : "border-input focus:border-primary",
        )}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
