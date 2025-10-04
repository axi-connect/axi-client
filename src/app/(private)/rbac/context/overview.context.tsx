"use client"

import { listRbacModulesSummary } from "@/app/(private)/rbac/service"
import type { RbacModuleSummaryDTO, RbacRoleDTO } from "@/app/(private)/rbac/model"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { RoleFormValues } from "../roles/form/form.config"

type OverviewContextValue = {
  loadingModules: boolean
  modules: RbacModuleSummaryDTO[]
  refreshModules: () => Promise<void>
  refreshOverview: () => Promise<void>
  selectedRole: RoleFormValues | undefined
  refreshRole: (role: RoleFormValues) => void
}

const OverviewContext = createContext<OverviewContextValue | undefined>(undefined)

export function OverviewProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState<RbacModuleSummaryDTO[]>([])
  const [selectedRole, setSelectedRole] = useState<RoleFormValues | undefined>(undefined)

  const refreshModules = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await listRbacModulesSummary()
      setModules(data.modules || [])
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshOverview = useCallback(async () => {
    window.dispatchEvent(new CustomEvent("rbac:refresh:overview"))
  }, [])

  const refreshRole = useCallback((role: RoleFormValues) => setSelectedRole(role), [])

  const value = useMemo<OverviewContextValue>(() => ({ modules, loadingModules: loading, refreshModules, refreshOverview, refreshRole, selectedRole }), [modules, loading, refreshModules, refreshOverview, refreshRole, selectedRole])
  return <OverviewContext.Provider value={value}>{children}</OverviewContext.Provider>
}

export function useOverview() {
  const ctx = useContext(OverviewContext)
  if (!ctx) throw new Error("useOverview must be used within an OverviewProvider")
  return ctx
}