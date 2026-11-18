"use client"

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, Plug, Unplug } from "lucide-react"

import { errorMessage } from "@/core/lib/error-messages"
import { useAlert } from "@/core/providers/alert-provider"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { RelativeDate } from "@/shared/components/ui/relative-date"
import { Skeleton } from "@/shared/components/ui/skeleton"
import { StatusDotBadge } from "@/shared/components/ui/status-badges"
import { areaChipLabel, type ConnectedApp } from "@/modules/connected-apps/domain/connected-apps"
import {
  disconnectApp,
  listConnectedApps,
} from "@/modules/connected-apps/infrastructure/services/connected-apps-service.adapter"

type State = { kind: "loading" } | { kind: "ready"; apps: ConnectedApp[] } | { kind: "error"; message: string }

/**
 * «Aplicaciones conectadas» en /cuenta (F5 «Axel OS», mockup aprobado): las
 * apps —Claude u otras— que usan Axi con el usuario de ESTA persona.
 * Desconectar corta el acceso al instante (el servidor revoca la concesión y
 * todos sus tokens en una transacción).
 */
export function ConnectedAppsCard() {
  const { showAlert, showModal, closeModal } = useAlert()
  const [state, setState] = useState<State>({ kind: "loading" })

  const load = useCallback(() => {
    listConnectedApps()
      .then((apps) => setState({ kind: "ready", apps }))
      .catch((error: unknown) => setState({ kind: "error", message: errorMessage(error) }))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function confirmDisconnect(app: ConnectedApp) {
    showModal({
      title: `¿Desconectar ${app.client.name}?`,
      description:
        `${app.client.name} dejará de ver y cambiar los datos de tu empresa en cuanto confirmes. ` +
        "Las acciones que dejó pendientes se descartan.",
      className: "sm:max-w-md",
      actions: [
        { label: "Cancelar", variant: "outline", id: "connected-app-disconnect-cancel" },
        {
          label: "Desconectar",
          variant: "destructive",
          keepOpen: true,
          id: "connected-app-disconnect-confirm",
          onClick: () => {
            void disconnectApp(app.id)
              .then(() => {
                closeModal()
                setState((current) =>
                  current.kind === "ready"
                    ? { kind: "ready", apps: current.apps.filter((item) => item.id !== app.id) }
                    : current,
                )
                showAlert({ tone: "success", title: `${app.client.name} quedó desconectada` })
              })
              .catch((error: unknown) => {
                closeModal()
                showAlert({ tone: "error", title: "No pudimos desconectarla", description: errorMessage(error) })
              })
          },
        },
      ],
    })
  }

  return (
    <section
      aria-labelledby="connected-apps-title"
      className="border-border bg-card max-w-xl rounded-2xl border p-4 sm:p-6"
    >
      <div className="mb-3 flex items-start gap-3">
        <Plug aria-hidden="true" className="text-muted-foreground mt-1 size-5 shrink-0" />
        <div className="space-y-1">
          <h2 id="connected-apps-title" className="text-lg font-semibold">
            Aplicaciones conectadas
          </h2>
          <p className="text-muted-foreground text-sm">
            Apps que usan Axi con tu usuario, como Claude. Solo pueden lo que tu rol permite y piden confirmación
            antes de cambiar algo.
          </p>
        </div>
      </div>

      {state.kind === "loading" ? (
        <div aria-busy="true" aria-label="Cargando apps conectadas" className="flex flex-col gap-3 py-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="flex flex-col items-start gap-2 py-3">
          <p className="text-muted-foreground text-sm">No pudimos cargar tus apps conectadas. {state.message}</p>
          <Button type="button" variant="outline" size="sm" onClick={load}>
            Reintentar
          </Button>
        </div>
      ) : null}

      {state.kind === "ready" && state.apps.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <span className="bg-secondary text-muted-foreground mb-1 flex size-12 items-center justify-center rounded-[14px]">
            <Plug aria-hidden="true" className="size-[22px]" />
          </span>
          <h3 className="text-base font-semibold">Ninguna app conectada</h3>
          <p className="text-muted-foreground max-w-[46ch] text-[13.5px]">
            Cuando conectes Claude u otra app a Axi, aparecerá aquí con lo que puede ver y cambiar.
          </p>
        </div>
      ) : null}

      {state.kind === "ready" && state.apps.length > 0 ? (
        <ul className="divide-border/60 divide-y">
          {state.apps.map((app) => (
            <li
              key={app.id}
              className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-3.5 gap-y-2 py-4 sm:grid-cols-[44px_minmax(0,1fr)_auto]"
            >
              <span
                aria-hidden="true"
                className="bg-secondary font-heading flex size-11 items-center justify-center overflow-hidden rounded-[13px] text-[17px] font-bold"
              >
                {app.client.logo_uri?.startsWith("https://") ? (
                  // El logo lo declara la app; se muestra, no se ejecuta.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={app.client.logo_uri} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  app.client.name.slice(0, 1).toUpperCase()
                )}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] font-semibold">
                  <span className="break-words">{app.client.name}</span>
                  {app.client.source === "cimd" ? (
                    <StatusDotBadge tone="ok">Verificada · {hostOf(app.client.client_id)}</StatusDotBadge>
                  ) : (
                    <StatusDotBadge tone="warning">Nombre no verificado</StatusDotBadge>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[12.5px]">
                  Conectada <RelativeDate iso={app.connected_at} /> ·{" "}
                  {app.last_used_at === null ? "Sin uso todavía" : (
                    <>
                      Último uso <RelativeDate iso={app.last_used_at} />
                    </>
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {app.areas.map((area) => (
                    <Badge key={area.scope} variant="outline" className="border-border font-normal">
                      {areaChipLabel(area)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="col-start-2 sm:col-start-3 sm:row-start-1">
                <Button type="button" variant="outline" size="sm" onClick={() => confirmDisconnect(app)}>
                  <Unplug aria-hidden="true" className="size-4" />
                  Desconectar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <p className="border-border/60 text-muted-foreground mt-4 border-t pt-3 text-[12.5px]">
        Desconectar corta el acceso al instante. Cambiar tu contraseña también las desconecta.{" "}
        <a
          href="/legal/terminos"
          target="_blank"
          rel="noreferrer"
          className="text-foreground inline-flex items-center gap-1 font-medium underline-offset-[3px] hover:underline"
        >
          Términos <ExternalLink aria-hidden="true" className="size-3" />
        </a>
      </p>
    </section>
  )
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
