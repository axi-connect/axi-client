"use client"

import { useEffect, useMemo, useState } from "react"
import {
  BadgeCheck,
  CalendarDays,
  Check,
  CircleAlert,
  Clock,
  Hand,
  Kanban,
  Layers,
  LoaderCircle,
  Megaphone,
  Monitor,
  Package,
  Receipt,
  Repeat,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  Truck,
  Unplug,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

import { isHttpError } from "@/core/api/problem"
import { errorMessage } from "@/core/lib/error-messages"
import { useAuthContext } from "@/core/providers/auth-provider"
import { useAlert } from "@/core/providers/alert-provider"
import { Alert, AlertDescription } from "@/shared/components/ui/alert"
import { Badge } from "@/shared/components/ui/badge"
import { BrandMark } from "@/shared/components/ui/brand-mark"
import { Button } from "@/shared/components/ui/button"
import { SegmentedControl } from "@/shared/components/ui/segmented"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import {
  grantedScopes,
  initialChoices,
  initials,
  type AreaChoice,
  type ConsentRequest,
  type ConsentScope,
} from "@/modules/connected-apps/domain/connected-apps"
import {
  decideConsent,
  getConsentRequest,
} from "@/modules/connected-apps/infrastructure/services/connected-apps-service.adapter"

/** Ícono por área del catálogo de herramientas; el resto, genérico. */
const AREA_ICONS: Readonly<Record<string, LucideIcon>> = {
  catalogo: Package,
  pedidos: Receipt,
  cobros: Wallet,
  envios: Truck,
  contactos: Users,
  crm: Kanban,
  mercadeo: Megaphone,
  agenda: CalendarDays,
}

type ViewState =
  | { kind: "loading" }
  | { kind: "ready"; request: ConsentRequest }
  | { kind: "expired" }
  | { kind: "platform" }
  | { kind: "invalid"; detail: string }

/**
 * La pantalla de consentimiento OAuth de la puerta MCP (F5 «Axel OS», mockup
 * aprobado `docs/design/mockups/mcp-oauth-consent.html`).
 *
 * Llega aquí el navegador desde `/oauth/authorize` del servidor con
 * `?request=<id>`; la sesión es la del panel (el middleware manda al login si
 * no la hay y vuelve). La persona elige área por área —sin acceso, ver, ver y
 * cambiar— sin pasar de lo que la app pidió, y al decidir el navegador vuelve
 * a la app con su código (o con `access_denied`). El código nunca pasa por el
 * panel: lo arma el servidor en `redirect_to`.
 */
export function ConsentView({ requestId }: { requestId: string | null }) {
  const [state, setState] = useState<ViewState>(() =>
    requestId === null ? { kind: "invalid", detail: "Falta la solicitud." } : { kind: "loading" },
  )

  useEffect(() => {
    if (requestId === null) return
    let alive = true
    getConsentRequest(requestId)
      .then((request) => {
        if (alive) setState({ kind: "ready", request })
      })
      .catch((error: unknown) => {
        if (!alive) return
        if (isHttpError(error) && error.status === 404) setState({ kind: "expired" })
        else if (isHttpError(error) && error.status === 403) setState({ kind: "platform" })
        else setState({ kind: "invalid", detail: errorMessage(error) })
      })
    return () => {
      alive = false
    }
  }, [requestId])

  return (
    <div className="flex w-full justify-center px-4 pt-10 pb-16 sm:pt-14">
      {state.kind === "loading" ? <ConsentSkeleton /> : null}
      {state.kind === "ready" ? <ConsentCard request={state.request} /> : null}
      {state.kind === "expired" ? (
        <StateCard
          icon={Clock}
          tone="text-muted-foreground"
          title="Esta solicitud ya no está activa"
          body="Pasaron más de 15 minutos o ya la respondiste. Vuelve a la app y conéctala de nuevo."
        />
      ) : null}
      {state.kind === "platform" ? (
        <StateCard
          icon={ShieldAlert}
          tone="text-warning"
          title="Entra con un usuario de la empresa"
          body="Las apps se conectan a la cuenta de un negocio. Con un usuario de plataforma no se puede."
          action={<SwitchAccountButton label="Cambiar de cuenta" icon={Repeat} />}
        />
      ) : null}
      {state.kind === "invalid" ? (
        <StateCard
          icon={CircleAlert}
          tone="text-destructive"
          title="No podemos conectar esta app"
          body={`Por seguridad no seguimos. ${state.detail}`}
        />
      ) : null}
    </div>
  )
}

function ConsentCard({ request }: { request: ConsentRequest }) {
  const { showAlert } = useAlert()
  const [choices, setChoices] = useState<Record<string, AreaChoice>>(() => initialChoices(request.scopes))
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null)
  const scopes = useMemo(() => grantedScopes(request.scopes, choices), [request.scopes, choices])
  const unverified = request.client.source === "dcr" || request.loopback
  const appName = unverified ? `«${request.client.name}»` : request.client.name

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny")
    try {
      const { redirect_to } = await decideConsent(request.id, approve ? { approve, scopes } : { approve })
      // El servidor arma la vuelta a la app (con su código o el rechazo, `state` e `iss`).
      window.location.assign(redirect_to)
    } catch (error) {
      setBusy(null)
      if (isHttpError(error) && error.status === 404) {
        showAlert({ tone: "warning", title: "La solicitud venció", description: "Vuelve a la app y conéctala de nuevo." })
        return
      }
      showAlert({ tone: "error", title: "No pudimos guardar tu decisión", description: errorMessage(error) })
    }
  }

  return (
    <article
      aria-labelledby="consent-title"
      className="glass-overlay flex w-full max-w-[480px] flex-col gap-5 rounded-[28px] p-5 sm:p-7"
    >
      <AppPair request={request} />

      <div className="flex flex-col items-center gap-1.5 text-center">
        <h1 id="consent-title" className="font-heading text-[22px] leading-tight font-bold text-balance">
          {appName} quiere conectarse a tu cuenta de Axi
        </h1>
        {request.client.source === "cimd" && !request.loopback ? (
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px]">
            <BadgeCheck aria-hidden="true" className="text-success size-3.5" />
            Verificado por su dominio: <b className="text-foreground font-semibold">{hostOf(request.client.client_id)}</b>
          </p>
        ) : (
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-[12.5px]">
            <TriangleAlert aria-hidden="true" className="text-warning size-3.5" />
            Nombre declarado por la propia app: Axi no puede verificarlo
          </p>
        )}
      </div>

      <div className="bg-secondary flex items-center gap-3 rounded-2xl px-3.5 py-3">
        <span
          aria-hidden="true"
          className="bg-brand/15 text-brand flex size-9 flex-none items-center justify-center rounded-full text-[13px] font-semibold"
        >
          {initials(request.person.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold">{request.person.name}</p>
          <p className="text-muted-foreground truncate text-[12.5px]">
            {request.person.company} · {request.person.role}
          </p>
        </div>
        <SwitchAccountButton label="No soy yo" className="ml-auto" variant="link" />
      </div>

      {request.loopback ? (
        <Alert variant="warning" className="rounded-2xl">
          <TriangleAlert />
          <AlertDescription className="text-foreground text-[13px] leading-relaxed">
            {/* Un solo párrafo: la descripción del Alert es una grilla y partía cada fragmento en su línea. */}
            <p>
              <b className="font-medium">Esta app corre en un computador</b> y vuelve a{" "}
              <span className="font-mono break-all">{request.redirect_host}</span>. Continúa solo si tú la acabas de
              abrir. Si llegaste aquí por un enlace que te mandaron, cancela.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="consent-areas" className="flex flex-col gap-2">
        <h2
          id="consent-areas"
          className="text-muted-foreground text-[10.5px] font-semibold tracking-[0.1em] uppercase"
        >
          Podrá usar estas áreas
        </h2>
        <ul className="border-border bg-background/85 divide-border divide-y rounded-[18px] border">
          {request.scopes.map((scope) => (
            <AreaRow
              key={scope.scope}
              scope={scope}
              choice={choices[scope.toolset] ?? scope.level}
              disabled={busy !== null}
              onChange={(choice) => setChoices((current) => ({ ...current, [scope.toolset]: choice }))}
            />
          ))}
        </ul>
      </section>

      <ul className="text-muted-foreground flex flex-col gap-2 text-[12.5px]">
        <PromiseItem icon={ShieldCheck}>Solo hace lo que tu rol permite. Nunca más.</PromiseItem>
        <PromiseItem icon={Hand}>Antes de cambiar algo, te pide confirmarlo.</PromiseItem>
        <PromiseItem icon={Unplug}>
          La desconectas cuando quieras en <b className="text-foreground font-semibold">Mi cuenta</b>.
        </PromiseItem>
      </ul>

      <p className="text-muted-foreground text-center text-[12.5px]">
        Al aprobar vuelves a <b className="text-foreground font-semibold">{request.redirect_host}</b>
        {request.loopback ? " (este computador)" : ""}
      </p>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="contrast"
          className="h-10 w-full rounded-full"
          disabled={busy !== null || scopes.length === 0}
          onClick={() => {
            void decide(true)
          }}
        >
          {busy === "approve" ? (
            <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" />
          ) : (
            <Check aria-hidden="true" className="size-4" />
          )}
          {busy === "approve" ? "Conectando…" : "Permitir acceso"}
        </Button>
        <Button
          type="button"
          variant="glass"
          className="h-10 w-full"
          disabled={busy !== null}
          onClick={() => {
            void decide(false)
          }}
        >
          {busy === "deny" ? <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" /> : null}
          Cancelar
        </Button>
        {scopes.length === 0 ? (
          <p role="status" className="text-muted-foreground text-center text-[12px]">
            Elige al menos un área para permitir el acceso.
          </p>
        ) : null}
      </div>

      <p className="text-muted-foreground text-center text-[11.5px] leading-normal">
        Al permitirlo, {unverified ? "esta app" : request.client.name} podrá ver los datos de {request.person.company}{" "}
        de las áreas elegidas, con tu usuario. Lee los{" "}
        <a href="/legal/terminos" target="_blank" rel="noreferrer" className="text-foreground underline underline-offset-2">
          términos
        </a>
        .
      </p>
    </article>
  )
}

function AppPair({ request }: { request: ConsentRequest }) {
  return (
    <div className="flex items-center justify-center gap-3.5" aria-hidden="true">
      <span className="border-border bg-background flex size-14 items-center justify-center overflow-hidden rounded-2xl border">
        {request.loopback ? (
          <Monitor className="text-muted-foreground size-6" />
        ) : request.client.logo_uri?.startsWith("https://") ? (
          // El logo lo declara la app en su documento; se muestra, no se ejecuta.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={request.client.logo_uri} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="font-heading text-[22px] font-bold">{request.client.name.slice(0, 1).toUpperCase()}</span>
        )}
      </span>
      <span className="text-muted-foreground flex gap-1">
        <span className="size-[5px] rounded-full bg-current opacity-50" />
        <span className="size-[5px] rounded-full bg-current opacity-50" />
        <span className="size-[5px] rounded-full bg-current opacity-50" />
      </span>
      <span className="border-border bg-background flex size-14 items-center justify-center rounded-2xl border">
        <BrandMark className="size-8" />
      </span>
    </div>
  )
}

function AreaRow({
  scope,
  choice,
  disabled,
  onChange,
}: {
  scope: ConsentScope
  choice: AreaChoice
  disabled: boolean
  onChange: (choice: AreaChoice) => void
}) {
  const Icon = AREA_ICONS[scope.toolset] ?? Layers
  return (
    <li className={cn("grid grid-cols-[32px_minmax(0,1fr)] gap-x-3 gap-y-1.5 px-3.5 py-3", choice === "no" && "opacity-70")}>
      <span className="bg-secondary flex size-8 items-center justify-center rounded-[10px]">
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold">
          {scope.title}
          {scope.level === "escribir" ? <Badge variant="outline">Pidió ver y cambiar</Badge> : null}
        </p>
        <p className="text-muted-foreground text-[12.5px] leading-snug">{scope.summary}</p>
      </div>
      <SegmentedControl<AreaChoice>
        className="col-span-2 mt-1 w-fit max-w-full sm:col-span-1 sm:col-start-2"
        size="sm"
        surface="inline"
        label={`Acceso a ${scope.title}`}
        value={choice}
        onValueChange={(next) => {
          if (!disabled) onChange(next)
        }}
        items={[
          { value: "no", label: "Sin acceso", disabled },
          { value: "leer", label: "Ver", disabled },
          { value: "escribir", label: "Ver y cambiar", disabled: disabled || scope.level === "leer" },
        ]}
      />
    </li>
  )
}

function PromiseItem({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <Icon aria-hidden="true" className="text-foreground mt-0.5 size-[15px] flex-none" />
      <span>{children}</span>
    </li>
  )
}

/** Cierra la sesión y vuelve a esta misma solicitud por el login (el middleware conserva `next`). */
function SwitchAccountButton({
  label,
  icon: Icon,
  className,
  variant = "glass",
}: {
  label: string
  icon?: LucideIcon
  className?: string
  variant?: "glass" | "link"
}) {
  const { logout } = useAuthContext()
  return (
    <Button
      type="button"
      variant={variant}
      className={cn(
        variant === "link"
          ? "text-foreground decoration-border h-auto p-0 text-[12.5px] font-medium underline underline-offset-[3px]"
          : "h-10 w-full",
        className,
      )}
      onClick={() => {
        const next = window.location.pathname + window.location.search
        void logout().then(() => {
          window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`)
        })
      }}
    >
      {Icon ? <Icon aria-hidden="true" className="size-4" /> : null}
      {label}
    </Button>
  )
}

function StateCard({
  icon: Icon,
  tone,
  title,
  body,
  action,
}: {
  icon: LucideIcon
  tone: string
  title: string
  body: string
  action?: React.ReactNode
}) {
  return (
    <article
      aria-labelledby="consent-state-title"
      className="glass-overlay flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[28px] p-7 text-center"
    >
      <span className="bg-secondary flex size-13 items-center justify-center rounded-2xl">
        <Icon aria-hidden="true" className={cn("size-[22px]", tone)} />
      </span>
      <h1 id="consent-state-title" className="font-heading text-[19px] font-bold">
        {title}
      </h1>
      <p className="text-muted-foreground max-w-[40ch] text-[13.5px]">{body}</p>
      {action ? <div className="w-full">{action}</div> : null}
    </article>
  )
}

function ConsentSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando la solicitud" className="glass-overlay flex w-full max-w-[480px] flex-col gap-5 rounded-[28px] p-7">
      <Skeleton className="mx-auto h-14 w-40 rounded-2xl" />
      <Skeleton className="mx-auto h-6 w-72" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-[18px]" />
      <Skeleton className="h-10 w-full rounded-full" />
    </div>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
