// RBAC module models
export type RbacSortDir = "asc" | "desc";

/**
 * High-level summary counters for the RBAC overview endpoint.
*/
export type RbacOverviewSummary = {
  roles_count: number
  modules_count: number
  users_count: number
}

/**
 * Permission alias used across modules/submodules.
*/
export type RbacPermission = "read" | "create" | "update" | "delete"

export type RbacSubmoduleDTO = {
  id: number
  name: string
  code: string
  path: string
  icon: string | null
  permissions: RbacPermission[]
}

export type RbacModuleDTO = {
  id: number
  name: string
  code: string
  path: string
  icon: string | null
  is_public: boolean
  permissions: RbacPermission[]
  submodules?: RbacSubmoduleDTO[]
}

export type RbacRoleDTO = {
  id: number
  name: string
  description: string | null
  modules: RbacModuleDTO[]
}

// API contracts
export type RbacOverviewView = "summary" | "detail";

export interface GetRbacOverviewParams {
  view?: RbacOverviewView
  limit?: number
  offset?: number
  sortBy?: string
  sortDir?: RbacSortDir
  // Optional client-side search passthrough
  [key: string]: unknown
}

export interface ApiRbacOverviewPayload {
  summary: RbacOverviewSummary
  roles: RbacRoleDTO[]
}

// Summary DTOs for overview list
export type RbacRoleSummaryDTO = {
  id: number
  name: string
  description: string | null
  code: string
  hierarchy_level: number
  status: string
}

export interface ApiRbacOverviewSummaryPayload {
  summary: RbacOverviewSummary
  roles: RbacRoleSummaryDTO[]
}

/** Table row for overview page (summary rows) */
export type RbacOverviewRow = {
  id: number
  name: string
  code: string
  status: string
  hierarchy_level: number
}