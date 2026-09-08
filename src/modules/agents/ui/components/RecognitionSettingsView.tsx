"use client"

import { useCallback, useEffect, useState } from "react"
import { LoaderCircle, RefreshCw, TriangleAlert } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Switch } from "@/shared/components/ui/switch"
import {
  indexComplete,
  pendingImages,
  pendingProducts,
  type RecognitionIndexStatusDTO,
  type RecognitionSettingsDTO,
} from "@/modules/agents/domain/recognition"
import {
  getRecognitionIndexStatus,
  getRecognitionSettings,
  getRecognitionUsage,
  requestRecognitionReindex,
  updateRecognitionSettings,
  type RecognitionUsage,
} from "@/modules/agents/infrastructure/services/recognition-service.adapter"

/**
 * Configuración → Reconocimiento de producto: el opt-in de empresa, el consumo
 * del ciclo y el estado del índice del catálogo. Calco de VoiceSettingsView:
 * es una capacidad de pago y cada estado (apagada, cuota agotada, índice
 * incompleto) se EXPLICA en el punto de uso, jamás se oculta un control.
 */
export function RecognitionSettingsView() {
  const { showAlert } = useAlert()
  const [settings, setSettings] = useState<RecognitionSettingsDTO | null>(null)
  const [usage, setUsage] = useState<RecognitionUsage | null>(null)
  const [index, setIndex] = useState<RecognitionIndexStatusDTO | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingSwitch, setSavingSwitch] = useState(false)
  const [reindexing, setReindexing] = useState(false)

  const load = useCallback(() => {
    getRecognitionSettings()
      .then(setSettings)
      .catch((err) =>
        setLoadError(errorMessage(err, "No se pudo cargar la configuración del reconocimiento")),
      )
    void getRecognitionUsage().then(setUsage)
    getRecognitionIndexStatus()
      .then(setIndex)
      .catch(() => setIndex(null))
  }, [])

  useEffect(load, [load])

  async function toggle(aiEnabled: boolean) {
    if (settings === null || savingSwitch) return
    const previous = settings
    setSettings({ ai_enabled: aiEnabled })
    setSavingSwitch(true)
    try {
      await updateRecognitionSettings({ ai_enabled: aiEnabled })
      showAlert({
        tone: "success",
        title: aiEnabled ? "Reconocimiento activado" : "Reconocimiento desactivado",
        description: aiEnabled
          ? "Desde la próxima foto, el agente reconoce el producto y lo cotiza."
          : "Las fotos siguen llegando al inbox; el agente pide la referencia por texto.",
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

  async function reindex() {
    if (reindexing) return
    setReindexing(true)
    try {
      await requestRecognitionReindex()
      showAlert({
        tone: "success",
        title: "Indexación en marcha",
        description: "Solo se procesa lo que cambió. En unos segundos verás las cifras al día.",
        open: true,
        autoCloseMs: 3000,
      })
      // El índice avanza en segundo plano: una relectura corta basta para el caso normal
      window.setTimeout(() => void getRecognitionIndexStatus().then(setIndex).catch(() => undefined), 4000)
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo iniciar la indexación",
        description: errorMessage(err),
        open: true,
      })
    } finally {
      setReindexing(false)
    }
  }

  if (loadError !== null) {
    return <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{loadError}</p>
  }

  if (settings === null) {
    return (
      <div className="space-y-4" role="status" aria-label="Cargando configuración del reconocimiento">
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
        <h1 className="text-3xl font-semibold tracking-tight">Reconocimiento de producto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando un cliente envía una foto, una captura o comparte una publicación de Instagram, el
          agente reconoce qué producto es y lo cotiza.
        </p>
      </div>

      <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Reconocer productos en las fotos que envían tus clientes</h2>
              <Badge
                variant="outline"
                className={cn(
                  settings.ai_enabled && !quotaExhausted
                    ? "border-accent-violet/40 bg-accent-violet/10 text-accent-violet"
                    : "text-muted-foreground",
                )}
              >
                {settings.ai_enabled ? (quotaExhausted ? "En pausa" : "Activo") : "Desactivado"}
              </Badge>
            </div>
            <p className="mt-1 max-w-prose text-xs text-muted-foreground">
              Cada foto analizada consume{" "}
              <span className="font-medium text-foreground">un reconocimiento</span> de tu plan. Con
              confianza alta el agente cotiza directo; si duda, muestra hasta tres opciones con foto y
              deja que el cliente elija. Sin coincidencias, pide la referencia.
            </p>
          </div>
          <Switch
            checked={settings.ai_enabled}
            onCheckedChange={(value) => void toggle(value)}
            disabled={savingSwitch}
            aria-label="Activar reconocimiento de producto para la empresa"
          />
        </div>

        {usage !== null && usage.limit !== null && (
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Reconocimientos de este ciclo</span>
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
                aria-label="Consumo de reconocimientos"
                aria-valuenow={Math.round(pctUsed)}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {quotaExhausted
                ? "Cuota agotada: las fotos entran al inbox como siempre y el agente pide la referencia por texto hasta el nuevo ciclo."
                : "Un reconocimiento por foto analizada · el límite lo define tu plan."}
            </p>
          </div>
        )}

        {settings.ai_enabled && quotaExhausted && (
          <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              <span className="font-medium">Cuota de reconocimientos agotada.</span> Puedes ampliarla
              con un bloque de 100 desde Facturación; se reactiva sola al iniciar el nuevo ciclo.
            </span>
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
        <div>
          <h2 className="text-sm font-semibold">Índice del catálogo</h2>
          <p className="mt-1 max-w-prose text-xs text-muted-foreground">
            Para reconocer una foto, tus productos y sus fotos tienen que estar indexados. Se hace solo
            cada vez que guardas un producto o subes una foto; aquí puedes forzarlo.
          </p>
        </div>

        {index === null ? (
          <p className="text-xs text-muted-foreground">El estado del índice no está disponible ahora.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <IndexStat
              label="Productos indexados"
              value={index.products_indexed}
              total={index.products}
              note={
                pendingProducts(index) === 0
                  ? "Todo al día"
                  : `${pendingProducts(index).toLocaleString("es-CO")} pendientes · se completan en segundos`
              }
            />
            <IndexStat
              label="Fotos indexadas"
              value={index.images_indexed}
              total={index.images}
              note={
                index.products_without_photo > 0
                  ? `${index.products_without_photo.toLocaleString("es-CO")} productos sin foto: solo se reconocen por texto`
                  : pendingImages(index) === 0
                    ? "Todo al día"
                    : `${pendingImages(index).toLocaleString("es-CO")} pendientes`
              }
            />
            <Button variant="outline" onClick={() => void reindex()} disabled={reindexing || !index.enabled}>
              {reindexing ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              Indexar ahora
            </Button>
          </div>
        )}

        {index !== null && !index.enabled && (
          <p className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden />
            <span>
              <span className="font-medium">El reconocimiento por imagen no está disponible en la plataforma.</span>{" "}
              Las fotos se reconocen solo por su descripción hasta que se habilite.
            </span>
          </p>
        )}

        {index !== null && index.enabled && indexComplete(index) && index.products > 0 && (
          <p className="text-xs text-muted-foreground">Índice completo: cada producto y cada foto tienen su huella.</p>
        )}

        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <HowItem title="Foto directa" text="WhatsApp, Instagram y Messenger." />
          <HowItem title="Captura de pantalla" text="De un video o de una publicación." />
          <HowItem title="Publicación compartida" text="Posts y menciones de historia en Instagram." />
        </div>
      </section>
    </div>
  )
}

function IndexStat({
  label,
  value,
  total,
  note,
}: {
  label: string
  value: number
  total: number
  note: string
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold tracking-tight tabular-nums">
        {value.toLocaleString("es-CO")}{" "}
        <span className="text-sm font-normal text-muted-foreground">/ {total.toLocaleString("es-CO")}</span>
      </span>
      <span className="text-xs text-muted-foreground">{note}</span>
    </div>
  )
}

function HowItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg bg-secondary p-3">
      <span className="block font-semibold text-foreground">{title}</span>
      <span className="text-muted-foreground">{text}</span>
    </div>
  )
}
