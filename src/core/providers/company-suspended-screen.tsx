"use client"

import { BrandMark } from "@/shared/components/ui/brand-mark"
import { Button } from "@/shared/components/ui/button"

/**
 * Pantalla bloqueante de empresa suspendida (F15). La renderiza el
 * `AuthProvider` EN LUGAR de `children` cuando `status === "suspended"`:
 * bloqueo total sin depender de navegación y sin URL persistible (la fuente
 * de verdad del estado es siempre el backend; spec integracion_frontend §3.6).
 *
 * Sin reintento automático ni redirección al login: el login también
 * respondería 403 y crearía un loop de mensajes. El único camino es el botón,
 * que recarga la app limpia hacia el login (la reactivación habilita el
 * login de inmediato; si sigue suspendida, el form muestra el mismo aviso).
 */
export function CompanySuspendedScreen() {
  return (
    <div
      role="alert"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background px-6 text-center"
    >
      <BrandMark className="size-16 opacity-90" />
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">La empresa está suspendida</h1>
        <p className="text-sm text-muted-foreground">
          El acceso fue bloqueado por el administrador de la plataforma.
          Contacta a soporte para reactivar el servicio.
        </p>
      </div>
      <Button
        onClick={() => {
          // Recarga completa: descarta todo estado en memoria (stores, sockets).
          window.location.href = "/auth/login"
        }}
      >
        Volver a intentar iniciar sesión
      </Button>
    </div>
  )
}
