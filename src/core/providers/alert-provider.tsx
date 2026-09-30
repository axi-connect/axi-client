"use client"

import dynamic from "next/dynamic"
import type { ModalConfig } from "../../shared/components/ui/modal"
import type { AppAlert } from "@/core/notifications"
import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react"

/*
  Carga diferida, a propósito. Este provider vive en el layout raíz: lo que
  importe de forma estática viaja en el JS común de TODAS las rutas. sileo trae
  consigo `motion/react` y el Modal trae Radix Dialog y framer-motion; la
  landing, `/comenzar` y `/platform` los pagaban sin mostrar un solo aviso.

  - Los avisos se cargan al primer `showAlert` o en el primer momento de reposo
    del navegador (para los slices que llaman `notify` directamente). sileo
    guarda en su store los avisos emitidos antes de montar el viewport y los
    pinta al montarse, así que ninguno se pierde por llegar temprano.
  - El Modal se monta la primera vez que alguien lo abre.
*/
const NotificationsToaster = dynamic(
  () => import("@/core/notifications/toaster").then((m) => m.NotificationsToaster),
  { ssr: false },
)
const Modal = dynamic(() => import("../../shared/components/ui/modal").then((m) => m.Modal), { ssr: false })

let notificationsModule: Promise<typeof import("@/core/notifications")> | null = null
function loadNotifications() {
  notificationsModule ??= import("@/core/notifications")
  return notificationsModule
}

/** Primer momento de reposo, con tope: en un panel ocupado no se espera para siempre. */
function whenIdle(fn: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(fn, { timeout: 2500 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(fn, 1200)
  return () => window.clearTimeout(id)
}

type AlertContextType = {
  closeModal: () => void
  showAlert: (alert: AppAlert) => void
  showModal: (config: ModalConfig) => void
}

const AlertContext = createContext<AlertContextType | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalConfig, setConfigModal] = useState<ModalConfig | null>(null)
  const [toasterWanted, setToasterWanted] = useState(false)
  // Una vez montado, el Modal se queda: así conserva su animación de cierre.
  const [modalWanted, setModalWanted] = useState(false)

  useEffect(() => whenIdle(() => setToasterWanted(true)), [])

  /*
    MEMORIZADAS, Y NO ES COSMÉTICA. Sin esto, cada aviso que aparece o se cierra
    en CUALQUIER parte de la app cambia la identidad de `showAlert` y del value
    del contexto, y eso re-crea todo `useCallback`/`useEffect` que los tenga en
    sus dependencias.

    El síntoma real que lo destapó: la ficha de un lead sondea mientras busca
    datos, con un temporizador de 90 s para rendirse. Ese temporizador se
    reiniciaba desde cero con cada alerta de la aplicación, así que nunca
    saltaba y la petición se repetía indefinidamente. El efecto estaba bien
    escrito; lo que fallaba era esta identidad inestable, tres capas más arriba.
  */
  const showAlert = useCallback((a: AppAlert) => {
    // El aviso lo pinta sileo (core/notifications, DESIGN-SYSTEM §9.4). Antes
    // era un `setAlert` que REEMPLAZABA: dos avisos seguidos y el primero se
    // perdía sin leerse. Ahora cada uno tiene su vida y los errores se apilan.
    setToasterWanted(true)
    void loadNotifications().then((m) => m.notify.fromAlert(a))
  }, [])

  const showModal = useCallback((config: ModalConfig) => {
    setModalWanted(true)
    setModalOpen(true)
    setConfigModal(config)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setConfigModal(null)
  }, [])

  const value = useMemo(
    () => ({ showAlert, showModal, closeModal }),
    [showAlert, showModal, closeModal],
  )

  return (
    <AlertContext.Provider value={value}>
      {children}
      {toasterWanted && <NotificationsToaster />}
      {/*
        SIN cuerpo fijo. El "Esta acción no se puede deshacer. Se eliminarán de
        forma permanente los datos asociados." que vivía aquí se pintaba en
        TODAS las confirmaciones de la app y contradecía la copia de las que no
        son destructivas: "puedes volver a conectarlo cuando quieras",
        "volverás a la última versión guardada", "los contactos no se ven
        afectados"… La consecuencia la escribe cada `description`; quien
        necesite más, usa `config.body`.
      */}
      {modalWanted && (
        <Modal
          open={modalOpen}
          key="modal-notification"
          onOpenChange={setModalOpen}
          config={modalConfig || undefined}
        />
      )}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider")
  return ctx
}