"use client"

import { Modal, ModalConfig } from "../../shared/components/ui/modal"
import { StatusAlert } from "@/shared/components/ui/notice"
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react"

type Alert = {
  tone: "success" | "error" | "warning" | "info"
  title: string
  description?: string
  actions?: { label: string; onClick: () => void }[]
  autoCloseMs?: number
  open?: boolean
}

type AlertContextType = {
  closeModal: () => void
  showAlert: (alert: Alert) => void
  showModal: (config: ModalConfig) => void
}

const AlertContext = createContext<AlertContextType | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [alert, setAlert] = useState<Alert | null>(null)
  const [modalConfig, setConfigModal] = useState<ModalConfig | null>(null)

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
  const showAlert = useCallback((a: Alert) => setAlert(a), [])

  const showModal = useCallback((config: ModalConfig) => {
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
      {alert && (
        <StatusAlert {...alert} onOpenChange={() => setAlert(null)}/>
      )}
      {/*
        SIN cuerpo fijo. El "Esta acción no se puede deshacer. Se eliminarán de
        forma permanente los datos asociados." que vivía aquí se pintaba en
        TODAS las confirmaciones de la app y contradecía la copia de las que no
        son destructivas: "puedes volver a conectarlo cuando quieras",
        "volverás a la última versión guardada", "los contactos no se ven
        afectados"… La consecuencia la escribe cada `description`; quien
        necesite más, usa `config.body`.
      */}
      <Modal
        open={modalOpen}
        key="modal-notification"
        onOpenChange={setModalOpen}
        config={modalConfig || undefined}
      />
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider")
  return ctx
}