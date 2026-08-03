"use client"

import { salesWhatsAppUrl } from "@/core/config/env"
import { BrandMark } from "@/shared/components/ui/brand-mark"
import { Button } from "@/shared/components/ui/button"

/**
 * Pantalla bloqueante de empresa suspendida (F15). La renderiza el
 * `AuthProvider` EN LUGAR de `children` cuando `status === "suspended"`:
 * bloqueo total sin depender de navegación y sin URL persistible (la fuente
 * de verdad del estado es siempre el backend; spec integracion_frontend §3.6).
 *
 * Polimórfica por `variant` (un solo componente, copy por causa): la
 * suspensión genérica manda a soporte; el trial vencido es un momento
 * COMERCIAL — invita a activar el plan por el WhatsApp de ventas.
 *
 * Sin reintento automático ni redirección al login: el login también
 * respondería 403 y crearía un loop de mensajes. El único camino es el botón,
 * que recarga la app limpia hacia el login (la reactivación habilita el
 * login de inmediato; si sigue bloqueada, el form muestra el mismo aviso).
 */

type SuspensionVariant = "suspended" | "trial_expired"

const COPY: Record<SuspensionVariant, { title: string; description: string }> = {
  suspended: {
    title: "La empresa está suspendida",
    description:
      "El acceso fue bloqueado por el administrador de la plataforma. " +
      "Contacta a soporte para reactivar el servicio.",
  },
  trial_expired: {
    title: "Tu prueba terminó",
    description:
      "Gracias por probar axi connect. Activa tu plan para recuperar el acceso " +
      "y seguir atendiendo a tus clientes — tus datos siguen intactos.",
  },
}

const TRIAL_CTA_MESSAGE = "Hola, mi prueba de axi connect terminó y quiero activar mi plan."

export function CompanySuspendedScreen({
  variant = "suspended",
}: {
  variant?: SuspensionVariant
}) {
  const copy = COPY[variant]
  const salesCta = variant === "trial_expired" ? salesWhatsAppUrl(TRIAL_CTA_MESSAGE) : null

  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center"
    >
      <BrandMark className="size-16 opacity-90" />
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>
      <div className="flex flex-col items-center gap-3 sm:flex-row">
        {salesCta ? (
          <Button asChild>
            <a href={salesCta} target="_blank" rel="noopener noreferrer">
              Hablar con ventas
            </a>
          </Button>
        ) : null}
        <Button
          variant={salesCta ? "outline" : "default"}
          onClick={() => {
            // Recarga completa: descarta todo estado en memoria (stores, sockets).
            window.location.href = "/auth/login"
          }}
        >
          Volver a intentar iniciar sesión
        </Button>
      </div>
    </div>
  )
}
