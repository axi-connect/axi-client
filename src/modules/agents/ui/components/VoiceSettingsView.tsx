"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Check, LoaderCircle, TriangleAlert } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { errorMessage } from "@/core/lib/error-messages"
import { isHttpError } from "@/core/api/problem"
import { useAlert } from "@/core/providers/alert-provider"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Switch } from "@/shared/components/ui/switch"
import type { TtsCredentialStatusDTO, VoiceSettingsDTO } from "@/modules/agents/domain/voice"
import {
  deleteVoiceCredential,
  getVoiceCredential,
  getVoiceSettings,
  getVoiceUsage,
  updateVoiceSettings,
  upsertVoiceCredential,
  type VoiceUsage,
} from "@/modules/agents/infrastructure/services/voice-service.adapter"

/**
 * Configuración → Voz (§10.5 F2): el opt-in de empresa y la credencial BYOK.
 * La voz es una capacidad de pago: cada estado (apagada, cuota agotada, plan
 * sin BYOK) se EXPLICA en el punto de uso, jamás se oculta un control.
 */
export function VoiceSettingsView() {
  const { showAlert } = useAlert()
  const [settings, setSettings] = useState<VoiceSettingsDTO | null>(null)
  const [usage, setUsage] = useState<VoiceUsage | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingSwitch, setSavingSwitch] = useState(false)

  const load = useCallback(() => {
    getVoiceSettings()
      .then(setSettings)
      .catch((err) => setLoadError(errorMessage(err, "No se pudo cargar la configuración de voz")))
    void getVoiceUsage().then(setUsage)
  }, [])

  useEffect(load, [load])

  async function toggle(aiEnabled: boolean) {
    if (settings === null || savingSwitch) return
    const previous = settings
    setSettings({ ai_enabled: aiEnabled })
    setSavingSwitch(true)
    try {
      await updateVoiceSettings({ ai_enabled: aiEnabled })
      showAlert({
        tone: "success",
        title: aiEnabled ? "Notas de voz activadas" : "Notas de voz desactivadas",
        description: aiEnabled
          ? "Tus agentes con voz configurada responderán audios desde el próximo mensaje."
          : "Tus agentes seguirán atendiendo por texto.",
        open: true,
        autoCloseMs: 3000,
      })
    } catch (err) {
      setSettings(previous)
      showAlert({
        tone: "error",
        title: "No se pudo guardar el cambio",
        description: errorMessage(err),
        open: true,
      })
    } finally {
      setSavingSwitch(false)
    }
  }

  if (loadError !== null) {
    return <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{loadError}</p>
  }

  if (settings === null) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando configuración de voz">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    )
  }

  const pctUsed = usage?.limit?.pct_used ?? 0
  const quotaExhausted = usage?.limit !== null && usage !== null && pctUsed >= 100

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Voz del agente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tus agentes responden notas de voz con voz natural cuando el cliente les habla con audio.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Notas de voz de los agentes</h2>
              <Badge
                variant="outline"
                className={cn(
                  settings.ai_enabled && !quotaExhausted
                    ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
                    : "text-muted-foreground",
                )}
              >
                {settings.ai_enabled ? (quotaExhausted ? "Voz en pausa" : "Activa") : "Desactivada"}
              </Badge>
            </div>
            <p className="mt-1 max-w-prose text-xs text-muted-foreground">
              El agente responde con nota de voz{" "}
              <span className="font-medium text-foreground">
                solo cuando el cliente le habla con audio
              </span>{" "}
              (espejo). Cada nota consume caracteres de voz de tu plan. Luego elige la voz del
              character y activa la política del agente en{" "}
              <Link href="/admin/agents" className="font-medium text-brand underline-offset-2 hover:underline">
                Agentes IA
              </Link>
              .
            </p>
          </div>
          <Switch
            checked={settings.ai_enabled}
            onCheckedChange={(value) => void toggle(value)}
            disabled={savingSwitch}
            aria-label="Activar notas de voz para la empresa"
          />
        </div>

        {usage !== null && usage.limit !== null && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Caracteres de voz de este ciclo</span>
              <span className="tabular-nums">
                {usage.used.toLocaleString("es-CO")} / {usage.limit.value.toLocaleString("es-CO")}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-border bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  pctUsed >= 100 ? "bg-destructive" : pctUsed >= 80 ? "bg-warning" : "bg-accent-violet",
                )}
                style={{ width: `${String(Math.min(100, pctUsed))}%` }}
                role="progressbar"
                aria-label="Consumo de caracteres de voz"
                aria-valuenow={Math.round(pctUsed)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {quotaExhausted
                ? "Cuota agotada: el agente responde por texto hasta el nuevo ciclo."
                : "≈ 280 caracteres por nota · el límite lo define tu plan."}
            </p>
          </div>
        )}

        {settings.ai_enabled && quotaExhausted && (
          <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              <span className="font-medium">Cuota de voz del ciclo agotada.</span> Tus agentes siguen
              atendiendo por texto con total normalidad; la voz se reactiva sola al iniciar el nuevo
              ciclo.
            </span>
          </p>
        )}
      </section>

      <ByokCredentialCard onRemoved={() => void getVoiceUsage().then(setUsage)} />
    </div>
  )
}

/**
 * Credencial BYOK Enterprise: write-only (jamás se re-muestra), el input se
 * limpia tras guardar y el 403 de plan se presenta como upsell, no como error
 * técnico. Quitar la clave siempre está permitido: degrada a la cuenta de axi.
 */
function ByokCredentialCard({ onRemoved }: { onRemoved?: () => void }) {
  const { showAlert, showModal } = useAlert()
  const [status, setStatus] = useState<TtsCredentialStatusDTO | null>(null)
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const [upsellTier, setUpsellTier] = useState<string | null>(null)

  useEffect(() => {
    getVoiceCredential()
      .then(setStatus)
      .catch(() => setStatus(null))
  }, [])

  async function save() {
    if (apiKey.trim() === "" || saving) return
    setSaving(true)
    try {
      await upsertVoiceCredential(apiKey.trim())
      setApiKey("")
      setUpsellTier(null)
      setStatus({ configured: true, provider: "elevenlabs" })
      showAlert({
        tone: "success",
        title: "Clave guardada",
        description: "Tu consumo de voz ahora se factura con tu cuenta de ElevenLabs.",
        open: true,
        autoCloseMs: 3000,
      })
    } catch (err) {
      if (isHttpError(err) && err.code === "ai/tts_byok_requires_enterprise") {
        const tier = (err.problem as { current_tier?: string } | null)?.current_tier
        setUpsellTier(tier ?? "actual")
        return
      }
      showAlert({
        tone: "error",
        title: "No se pudo guardar la clave",
        description: errorMessage(err),
        open: true,
      })
    } finally {
      setSaving(false)
    }
  }

  function confirmRemove() {
    showModal({
      title: "Quitar la clave de ElevenLabs",
      description:
        "La voz volverá a operar con la cuenta de axi y tu consumo contará contra tu plan. Puedes registrar otra clave cuando quieras.",
      actions: [
        { label: "Cancelar", variant: "outline", asClose: true, id: "byok-remove-cancel" },
        {
          label: "Quitar clave",
          variant: "destructive",
          asClose: false,
          id: "byok-remove-confirm",
          onClick: () => {
            void deleteVoiceCredential()
              .then(() => {
                setStatus({ configured: false, provider: "elevenlabs" })
                onRemoved?.()
                showAlert({ tone: "success", title: "Clave retirada", open: true, autoCloseMs: 3000 })
              })
              .catch((err) =>
                showAlert({
                  tone: "error",
                  title: "No se pudo quitar la clave",
                  description: errorMessage(err),
                  open: true,
                }),
              )
          },
        },
      ],
      className: "sm:max-w-md",
    })
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold">Clave propia de ElevenLabs</h2>
          <Badge variant="outline" className="text-muted-foreground">
            Enterprise
          </Badge>
          {status?.configured === true && (
            <Badge
              variant="outline"
              className="border-success/40 bg-success/10 text-success"
            >
              <Check className="size-3" aria-hidden /> Configurada
            </Badge>
          )}
        </div>
        <p className="mt-1 max-w-prose text-xs text-muted-foreground">
          Factura tu consumo de voz directo con ElevenLabs y habilita voces clonadas de tu marca. La
          clave se guarda cifrada y nunca se vuelve a mostrar.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="password"
          autoComplete="off"
          placeholder="sk_…"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          className="max-w-xs"
          aria-label="Clave de API de ElevenLabs"
        />
        <Button onClick={() => void save()} disabled={saving || apiKey.trim() === ""}>
          {saving ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
          Guardar clave
        </Button>
        {status?.configured === true && (
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={confirmRemove}
          >
            Quitar clave
          </Button>
        )}
      </div>

      {upsellTier !== null && (
        <p className="flex items-start gap-2 rounded-md border border-accent-violet/25 bg-accent-violet/10 p-3 text-xs">
          <span aria-hidden>✦</span>
          <span>
            <span className="font-medium">Disponible en el plan Enterprise.</span> Tu plan{" "}
            <span className="font-medium">{upsellTier}</span> usa la cuenta de voz de axi.
            Escríbenos para subir de plan y traer tu propia clave.
          </span>
        </p>
      )}

      {status?.configured === true && (
        <p className="text-xs text-muted-foreground">
          Al quitar la clave, la voz vuelve a operar con la cuenta de axi.
        </p>
      )}
    </section>
  )
}
