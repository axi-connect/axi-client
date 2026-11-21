"use client"

import { useEffect, useState } from "react"
import { Building2, Info, Mail, PenLine, Pencil, Plus, TriangleAlert } from "lucide-react"

import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { useAuthContext } from "@/core/providers/auth-provider"
import { CopyButton } from "@/shared/components/features/field-list"
import { Avatar } from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import { Callout } from "@/shared/components/ui/callout"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Skeleton } from "@/shared/components/ui/skeleton"
import type { OutreachSenderDTO } from "@/modules/companies/domain/company"
import {
  formFromSignature,
  initials,
  senderWithSignature,
  SIGNATURE_LIMITS,
  signatureLines,
  signaturePayload,
  validateSignature,
  type SignatureErrors,
  type SignatureForm,
} from "@/modules/companies/domain/outreach-signature"
import {
  getOutreachSender,
  updateOutreachSignature,
} from "@/modules/companies/infrastructure/services/company-service.adapter"

const MANAGE_PERMISSION = "companies:manage"

/**
 * «Correo de prospección» (P3a, D1) + «Quién firma» (Fase B2).
 *
 * La dirección nace del nombre comercial y no se configura. Lo que sí se
 * configura es la firma: la persona que firma los correos y SMS de
 * prospección. Se edita en la misma tarjeta (cinco campos, sin modal).
 */
export function OutreachSenderCard() {
  const [sender, setSender] = useState<OutreachSenderDTO | null>(null)
  const [failed, setFailed] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    getOutreachSender()
      .then(setSender)
      .catch(() => setFailed(true))
  }, [])

  // Sin permiso o sin API aún: la tarjeta no es imprescindible y no estorba.
  if (failed) return null

  return (
    <section className="rounded-2xl border border-border bg-card p-5 md:p-6" aria-labelledby="outreach-sender-title">
      <h2 id="outreach-sender-title" className="text-lg font-medium">
        Correo de prospección
      </h2>
      <p className="mb-4 text-sm text-pretty text-muted-foreground">
        Desde dónde salen tus correos en frío y quién los firma.
      </p>
      {sender === null ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <div className="@container">
          <div className="grid gap-6 @3xl:grid-cols-2">
            <SenderBlock sender={sender} />
            {editing ? (
              <SignatureEditor
                sender={sender}
                onCancel={() => setEditing(false)}
                onSaved={(next) => {
                  setSender(next)
                  setEditing(false)
                }}
              />
            ) : (
              <SignaturePreview sender={sender} onEdit={() => setEditing(true)} />
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function SenderBlock({ sender }: { sender: OutreachSenderDTO }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-1 flex items-center gap-1.5 font-sans text-sm font-semibold">
        <Mail aria-hidden className="size-4" /> Sale desde
      </h3>
      <p className="mb-3 text-xs text-pretty text-muted-foreground">
        Tus correos de prospección salen de esta dirección y las respuestas llegan a tu CRM. La dirección no se
        configura.
      </p>
      {/* Una columna: la dirección es el dato y no se parte en media columna (auditoría B2). */}
      <dl className="space-y-3 text-sm">
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">Dirección</dt>
          <dd className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 [overflow-wrap:anywhere]">{sender.address}</span>
            <CopyButton value={sender.address} label="Dirección" />
          </dd>
        </div>
        <div className="space-y-0.5">
          <dt className="text-muted-foreground">Lo que ve quien recibe</dt>
          <dd className="line-clamp-2 [overflow-wrap:anywhere]" title={sender.display_name}>
            {sender.display_name}
          </dd>
        </div>
      </dl>
      {sender.paused && (
        <p className="mt-3 flex items-start gap-2 text-sm text-pretty">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" />
          <span>
            Pausamos tus correos en frío para cuidar la entrega de todos
            {sender.pause_reason === null ? "" : `: ${sender.pause_reason.toLowerCase()}`}. Escríbenos y lo revisamos
            contigo.
          </span>
        </p>
      )}
    </div>
  )
}

function SignaturePreview({ sender, onEdit }: { sender: OutreachSenderDTO; onEdit: () => void }) {
  const { hasPermission } = useAuthContext()
  const { signature } = sender
  const filled = signature.person_name !== null
  const canEdit = hasPermission(MANAGE_PERMISSION)
  const lines = signatureLines(signature, sender.from_name)
  return (
    <div className="min-w-0">
      <SignatureHeading />
      {!filled && canEdit && (
        <Callout tone="info" icon={Info} className="mb-3">
          Un correo en frío firmado por una persona se lee como un correo, no como publicidad. Agrega quién escribe.
        </Callout>
      )}
      <div className="flex items-center gap-3.5 rounded-xl border border-border bg-background p-4">
        {filled && signature.photo_url !== null ? (
          <Avatar src={signature.photo_url} alt={`Foto de ${lines.name}`} fallback={lines.name} size={52} />
        ) : filled ? (
          // Las mismas iniciales que lleva el correo «marca» cuando no hay foto.
          <span aria-hidden className="grid size-[52px] shrink-0 place-items-center rounded-full bg-primary/15 text-base font-semibold">
            {initials(lines.name)}
          </span>
        ) : (
          <span className="grid size-[52px] shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <Building2 aria-hidden className="size-5" />
          </span>
        )}
        <div className="min-w-0 text-sm leading-snug">
          {/* En móvil no hay hover: dos líneas antes de difuminar; desde sm, una con title.
              La base es `truncate` (el que el sistema difumina): `sm:truncate` pintaba «…». */}
          <p className="truncate font-semibold max-sm:line-clamp-2 max-sm:whitespace-normal max-sm:[overflow-wrap:anywhere]" title={lines.name}>
            {lines.name}
          </p>
          <p
            className="truncate text-muted-foreground max-sm:line-clamp-2 max-sm:whitespace-normal max-sm:[overflow-wrap:anywhere]"
            title={lines.role ?? undefined}
          >
            {lines.role ?? "Sin persona: firma el negocio"}
          </p>
          {lines.contact !== null && (
            <p className="truncate text-muted-foreground" title={lines.contact}>
              {lines.contact}
            </p>
          )}
        </div>
      </div>
      {canEdit && (
        <div className="mt-3.5 flex justify-end">
          <Button variant="outline" size="sm" onClick={onEdit}>
            {filled ? <Pencil aria-hidden /> : <Plus aria-hidden />}
            {filled ? "Editar firma" : "Agregar firma"}
          </Button>
        </div>
      )}
    </div>
  )
}

function SignatureHeading() {
  return (
    <>
      <h3 className="mb-1 flex items-center gap-1.5 font-sans text-sm font-semibold">
        <PenLine aria-hidden className="size-4" /> Quién firma
      </h3>
      <p className="mb-3 text-xs text-pretty text-muted-foreground">
        La persona que firma tus correos y SMS de prospección.
      </p>
    </>
  )
}

const FIELDS: { key: keyof SignatureForm; label: string; placeholder: string; max: number; hint?: string; full?: boolean }[] = [
  { key: "person_name", label: "Nombre", placeholder: "Tu nombre y apellido", max: SIGNATURE_LIMITS.person_name },
  { key: "title", label: "Cargo", placeholder: "Tu cargo (p. ej. Gerente comercial)", max: SIGNATURE_LIMITS.title },
  {
    key: "photo_url",
    label: "Foto (URL)",
    placeholder: "https://…/foto.jpg",
    max: SIGNATURE_LIMITS.url,
    hint: "Cuadrada, de frente. Sin foto van tus iniciales.",
    full: true,
  },
  { key: "phone", label: "Teléfono", placeholder: "+57 300 000 0000", max: SIGNATURE_LIMITS.phone, hint: "Opcional." },
  { key: "website", label: "Sitio web", placeholder: "tunegocio.co", max: SIGNATURE_LIMITS.url },
]

function SignatureEditor({
  sender,
  onCancel,
  onSaved,
}: {
  sender: OutreachSenderDTO
  onCancel: () => void
  onSaved: (next: OutreachSenderDTO) => void
}) {
  const { showAlert } = useAlert()
  const [form, setForm] = useState<SignatureForm>(() => formFromSignature(sender.signature))
  const [saving, setSaving] = useState(false)
  // El error se enseña al salir del campo o al intentar guardar, no al teclear la «h».
  const [touched, setTouched] = useState<Partial<Record<keyof SignatureForm, boolean>>>({})
  const [submitted, setSubmitted] = useState(false)
  const errors: SignatureErrors = validateSignature(form)
  const invalid = Object.keys(errors).length > 0

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (invalid) return
    setSaving(true)
    try {
      const saved = await updateOutreachSignature(signaturePayload(form))
      showAlert({ tone: "success", title: "Firma guardada" })
      // Ya guardó: si la recarga falla, se pinta con la respuesta del PUT.
      onSaved(await getOutreachSender().catch(() => senderWithSignature(sender, saved)))
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error, "No se pudo guardar la firma") })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="min-w-0" onSubmit={save} noValidate>
      <SignatureHeading />
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const id = `signature-${field.key}`
          const error = submitted || touched[field.key] === true ? errors[field.key] : undefined
          return (
            <div key={field.key} className={field.full === true ? "grid gap-1.5 sm:col-span-2" : "grid gap-1.5"}>
              <Label htmlFor={id}>{field.label}</Label>
              <Input
                id={id}
                value={form[field.key]}
                maxLength={field.max}
                placeholder={field.placeholder}
                aria-invalid={error !== undefined}
                aria-describedby={error !== undefined || field.hint !== undefined ? `${id}-hint` : undefined}
                onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                onBlur={() => setTouched((prev) => ({ ...prev, [field.key]: true }))}
              />
              {(error ?? field.hint) !== undefined && (
                <p id={`${id}-hint`} className={error === undefined ? "text-xs text-muted-foreground" : "text-xs text-destructive"}>
                  {error ?? field.hint}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-3.5 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={(submitted && invalid) || saving}>
          {saving ? "Guardando…" : "Guardar firma"}
        </Button>
      </div>
    </form>
  )
}
