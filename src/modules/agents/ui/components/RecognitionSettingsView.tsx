"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Camera,
  Check,
  Eye,
  Info,
  ListTree,
  LoaderCircle,
  Lock,
  Minus,
  Plus,
  RefreshCw,
  Share,
  Smartphone,
  Sparkles,
  Tags,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/core/lib/utils"
import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import {
  BentoFigure,
  BentoTile,
  InkIsland,
  Kicker,
  StatePill,
  type StatePillTone,
} from "@/shared/components/features/bento"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Switch } from "@/shared/components/ui/switch"
import {
  classificationPendingNote,
  classificationUncategorized,
  ENRICHMENT_VERTICAL_LABELS,
  enrichmentCapReached,
  enrichmentPendingNote,
  indexComplete,
  pendingImages,
  pendingProducts,
  taxonomyChangeNote,
  type ClassificationStatsDTO,
  type EnrichmentStatsDTO,
  type EnrichmentVertical,
  type RecognitionIndexStatusDTO,
  type RecognitionSettingsDTO,
} from "@/modules/agents/domain/recognition"
import {
  getClassificationStats,
  getEnrichmentStats,
  getRecognitionIndexStatus,
  getRecognitionSettings,
  getRecognitionUsage,
  requestClassificationBackfill,
  requestEnrichmentBackfill,
  requestRecognitionReindex,
  updateRecognitionSettings,
  type RecognitionUsage,
} from "@/modules/agents/infrastructure/services/recognition-service.adapter"

/**
 * Configuración → Reconocimiento de producto: el opt-in de empresa, el consumo
 * del ciclo y el estado del índice del catálogo. Calco de la antigua VoiceSettingsView (retirada: la voz la gobierna axi desde /platform):
 * es una capacidad de pago y cada estado (apagada, cuota agotada, índice
 * incompleto) se EXPLICA en el punto de uso, jamás se oculta un control.
 */
export function RecognitionSettingsView() {
  const { showAlert } = useAlert()
  const [settings, setSettings] = useState<RecognitionSettingsDTO | null>(null)
  const [usage, setUsage] = useState<RecognitionUsage | null>(null)
  const [index, setIndex] = useState<RecognitionIndexStatusDTO | null>(null)
  const [stats, setStats] = useState<EnrichmentStatsDTO | null>(null)
  const [classification, setClassification] = useState<ClassificationStatsDTO | null>(null)
  const [classifying, setClassifying] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [savingSwitch, setSavingSwitch] = useState(false)
  const [savingEnrichment, setSavingEnrichment] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [enriching, setEnriching] = useState(false)
  /** Tipo de catálogo elegido a la espera de confirmar (`undefined` = sin diálogo). */
  const [pendingVertical, setPendingVertical] = useState<EnrichmentVertical | null | undefined>(undefined)

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
    getEnrichmentStats()
      .then(setStats)
      .catch(() => setStats(null))
    getClassificationStats()
      .then(setClassification)
      .catch(() => setClassification(null))
  }, [])

  useEffect(load, [load])

  async function toggle(aiEnabled: boolean) {
    if (settings === null || savingSwitch) return
    const previous = settings
    const next = { ...settings, ai_enabled: aiEnabled }
    setSettings(next)
    setSavingSwitch(true)
    try {
      // El DTO es strict y viaja completo: los flags del enriquecimiento no se pierden
      await updateRecognitionSettings(next)
      showAlert({
        tone: "success",
        title: aiEnabled ? "Reconocimiento activado" : "Reconocimiento desactivado",
        description: aiEnabled
          ? "Desde la próxima foto, el agente reconoce el producto y lo cotiza."
          : "Las fotos siguen llegando al inbox; el agente pide la referencia por texto.",
        autoCloseMs: 3000,
      })
    } catch (err) {
      setSettings(previous)
      showAlert({
        tone: "error",
        title: "No se pudo guardar el cambio",
        description: errorMessage(err),
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
        autoCloseMs: 3000,
      })
      // El índice avanza en segundo plano: una relectura corta basta para el caso normal
      window.setTimeout(() => void getRecognitionIndexStatus().then(setIndex).catch(() => undefined), 4000)
    } catch (err) {
      showAlert({
        tone: "error",
        title: "No se pudo iniciar la indexación",
        description: errorMessage(err),
      })
    } finally {
      setReindexing(false)
    }
  }

  /** Interruptor «Enriquecer automáticamente» y selector de vertical: misma
   * escritura optimista con rollback que el switch principal. */
  async function saveEnrichment(patch: Partial<RecognitionSettingsDTO>, success: { title: string; description: string }) {
    if (settings === null || savingEnrichment) return
    const previous = settings
    const next = { ...settings, ...patch }
    setSettings(next)
    setSavingEnrichment(true)
    try {
      await updateRecognitionSettings(next)
      showAlert({ tone: "success", ...success, autoCloseMs: 3000 })
    } catch (err) {
      setSettings(previous)
      showAlert({ tone: "error", title: "No se pudo guardar el cambio", description: errorMessage(err) })
    } finally {
      setSavingEnrichment(false)
    }
  }

  /** Cambiar el tipo de catálogo REHACE la taxonomía: se confirma antes y el
   * toast cuenta lo que se sembró, retiró y conservó. */
  async function changeVertical(vertical: EnrichmentVertical | null) {
    if (settings === null || savingEnrichment) return
    const previous = settings
    const next = { ...settings, enrichment_vertical: vertical }
    setSettings(next)
    setSavingEnrichment(true)
    try {
      const result = await updateRecognitionSettings(next)
      showAlert({
        tone: "success",
        title: "Tipo de catálogo guardado",
        // Un servidor aún sin el hotfix responde 204 sin cuerpo
        description: taxonomyChangeNote(result?.taxonomy ?? null),
        autoCloseMs: 6000,
      })
      void getEnrichmentStats().then(setStats).catch(() => undefined)
    } catch (err) {
      setSettings(previous)
      showAlert({ tone: "error", title: "No se pudo guardar el cambio", description: errorMessage(err) })
    } finally {
      setSavingEnrichment(false)
      setPendingVertical(undefined)
    }
  }

  async function enrichCatalog() {
    if (enriching) return
    setEnriching(true)
    try {
      await requestEnrichmentBackfill()
      showAlert({
        tone: "success",
        title: "Enriquecimiento en marcha",
        description: "Solo se genera lo que falta o quedó desactualizado. Las cifras se actualizan en segundos.",
        autoCloseMs: 3000,
      })
      window.setTimeout(() => void getEnrichmentStats().then(setStats).catch(() => undefined), 4000)
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo iniciar el enriquecimiento", description: errorMessage(err) })
    } finally {
      setEnriching(false)
    }
  }

  async function classifyCatalog() {
    if (classifying) return
    setClassifying(true)
    try {
      await requestClassificationBackfill()
      showAlert({
        tone: "success",
        title: "Clasificación en marcha",
        description: "Lo que fijaste tú no se toca. Las cifras se actualizan en segundos.",
        autoCloseMs: 3000,
      })
      window.setTimeout(
        () => void getClassificationStats().then(setClassification).catch(() => undefined),
        4000,
      )
    } catch (err) {
      showAlert({ tone: "error", title: "No se pudo iniciar la clasificación", description: errorMessage(err) })
    } finally {
      setClassifying(false)
    }
  }

  if (loadError !== null) {
    return <p className="rounded-3xl bg-destructive/10 p-5 text-sm text-destructive">{loadError}</p>
  }

  if (settings === null) {
    return (
      <div className="flex flex-col gap-4" role="status" aria-label="Cargando configuración del reconocimiento">
        <Skeleton className="h-24 w-full rounded-3xl" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-52 rounded-3xl" />
          <Skeleton className="h-52 rounded-3xl" />
          <Skeleton className="h-52 rounded-3xl" />
        </div>
        <Skeleton className="h-72 w-full rounded-3xl" />
      </div>
    )
  }

  const pctUsed = usage?.limit?.pct_used ?? 0
  const quotaExhausted = usage?.limit !== null && usage !== null && pctUsed >= 100
  const recognitionTone: StatePillTone = settings.ai_enabled ? (quotaExhausted ? "warning" : "success") : "neutral"
  const effectiveVertical: EnrichmentVertical | null = settings.enrichment_vertical ?? stats?.vertical ?? null

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Ajustes · Catálogo con IA
          </p>
          <h1 className="font-heading text-[1.9rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-[2.5rem]">
            Reconocimiento de producto
          </h1>
          <p className="max-w-3xl text-sm text-pretty text-muted-foreground">
            Cuando un cliente envía una foto, una captura o comparte una publicación de Instagram, el agente
            reconoce qué producto es y lo cotiza.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => void reindex()}
            disabled={reindexing || index === null || !index.enabled}
          >
            {reindexing ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            Indexar ahora
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => void classifyCatalog()}
            disabled={classifying || classification === null}
          >
            {classifying ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Tags className="size-4" aria-hidden />}
            Clasificar catálogo
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <BentoTile
          label="Reconocimiento"
          aside={
            <StatePill tone={recognitionTone}>
              {settings.ai_enabled ? (quotaExhausted ? "En pausa" : "Activo") : "Desactivado"}
            </StatePill>
          }
        >
          {usage !== null && usage.limit !== null ? (
            <>
              <BentoFigure
                value={usage.used.toLocaleString("es-CO")}
                unit={`de ${usage.limit.value.toLocaleString("es-CO")} este ciclo`}
              />
              <Meter
                label="Consumo de reconocimientos"
                pct={pctUsed}
                tone={pctUsed >= 100 ? "destructive" : pctUsed >= 80 ? "warning" : "ink"}
              />
              <p className="text-xs text-muted-foreground">
                {quotaExhausted
                  ? "Cuota agotada: las fotos entran al inbox como siempre y el agente pide la referencia por texto hasta el nuevo ciclo."
                  : "Un reconocimiento por foto analizada · el límite lo define tu plan."}
              </p>
            </>
          ) : null}
          <p className="text-xs text-pretty text-muted-foreground">
            Cada foto analizada consume <span className="font-medium text-foreground">un reconocimiento</span> de
            tu plan. Con confianza alta el agente cotiza directo; si duda, muestra hasta tres opciones con foto y
            deja que el cliente elija. Sin coincidencias, pide la referencia.
          </p>
          {settings.ai_enabled && quotaExhausted ? (
            <Notice>
              <span className="font-medium">Cuota de reconocimientos agotada.</span> Puedes ampliarla con un bloque
              de 100 desde Facturación; se reactiva sola al iniciar el nuevo ciclo.
            </Notice>
          ) : null}
          <SwitchRow
            id="recognition-ai"
            label="Reconocer productos en las fotos que envían tus clientes"
            checked={settings.ai_enabled}
            onChange={(value) => void toggle(value)}
            disabled={savingSwitch}
            ariaLabel="Activar reconocimiento de producto para la empresa"
          />
        </BentoTile>

        <BentoTile
          label="Índice del catálogo"
          aside={index === null ? null : <IndexPill index={index} />}
        >
          {index === null ? (
            <p className="text-xs text-muted-foreground">El estado del índice no está disponible ahora.</p>
          ) : (
            <>
              <BentoFigure
                value={index.products_indexed.toLocaleString("es-CO")}
                unit={`de ${index.products.toLocaleString("es-CO")} productos`}
              />
              <Meter label="Productos indexados" pct={index.products === 0 ? 0 : (index.products_indexed / index.products) * 100} tone="ink" />
              <dl className="grid grid-cols-2 gap-3 border-t border-border pt-3">
                <Figure
                  value={index.images_indexed.toLocaleString("es-CO")}
                  label={`de ${index.images.toLocaleString("es-CO")} fotos indexadas`}
                />
                <Figure value={index.products_without_photo.toLocaleString("es-CO")} label="productos sin foto" />
              </dl>
              <p className="text-xs text-muted-foreground">
                Se indexa solo cada vez que guardas un producto o subes una foto; «Indexar ahora» lo fuerza.
              </p>
              {!index.enabled ? (
                <Notice>
                  <span className="font-medium">El reconocimiento por imagen no está disponible en la plataforma.</span>{" "}
                  Las fotos se reconocen solo por su descripción hasta que se habilite.
                </Notice>
              ) : null}
            </>
          )}
        </BentoTile>

        <BentoTile
          label="Clasificación"
          className="md:col-span-2 xl:col-span-1"
          aside={classification === null ? null : <ClassificationPill stats={classification} />}
        >
          {classification === null ? (
            <p className="text-xs text-muted-foreground">El estado de la clasificación no está disponible ahora.</p>
          ) : (
            <>
              <BentoFigure
                value={classification.categorized.toLocaleString("es-CO")}
                unit={`de ${classification.products.toLocaleString("es-CO")} con categoría`}
              />
              <Meter
                label="Productos con categoría"
                pct={classification.products === 0 ? 0 : (classification.categorized / classification.products) * 100}
                tone="ink"
              />
              <p className="text-xs text-muted-foreground">{classificationPendingNote(classification)}</p>
            </>
          )}
          <SwitchRow
            id="classification-auto"
            label="Clasificar automáticamente"
            checked={settings.classification_auto_enabled !== false}
            onChange={(value) =>
              void saveEnrichment(
                { classification_auto_enabled: value },
                value
                  ? { title: "Clasificación automática activada", description: "Cada producto nuevo o modificado recibe su categoría en segundos." }
                  : { title: "Clasificación automática desactivada", description: "Puedes clasificar por producto o con «Clasificar catálogo»." },
              )
            }
            disabled={savingEnrichment}
            ariaLabel="Clasificar automáticamente el catálogo"
          />
        </BentoTile>
      </div>

      <InkIsland label="Tipo de catálogo y metadatos con IA" className="gap-0 p-6 sm:p-7">
        <div className="grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Kicker>Tipo de catálogo</Kicker>
              <h2 className="font-heading text-2xl leading-tight font-bold tracking-tight">
                {effectiveVertical ? ENRICHMENT_VERTICAL_LABELS[effectiveVertical] : "Según tu tipo de negocio"}
                {settings.enrichment_vertical === null ? (
                  <span className="font-sans text-sm font-medium text-muted-foreground"> · según tu tipo de negocio</span>
                ) : null}
              </h2>
              <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
                Decide las categorías base y los atributos que genera la IA. Cambiarlo rehace la taxonomía: siembra
                las categorías del nuevo tipo y retira las del anterior que no tengan productos.
              </p>
            </div>
            <div role="radiogroup" aria-label="Tipo de catálogo" className="flex flex-wrap gap-1.5">
              <VerticalChip
                on={settings.enrichment_vertical === null}
                disabled={savingEnrichment}
                onPick={() => settings.enrichment_vertical !== null && setPendingVertical(null)}
              >
                Según tu negocio{stats ? ` (${ENRICHMENT_VERTICAL_LABELS[stats.vertical]})` : ""}
              </VerticalChip>
              {(Object.keys(ENRICHMENT_VERTICAL_LABELS) as EnrichmentVertical[]).map((vertical) => (
                <VerticalChip
                  key={vertical}
                  on={settings.enrichment_vertical === vertical}
                  disabled={savingEnrichment}
                  onPick={() => settings.enrichment_vertical !== vertical && setPendingVertical(vertical)}
                >
                  {ENRICHMENT_VERTICAL_LABELS[vertical]}
                </VerticalChip>
              ))}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3.5 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-7" aria-labelledby="enrichment-title">
            <div className="flex items-center justify-between gap-2">
              <h2 id="enrichment-title" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5" aria-hidden />
                Metadatos con IA
              </h2>
              <StatePill tone={settings.enrichment_auto_enabled === true ? "success" : "neutral"}>
                {settings.enrichment_auto_enabled === true ? "Automático" : "Bajo demanda"}
              </StatePill>
            </div>
            {stats === null ? (
              <p className="text-xs text-muted-foreground">El estado de los metadatos no está disponible ahora.</p>
            ) : (
              <>
                <BentoFigure
                  value={stats.ready.toLocaleString("es-CO")}
                  unit={`de ${stats.products.toLocaleString("es-CO")} con metadatos`}
                  size="md"
                />
                <p className="text-xs text-muted-foreground">{enrichmentPendingNote(stats)}</p>
                <DetailList
                  rows={[
                    { label: "Editados por ti", note: "no se regeneran solos", value: stats.user_edited },
                    { label: "Desactivados", note: "usan la ficha original", value: stats.disabled },
                  ]}
                />
                {!stats.enabled ? (
                  <Notice>
                    <span className="font-medium">Los metadatos con IA no están disponibles en la plataforma.</span>{" "}
                    El agente usa la descripción de la ficha hasta que se habiliten.
                  </Notice>
                ) : null}
                {stats.enabled && enrichmentCapReached(stats) ? (
                  <Notice icon="info">
                    <span className="font-medium">Tope del mes alcanzado.</span> Lo pendiente se enriquece solo al
                    iniciar el próximo mes. Si necesitas más este mes, escríbenos.
                  </Notice>
                ) : null}
                {stats.enabled && stats.monthly_used !== null ? (
                  <p className="text-xs text-muted-foreground">
                    Consumo del mes:{" "}
                    <span className="tabular-nums">
                      {stats.monthly_used.toLocaleString("es-CO")} de {stats.monthly_cap.toLocaleString("es-CO")}
                    </span>
                    .
                  </p>
                ) : null}
              </>
            )}
            <SwitchRow
              id="enrichment-auto"
              label="Enriquecer automáticamente"
              checked={settings.enrichment_auto_enabled === true}
              onChange={(value) =>
                void saveEnrichment(
                  { enrichment_auto_enabled: value },
                  value
                    ? { title: "Enriquecimiento automático activado", description: "Cada producto nuevo o modificado recibe sus metadatos en segundos." }
                    : { title: "Enriquecimiento automático desactivado", description: "Puedes generarlos por producto o con «Enriquecer catálogo»." },
                )
              }
              disabled={savingEnrichment}
              ariaLabel="Enriquecer automáticamente el catálogo con IA"
            />
            <Button
              variant="contrast"
              className="rounded-full"
              onClick={() => void enrichCatalog()}
              disabled={enriching || stats === null || !stats.enabled}
            >
              {enriching ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Sparkles className="size-4" aria-hidden />}
              Enriquecer catálogo
            </Button>
          </div>
        </div>
      </InkIsland>

      <div className="grid gap-4 md:grid-cols-2">
        <BentoTile label="Clasificación · detalle">
          {classification === null ? (
            <p className="text-xs text-muted-foreground">El estado de la clasificación no está disponible ahora.</p>
          ) : (
            <DetailList
              rows={[
                { label: "Automáticas", note: "sin confirmar", value: classification.automatic },
                { label: "Fijadas por ti", note: "no se tocan", value: classification.tenant_set },
                {
                  label: "Sin resolver",
                  note: classificationUncategorized(classification) === 0 ? "todo al día" : "elígelas a mano",
                  value: classification.unresolved,
                },
              ]}
            />
          )}
          <p className="text-xs text-pretty text-muted-foreground">
            Cada producto nuevo o modificado recibe su categoría de la taxonomía de tu tipo de catálogo: primero por
            señales de la tienda (colección, tipo, nombre) y, si no basta, con IA. Lo que tú fijes no se toca.
          </p>
        </BentoTile>
        <BentoTile label="Índice · detalle">
          {index === null ? (
            <p className="text-xs text-muted-foreground">El estado del índice no está disponible ahora.</p>
          ) : (
            <>
              <DetailList
                rows={[
                  { label: "Productos pendientes", note: "se completan en segundos", value: pendingProducts(index) },
                  { label: "Fotos pendientes", note: "solo se procesa lo que cambió", value: pendingImages(index) },
                  { label: "Productos sin foto", note: "solo se reconocen por texto", value: index.products_without_photo },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                {index.enabled && indexComplete(index) && index.products > 0
                  ? "Índice completo: cada producto y cada foto tienen su huella."
                  : "Solo se procesa lo que cambió desde la última indexación."}
              </p>
            </>
          )}
        </BentoTile>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <BentoTile label="Cómo reconoce">
          <ul className="flex flex-col gap-3">
            <HowItem icon={Camera} title="Foto directa" text="WhatsApp, Instagram y Messenger." />
            <HowItem icon={Smartphone} title="Captura de pantalla" text="De un video o de una publicación." />
            <HowItem icon={Share} title="Publicación compartida" text="Posts y menciones de historia en Instagram." />
          </ul>
        </BentoTile>
        <BentoTile label="Qué hace la IA con tu catálogo">
          <ul className="flex flex-col gap-3">
            <HowItem
              icon={ListTree}
              title="Qué genera"
              text="Descripción de hasta 160 caracteres, atributos según tu tipo de negocio y hasta 12 formas de pedirlo."
            />
            <HowItem
              icon={Eye}
              title="Qué ve el agente"
              text="Solo la descripción, en lugar de la de la ficha. Atributos y términos mejoran la búsqueda por texto y por foto."
            />
            <HowItem
              icon={Lock}
              title="Qué no toca"
              text="Tu tienda conectada. Nombre, precio, fotos y categoría siguen siendo de Shopify; lo generado vive en axi."
            />
          </ul>
          <p className="text-xs text-pretty text-muted-foreground">
            Cada producto nuevo o modificado, incluidos los que llegan de tu tienda conectada, recibe una descripción
            para el agente, atributos y las palabras con que lo piden tus clientes.{" "}
            <span className="font-medium text-foreground">No consume tu plan</span> y no escribe nada en tu tienda.
            «Enriquecer catálogo» genera solo lo que falta o quedó desactualizado; lo editado por ti y lo desactivado
            no se tocan. Va al ritmo que permite el proveedor de IA: un catálogo grande tarda unos minutos.
          </p>
        </BentoTile>
      </div>

      <Dialog open={pendingVertical !== undefined} onOpenChange={(open) => { if (!open && !savingEnrichment) setPendingVertical(undefined) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cambiar el tipo de catálogo?</DialogTitle>
            <DialogDescription>
              Tus categorías se rehacen para el nuevo tipo. Puedes volver a cambiarlo cuando quieras.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2.5 rounded-2xl bg-muted p-4 text-sm">
            <li className="flex items-start gap-2.5">
              <Plus className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Se siembran las categorías de{" "}
                <span className="font-medium">
                  {pendingVertical ? ENRICHMENT_VERTICAL_LABELS[pendingVertical] : "tu tipo de negocio"}
                </span>
                .
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Minus className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                Las de <span className="font-medium">{stats ? ENRICHMENT_VERTICAL_LABELS[stats.vertical] : "el tipo actual"}</span>{" "}
                que no tienen productos se retiran.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              <span>Las que tienen productos, y las que creaste tú, se conservan.</span>
            </li>
          </ul>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setPendingVertical(undefined)} disabled={savingEnrichment}>
              Cancelar
            </Button>
            <Button variant="contrast" className="rounded-full" onClick={() => void changeVertical(pendingVertical ?? null)} disabled={savingEnrichment}>
              {savingEnrichment ? "Cambiando…" : "Cambiar tipo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Barra de avance de una ficha: tinta por omisión; ámbar y rojo solo para la cuota (≥80 % y ≥100 %). */
function Meter({ label, pct, tone }: { label: string; pct: number; tone: "ink" | "warning" | "destructive" }) {
  const value = Math.max(0, Math.min(100, pct))
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 overflow-hidden rounded-full bg-muted"
    >
      <div
        className={cn(
          "h-full rounded-full",
          tone === "destructive" ? "bg-destructive" : tone === "warning" ? "bg-warning" : "bg-foreground",
        )}
        style={{ width: `${String(value)}%` }}
      />
    </div>
  )
}

/** Cifra secundaria de una ficha: número tabular + qué cuenta. */
function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="order-2 text-xs text-pretty text-muted-foreground">{label}</dt>
      <dd className="order-1 text-xl font-semibold tracking-tight whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  )
}

/** Detalle de una ficha como LISTA (no tabla): qué cuenta y su nota a la izquierda, la cifra a la derecha. */
function DetailList({ rows }: { rows: { label: string; note: string; value: number }[] }) {
  return (
    <dl className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="min-w-0 text-sm">
            <span className="block font-medium">{row.label}</span>
            <span className="block text-xs text-muted-foreground">{row.note}</span>
          </dt>
          <dd className="shrink-0 text-lg font-semibold tracking-tight whitespace-nowrap tabular-nums">
            {row.value.toLocaleString("es-CO")}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function SwitchRow({
  id,
  label,
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (value: boolean) => void
  disabled: boolean
  ariaLabel: string
}) {
  return (
    <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
      <label htmlFor={id} className="min-w-0 text-sm font-medium text-pretty">
        {label}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={ariaLabel} />
    </div>
  )
}

/** Aviso dentro de una ficha: el color vive en el icono, el texto en foreground (AA). */
function Notice({ children, icon = "warning" }: { children: React.ReactNode; icon?: "warning" | "info" }) {
  const Icon = icon === "warning" ? TriangleAlert : Info
  return (
    <p className="flex items-start gap-2 rounded-2xl bg-muted p-3 text-xs">
      <Icon className={cn("mt-0.5 size-3.5 shrink-0", icon === "warning" ? "text-warning" : "text-info")} aria-hidden />
      <span>{children}</span>
    </p>
  )
}

function IndexPill({ index }: { index: RecognitionIndexStatusDTO }) {
  if (!index.enabled) return <StatePill tone="warning">No disponible</StatePill>
  const pending = pendingProducts(index) + pendingImages(index)
  if (pending > 0) return <StatePill tone="warning">{`${pending.toLocaleString("es-CO")} pendientes`}</StatePill>
  return <StatePill tone="success">Completo</StatePill>
}

function ClassificationPill({ stats }: { stats: ClassificationStatsDTO }) {
  if (classificationUncategorized(stats) === 0) return <StatePill tone="success">Al día</StatePill>
  if (stats.unresolved > 0) return <StatePill tone="neutral">{`${stats.unresolved.toLocaleString("es-CO")} sin resolver`}</StatePill>
  return <StatePill tone="info">En curso</StatePill>
}

function VerticalChip({
  on,
  disabled,
  onPick,
  children,
}: {
  on: boolean
  disabled: boolean
  onPick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "h-9 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
        on ? "bg-foreground text-background ring-foreground" : "bg-background ring-border hover:ring-foreground/40",
      )}
    >
      {children}
    </button>
  )
}

function HowItem({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span className="min-w-0 text-sm">
        <span className="block font-medium">{title}</span>
        <span className="text-xs text-pretty text-muted-foreground">{text}</span>
      </span>
    </li>
  )
}
