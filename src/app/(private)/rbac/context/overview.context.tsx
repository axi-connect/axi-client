"use client"

import { listRbacModulesSummary } from "../service"
import type { RbacModuleSummaryDTO, RbacRoleDTO } from "../model"
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type OverviewContextValue = {
  loadingModules: boolean
  modules: RbacModuleSummaryDTO[]
  selectedRole: RbacRoleDTO | null
  refreshOverview: () => void
  refreshModules: () => Promise<void>
  setSelectedRole: (role: RbacRoleDTO | null) => void
}

const OverviewContext = createContext<OverviewContextValue | undefined>(undefined)

export function OverviewProvider({ children }: { children: React.ReactNode }) {

  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState<RbacModuleSummaryDTO[]>([])
  const [selectedRole, setSelectedRole] = useState<RbacRoleDTO | null>(null)

  const refreshModules = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await listRbacModulesSummary()
      setModules(data.modules)
    } catch (err) {
      console.error("Failed to fetch modules:", err)
      setModules([])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshOverview = useCallback(async () => {
    window.dispatchEvent(new CustomEvent("rbac:overview:refresh"))
  }, [])

  useEffect(() => {
    refreshModules()
  }, [refreshModules])

  const value = useMemo<OverviewContextValue>(() => ({ modules, loadingModules: loading, refreshModules, refreshOverview, selectedRole, setSelectedRole }), [modules, loading, refreshModules, refreshOverview, selectedRole, setSelectedRole])

  return <OverviewContext.Provider value={value}>{children}</OverviewContext.Provider>
}

export function useOverview() {
  const ctx = useContext(OverviewContext)
  if (!ctx) throw new Error("useOverview must be used within an OverviewProvider")
  return ctx
}