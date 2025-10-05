"use client"

import { StatusAlert } from "@/components/ui/notice"
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
  showAlert: (alert: Alert) => void
}

const AlertContext = createContext<AlertContextType | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<Alert | null>(null)

  const showAlert = (a: Alert) => setAlert(a)

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <StatusAlert {...alert} onOpenChange={() => setAlert(null)}/>
      )}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const ctx = useContext(AlertContext)
  if (!ctx) throw new Error("useAlert must be used inside AlertProvider")
  return ctx
}