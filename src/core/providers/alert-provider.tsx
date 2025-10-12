"use client"

import { Modal, ModalConfig } from "../../shared/components/ui/modal"
import { StatusAlert } from "@/shared/components/ui/notice"
import { createContext, useContext, useState, ReactNode } from "react"

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

  const showAlert = (a: Alert) => setAlert(a)
  const showModal = (config: ModalConfig) => {
    setModalOpen(true)
    setConfigModal(config)
  }

  const closeModal = () => {
    setModalOpen(false)
    setConfigModal(null)
  }

  return (
    <AlertContext.Provider value={{ showAlert, showModal, closeModal }}>
      {children}
      {alert && (
        <StatusAlert {...alert} onOpenChange={() => setAlert(null)}/>
      )}
      {
        <Modal
          open={modalOpen}
          key="modal-notification"
          onOpenChange={setModalOpen}
          config={modalConfig || undefined}
        >
          <div className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. Se eliminarán de forma permanente los datos asociados.
          </div>
        </Modal>
      }
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider")
  return ctx
}