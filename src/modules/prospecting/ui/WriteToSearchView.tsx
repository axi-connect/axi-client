"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Check,
  ChevronLeft,
  CircleCheck,
  Image as ImageIcon,
  ListOrdered,
  Mail,
  MessageCircle,
  Repeat,
  Reply,
  Send,
  Smartphone,
  TriangleAlert,
  Upload,
} from "lucide-react"

import { errorMessage } from "@/core/lib/error-messages"
import { cn } from "@/core/lib/utils"
import { useAlert } from "@/core/providers/alert-provider"
import { useAuthContext } from "@/core/providers/auth-provider"
import { HsmPreview, type TemplateButton } from "@/modules/marketing/public"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Callout } from "@/shared/components/ui/callout"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { SegmentedControl } from "@/shared/components/ui/segmented"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { Switch } from "@/shared/components/ui/switch"

import {
  CTA_TARGET_LABELS,
  DEFAULT_CTA,
  initialLook,
  lookChanged,
  personalizedName,
  resultText,
  sampleOrder,
  templateDisplayName,
  whatsappValues,
  type CtaTarget,
  type EmailPreviewDTO,
  type LookState,
  type OutreachImageDTO,
  type SearchOutreachResultDTO,
  type SearchOutreachSummaryDTO,
  type SequenceLookViewDTO,
} from "../domain/search-outreach"
import {
  enrollSearch,
  getMyCompanyName,
  getSearchOutreach,
  getSequenceLook,
  listOutreachImages,
  listSequenceOptions,
  outreachImageUrl,
  previewEmail,
  sendTestEmail,
  uploadOutreachImage,
  type EmailPreviewInput,
  type SequenceOption,
} from "../infrastructure/services/search-outreach.adapter"

const MANAGE = "crm:automate"
const PREVIEW_DELAY_MS = 350

const STEP_ICON: Record<string, typeof Mail> = {
  email: Mail,
  message: MessageCircle,
  sms: Smartphone,
}
const STEP_LABEL: Record<string, string> = {
  email: "Correo",
  message: "WhatsApp",
  sms: "SMS",
  call: "Llamada",
  call_then_message: "Llamada",
  manual: "Tarea",
}

/**
 * «Escribirles» (Fase B2, mockup aprobado `outreach-from-search`): de una
 * búsqueda a la secuencia, en UNA pantalla. Cuatro decisiones ya resueltas
 * por el nicho (imagen, WhatsApp, correo, secuencia), la vista previa en vivo
 * de un negocio real de la búsqueda y una sola acción.
 *
 * Rejilla: dos columnas solo desde `xl` (a 1024 con la barra lateral la
 * izquierda quedaba en ~230 px). En una columna el orden es configuración →
 * vista previa → acción: se ve cómo le llega antes de inscribir.
 */
export function WriteToSearchView({ searchId }: { searchId: string }) {
  const { showAlert } = useAlert()
  const { hasPermission } = useAuthContext()
  const canWrite = hasPermission(MANAGE)

  const [summary, setSummary] = useState<SearchOutreachSummaryDTO | null>(null)
  const [sequences, setSequences] = useState<SequenceOption[] | null>(null)
  const [images, setImages] = useState<OutreachImageDTO[]>([])
  const [sequenceId, setSequenceId] = useState<string | null>(null)
  const [lookView, setLookView] = useState<SequenceLookViewDTO | null>(null)
  const [look, setLook] = useState<LookState | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [sender, setSender] = useState("Tu negocio")
  // «Ver como»: el negocio con que se ve TODO (imagen, WhatsApp, correo y el «Para …» del switch).
  const [business, setBusiness] = useState<string | null>(null)

  useEffect(() => {
    getMyCompanyName()
      .then(setSender)
      .catch(() => undefined)
    Promise.all([getSearchOutreach(searchId), listSequenceOptions(), listOutreachImages()])
      .then(([nextSummary, nextSequences, nextImages]) => {
        setSummary(nextSummary)
        setBusiness(sampleOrder(nextSummary.sample_businesses)[0] ?? "Negocio de ejemplo")
        setSequences(nextSequences)
        setImages(nextImages)
        setSequenceId(nextSequences.find((sequence) => sequence.is_active)?.id ?? nextSequences[0]?.id ?? null)
      })
      .catch((error: unknown) => setFailed(errorMessage(error, "No pudimos abrir la búsqueda")))
  }, [searchId])

  useEffect(() => {
    if (sequenceId === null || summary === null) return
    let alive = true
    getSequenceLook(sequenceId)
      .then((view) => {
        if (!alive) return
        setLookView(view)
        setLook(initialLook(view, summary.suggested_image))
      })
      .catch((error: unknown) => showAlert({ tone: "error", title: errorMessage(error, "No pudimos leer la secuencia") }))
    return () => {
      alive = false
    }
  }, [sequenceId, summary, showAlert])

  const sequence = sequences?.find((entry) => entry.id === sequenceId) ?? null

  if (failed !== null) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <Callout tone="danger" icon={TriangleAlert}>
          {failed}
        </Callout>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 p-4 md:p-6">
      <header className="min-w-0 space-y-1">
        <Link
          href="/marketing/leads/searches"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" /> Búsquedas
        </Link>
        {summary === null ? (
          <Skeleton className="h-8 w-72 max-w-full" />
        ) : (
          <>
            <h1 className="font-heading text-2xl font-bold tracking-tight text-balance">
              Escribirles a {summary.leads.toLocaleString("es-CO")} negocios
            </h1>
            <p className="truncate text-sm text-muted-foreground" title={summary.label ?? undefined}>
              {summary.label ?? "Búsqueda de captación"}
            </p>
          </>
        )}
      </header>

      {summary === null || sequences === null ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(560px,1fr)_400px]">
          <Skeleton className="h-[520px] w-full rounded-2xl" />
          <Skeleton className="h-[520px] w-full rounded-2xl" />
        </div>
      ) : sequences.length === 0 ? (
        <Callout tone="info" icon={ListOrdered}>
          Aún no tienes secuencias.{" "}
          <Link href="/crm/settings/sequences" className="font-medium underline underline-offset-4">
            Crea una
          </Link>{" "}
          y vuelve para escribirles.
        </Callout>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(560px,1fr)_400px]">
          <SetupCard
            summary={summary}
            sequences={sequences}
            sequence={sequence}
            onSequence={setSequenceId}
            images={images}
            onImages={setImages}
            lookView={lookView}
            look={look}
            onLook={setLook}
            canWrite={canWrite}
            business={business ?? "Negocio de ejemplo"}
          />
          <div className="min-w-0 xl:sticky xl:top-4 xl:row-span-2">
            <PreviewCard
              summary={summary}
              sequence={sequence}
              lookView={lookView}
              look={look}
              canWrite={canWrite}
              business={business ?? "Negocio de ejemplo"}
              onBusiness={setBusiness}
              sender={sender}
            />
          </div>
          <ActionBar
            summary={summary}
            sequence={sequence}
            lookView={lookView}
            look={look}
            canWrite={canWrite}
            searchId={searchId}
          />
        </div>
      )}
    </div>
  )
}

/* ───────────────────────────── Configuración ───────────────────────────── */

function Row({
  icon: Icon,
  title,
  aside,
  children,
}: {
  icon: typeof Mail
  title: string
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid min-w-0 gap-3 border-t border-border/60 px-5 py-4 first:border-t-0 md:px-6">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-sans text-sm font-semibold">
          <Icon aria-hidden className="size-4" /> {title}
        </h2>
        {aside}
      </div>
      {children}
    </div>
  )
}

function SetupCard({
  summary,
  sequences,
  sequence,
  onSequence,
  images,
  onImages,
  lookView,
  look,
  onLook,
  canWrite,
  business,
}: {
  summary: SearchOutreachSummaryDTO
  sequences: SequenceOption[]
  sequence: SequenceOption | null
  onSequence: (id: string) => void
  images: OutreachImageDTO[]
  onImages: (images: OutreachImageDTO[]) => void
  lookView: SequenceLookViewDTO | null
  look: LookState | null
  onLook: (look: LookState) => void
  canWrite: boolean
  business: string
}) {
  const { showAlert } = useAlert()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const update = (patch: Partial<LookState>) => {
    if (look !== null) onLook({ ...look, ...patch })
  }

  async function upload(file: File) {
    setUploading(true)
    try {
      const image = await uploadOutreachImage(file)
      onImages([
        ...images.filter((entry) => entry.kind === "niche"),
        image,
        ...images.filter((entry) => entry.kind === "upload"),
      ])
      update({ image_id: image.id })
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error, "No se pudo subir la imagen") })
    } finally {
      setUploading(false)
    }
  }

  const whatsapp = lookView?.whatsapp ?? null
  const example = personalizedName(business)

  return (
    <section aria-label="Lo que se va a enviar" className="min-w-0 rounded-2xl border border-border bg-card">
      <Row icon={ImageIcon} title="Imagen" aside={<span className="text-xs text-muted-foreground">Va en el WhatsApp y en el correo</span>}>
        {look === null ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div role="radiogroup" aria-label="Imagen" className="flex flex-wrap gap-2.5">
              {images.map((image) => {
                const selected = look.image_id === image.id
                return (
                  <button
                    key={image.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={!canWrite}
                    onClick={() => update({ image_id: selected ? null : image.id })}
                    className={cn(
                      "w-28 overflow-hidden rounded-xl border-[1.5px] bg-background text-left text-xs transition focus-visible:outline-2 focus-visible:outline-ring",
                      selected ? "border-primary ring-3 ring-primary/15" : "border-border hover:border-foreground/30",
                    )}
                  >
                    {image.url === null ? (
                      <span className="grid aspect-[1.91/1] place-items-center bg-muted">
                        <ImageIcon aria-hidden className="size-4 text-muted-foreground" />
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- URL firmada del API, no un asset de Next
                      <img src={image.url} alt="" className="block aspect-[1.91/1] w-full object-cover" loading="lazy" />
                    )}
                    <span className="flex items-center justify-between gap-1 px-2 py-1.5">
                      <span className="truncate" title={image.label}>
                        {image.label}
                      </span>
                      {selected && <Check aria-hidden className="size-3.5 shrink-0 text-primary" />}
                    </span>
                  </button>
                )
              })}
              {canWrite && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="grid w-28 place-items-center gap-1 rounded-xl border-[1.5px] border-dashed border-border px-2 py-4 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <Upload aria-hidden className="size-4" />
                  {uploading ? "Subiendo…" : "Subir"}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (file !== undefined) void upload(file)
                }}
              />
            </div>
            <label className="flex min-w-0 items-center gap-2.5 text-sm">
              <Switch
                checked={look.personalize}
                disabled={!canWrite || look.image_id === null}
                onCheckedChange={(checked) => update({ personalize: checked })}
              />
              <span className="shrink-0">Con el nombre de cada negocio</span>
              <span className="hidden min-w-0 truncate text-muted-foreground sm:inline" title={`«Para ${example}»`}>
                «Para {example}»
              </span>
            </label>
          </>
        )}
      </Row>

      <Row
        icon={MessageCircle}
        title="WhatsApp"
        aside={
          whatsapp === null ? undefined : (
            <Badge variant="outline">{summary.with_phone.toLocaleString("es-CO")} con celular</Badge>
          )
        }
      >
        {lookView === null ? (
          <Skeleton className="h-12 w-full" />
        ) : whatsapp === null ? (
          <p className="text-sm text-muted-foreground">Esta secuencia no tiene paso de WhatsApp.</p>
        ) : (
          <>
            <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" title={templateDisplayName(whatsapp.template_name)}>
                  {templateDisplayName(whatsapp.template_name)}
                </p>
                <p className="truncate font-mono text-[11.5px] text-muted-foreground" title={whatsapp.template_name}>
                  {whatsapp.template_name} · {whatsapp.has_image_header ? "con imagen por envío" : "sin encabezado de imagen"}
                </p>
              </div>
              <Badge variant={whatsapp.approval_status === "approved" ? "secondary" : "outline"}>
                {whatsapp.approval_status === "approved" ? "Aprobada" : "Sin aprobar"}
              </Badge>
            </div>
            {!whatsapp.has_image_header && look?.image_id != null && (
              <Callout tone="warn" icon={TriangleAlert}>
                Esta plantilla no tiene encabezado de imagen: el WhatsApp sale sin ella. Para usarla, crea una plantilla
                con imagen.
              </Callout>
            )}
          </>
        )}
      </Row>

      <Row icon={Mail} title="Correo" aside={<Badge variant="outline">{summary.with_email.toLocaleString("es-CO")} con correo</Badge>}>
        {look === null ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <SegmentedControl
              label="Diseño del correo"
              size="sm"
              value={look.email_design}
              onValueChange={(value) =>
                update({ email_design: value, cta: value === "brand" ? (look.cta ?? DEFAULT_CTA) : look.cta })
              }
              items={[
                { value: "text", label: "Texto" },
                { value: "brand", label: "Marca" },
              ]}
            />
            {look.email_design === "brand" && (
              <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2">
                <div className="grid min-w-40 flex-1 gap-1">
                  <Label htmlFor="cta-label" className="text-xs text-muted-foreground">
                    Botón
                  </Label>
                  <Input
                    id="cta-label"
                    value={look.cta?.label ?? ""}
                    maxLength={40}
                    disabled={!canWrite}
                    placeholder="Sin botón"
                    onChange={(event) =>
                      update({
                        cta:
                          event.target.value.trim() === ""
                            ? null
                            : { label: event.target.value, target: look.cta?.target ?? "reply" },
                      })
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs text-muted-foreground">Al tocarlo</Label>
                  <Select
                    value={look.cta?.target ?? "reply"}
                    disabled={!canWrite || look.cta === null}
                    onValueChange={(target) =>
                      look.cta !== null && update({ cta: { label: look.cta.label, target: target as CtaTarget } })
                    }
                  >
                    <SelectTrigger className="w-44" aria-label="Destino del botón">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CTA_TARGET_LABELS) as CtaTarget[]).map((target) => (
                        <SelectItem key={target} value={target}>
                          {CTA_TARGET_LABELS[target]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        )}
      </Row>

      <Row
        icon={ListOrdered}
        title="Secuencia"
        aside={
          <Select value={sequence?.id ?? ""} onValueChange={onSequence}>
            <SelectTrigger className="w-56 max-w-full" aria-label="Secuencia">
              <span className="min-w-0 truncate">
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {sequences.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.name}
                  {entry.is_active ? "" : " (borrador)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        {sequence !== null && (
          <ol className="flex flex-wrap gap-1.5" aria-label="Toques de la secuencia">
            {sequence.steps.map((step, index) => {
              const thread = /^\s*re\s*:/i.test(step.message_template?.subject ?? "")
              const Icon = thread ? Reply : (STEP_ICON[step.task_channel] ?? ListOrdered)
              return (
                <li
                  key={index}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                >
                  <Icon aria-hidden className="size-3.5" />
                  {thread ? "Correo «Re:»" : (STEP_LABEL[step.task_channel] ?? step.task_channel)}
                  <span className="font-medium tabular-nums text-muted-foreground">Día {Math.round(step.offset_hours / 24)}</span>
                </li>
              )
            })}
          </ol>
        )}
        {sequence !== null && !sequence.is_active && (
          <Callout tone="warn" icon={TriangleAlert}>
            Esta secuencia está en borrador. Actívala para poder inscribir.{" "}
            <Link href="/crm/settings/sequences" className="font-medium text-foreground underline underline-offset-4">
              Abrir las secuencias
            </Link>
          </Callout>
        )}
      </Row>
    </section>
  )
}

/* ───────────────────────────── Acción ───────────────────────────── */

function ActionBar({
  summary,
  sequence,
  lookView,
  look,
  canWrite,
  searchId,
}: {
  summary: SearchOutreachSummaryDTO
  sequence: SequenceOption | null
  lookView: SequenceLookViewDTO | null
  look: LookState | null
  canWrite: boolean
  searchId: string
}) {
  const { showAlert } = useAlert()
  const [confirming, setConfirming] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [result, setResult] = useState<SearchOutreachResultDTO | null>(null)
  const changed = look !== null && lookChanged(look, lookView)
  const inFlight = sequence?.active_enrollments ?? 0

  async function enroll() {
    if (sequence === null || look === null) return
    setEnrolling(true)
    try {
      // Sin cambios no se manda el look: los pasos de la secuencia no se reescriben.
      const outcome = await enrollSearch(searchId, sequence.id, changed ? look : null)
      setResult(outcome)
      setConfirming(false)
      showAlert({ tone: "success", title: "Listo", description: resultText(outcome) })
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error, "No pudimos inscribir los negocios") })
    } finally {
      setEnrolling(false)
    }
  }

  return (
    <section aria-label="Inscribir" className="grid min-w-0 gap-3 rounded-2xl border border-border bg-secondary/60 px-5 py-3.5 md:px-6">
      {result !== null && (
        <Callout tone="info" icon={CircleCheck}>
          {resultText(result)} Los toques salen según tu política de contacto.
        </Callout>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 max-w-[60ch] text-[13px] text-pretty text-muted-foreground">
          {confirming
            ? `¿Inscribir ${summary.leads.toLocaleString("es-CO")} negocios en «${sequence?.name ?? ""}»?` +
              (changed
                ? inFlight > 0
                  ? ` La imagen y el diseño cambian para toda la secuencia, también para sus ${inFlight.toLocaleString("es-CO")} inscritos activos.`
                  : " La imagen y el diseño se aplican a toda la secuencia."
                : "")
            : "Se detiene si responde. Los toques salen según tu política de contacto y los topes del frío."}
        </p>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            {confirming ? (
              <>
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={enrolling}>
                  Cancelar
                </Button>
                <Button onClick={() => void enroll()} disabled={enrolling}>
                  <Send aria-hidden />
                  {enrolling ? "Inscribiendo…" : "Sí, inscribir"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link
                    href={`/marketing/autopilot/new?desde_busqueda=${searchId}${sequence === null ? "" : `&secuencia=${sequence.id}`}`}
                  >
                    <Repeat aria-hidden />
                    Automatizar cada semana
                  </Link>
                </Button>
                <Button
                  onClick={() => setConfirming(true)}
                  disabled={sequence === null || !sequence.is_active || look === null || summary.leads === 0}
                >
                  <Send aria-hidden />
                  Inscribir {summary.leads.toLocaleString("es-CO")} negocios
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

/* ───────────────────────────── Vista previa ───────────────────────────── */

function toTemplateButtons(buttons: NonNullable<SequenceLookViewDTO["whatsapp"]>["buttons"]): TemplateButton[] {
  return buttons.map((button) =>
    button.type === "url"
      ? { type: "url", text: button.text, url: "" }
      : button.type === "phone_number"
        ? { type: "phone_number", text: button.text, phone_number: "" }
        : { type: "quick_reply", text: button.text },
  )
}

function PreviewCard({
  summary,
  sequence,
  lookView,
  look,
  canWrite,
  business,
  onBusiness,
  sender,
}: {
  summary: SearchOutreachSummaryDTO
  sequence: SequenceOption | null
  lookView: SequenceLookViewDTO | null
  look: LookState | null
  canWrite: boolean
  business: string
  onBusiness: (business: string) => void
  sender: string
}) {
  const { showAlert } = useAlert()
  const samples = useMemo(() => sampleOrder(summary.sample_businesses), [summary.sample_businesses])
  const [tab, setTab] = useState<"whatsapp" | "email">("whatsapp")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [email, setEmail] = useState<EmailPreviewDTO | null>(null)
  const [sending, setSending] = useState(false)

  const firstEmail = useMemo(
    () =>
      sequence?.steps.find((step) => step.task_channel === "email" && step.message_template !== null)?.message_template ??
      null,
    [sequence],
  )

  const emailInput = useCallback((): EmailPreviewInput | null => {
    if (firstEmail === null || look === null) return null
    const brand = look.email_design === "brand" && !/^\s*re\s*:/i.test(firstEmail.subject ?? "")
    return {
      template: {
        subject: firstEmail.subject,
        body: firstEmail.body,
        design: brand ? "brand" : "text",
        header_image: brand && look.image_id !== null ? { id: look.image_id, personalize: look.personalize } : null,
        cta: brand ? look.cta : null,
      },
      sample_business: business,
    }
  }, [firstEmail, look, business])

  useEffect(() => {
    if (look === null) return
    let alive = true
    const timer = window.setTimeout(() => {
      if (look.image_id !== null) {
        outreachImageUrl({ id: look.image_id, personalize: look.personalize, business_name: business })
          .then((url) => alive && setImageUrl(url))
          .catch(() => alive && setImageUrl(null))
      } else {
        setImageUrl(null)
      }
      const input = emailInput()
      if (input !== null) {
        previewEmail(input)
          .then((preview) => alive && setEmail(preview))
          .catch(() => alive && setEmail(null))
      } else {
        setEmail(null)
      }
    }, PREVIEW_DELAY_MS)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [look, business, emailInput])

  async function sendTest() {
    const input = emailInput()
    if (input === null) return
    setSending(true)
    try {
      const sent = await sendTestEmail(input)
      showAlert({ tone: "success", title: "Prueba enviada", description: `Revisa ${sent.sent_to} y mira en qué pestaña cae.` })
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error, "No se pudo enviar la prueba") })
    } finally {
      setSending(false)
    }
  }

  const whatsapp = lookView?.whatsapp ?? null

  return (
    <aside aria-label="Vista previa" className="grid min-w-0 gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <SegmentedControl
          label="Vista previa"
          size="sm"
          value={tab}
          onValueChange={setTab}
          items={[
            { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
            { value: "email", label: "Correo", icon: Mail },
          ]}
        />
        <Select value={business} onValueChange={onBusiness}>
          <SelectTrigger className="w-48 max-w-full" aria-label="Ver como">
            <span className="min-w-0 truncate" title={business}>
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent>
            {(samples.length === 0 ? ["Negocio de ejemplo"] : samples).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tab === "whatsapp" ? (
        whatsapp === null ? (
          <p className="text-sm text-muted-foreground">Sin paso de WhatsApp.</p>
        ) : (
          <HsmPreview
            header={null}
            media={whatsapp.has_image_header ? { kind: "image", url: imageUrl } : null}
            body={whatsapp.body}
            examples={whatsappValues(whatsapp.params, { business, topic: whatsapp.topic, sender })}
            footer={whatsapp.footer}
            buttons={toTemplateButtons(whatsapp.buttons)}
            className="min-h-[420px]"
          />
        )
      ) : firstEmail === null ? (
        <p className="text-sm text-muted-foreground">Sin paso de correo.</p>
      ) : email === null ? (
        <Skeleton className="h-[460px] w-full rounded-2xl" />
      ) : (
        <div className="grid min-w-0 gap-2">
          <div className="min-w-0 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground" title={email.sender_name}>
              {email.sender_name}
            </p>
            <p className="truncate" title={email.subject}>
              {email.subject}
            </p>
          </div>
          <iframe
            title="Vista previa del correo"
            srcDoc={email.html}
            sandbox=""
            className="h-[460px] w-full rounded-xl border border-border bg-white"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Con los datos de este negocio.</span>
        {canWrite && tab === "email" && firstEmail !== null && (
          <Button variant="outline" size="sm" onClick={() => void sendTest()} disabled={sending}>
            <Send aria-hidden />
            {sending ? "Enviando…" : "Enviarme una prueba"}
          </Button>
        )}
      </div>
    </aside>
  )
}
