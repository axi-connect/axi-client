"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { RbacModuleSummaryDTO } from "@/app/(private)/rbac/model"
import { listRbacModulesSummary } from "@/app/(private)/rbac/service"

type OverviewContextValue = {
  modules: RbacModuleSummaryDTO[]
  loadingModules: boolean
  refreshModules: () => Promise<void>
}

const OverviewContext = createContext<OverviewContextValue | undefined>(undefined)

export function OverviewProvider({ children }: { children: React.ReactNode }) {
  const [modules, setModules] = useState<RbacModuleSummaryDTO[]>([])
  const [loading, setLoading] = useState(false)

  const refreshModules = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await listRbacModulesSummary()
      setModules(data.modules || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const value = useMemo<OverviewContextValue>(() => ({ modules, loadingModules: loading, refreshModules }), [modules, loading, refreshModules])
  return <OverviewContext.Provider value={value}>{children}</OverviewContext.Provider>
}

export function useOverview() {
  const ctx = useContext(OverviewContext)
  if (!ctx) throw new Error("useOverview must be used within an OverviewProvider")
  return ctx
}