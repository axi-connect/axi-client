"use client"

import { StatusAlert, type StatusAlertProps} from "@/components/ui/notice"
import { createContext, useContext, useState, ReactNode } from "react"

type AlertContextType = {
  showAlert: (alert: StatusAlertProps) => void
}

const AlertContext = createContext<AlertContextType | null>(null)

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<StatusAlertProps | null>(null)

  const showAlert = (a: StatusAlertProps) => setAlert(a)

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      {alert && (
        <StatusAlert
          onOpenChange={() => setAlert(null)}
          {...alert}
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