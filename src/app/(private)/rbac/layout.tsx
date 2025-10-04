"use client"

import type { ReactNode } from "react"
import { OverviewProvider } from "./context/overview.context"

export default function RbacLayout({ children, form }: { children: ReactNode; form: ReactNode }) {
  return (
    <OverviewProvider>
      {children}
      {form}
    </OverviewProvider>
  )
}