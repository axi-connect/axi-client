import type { Primitive } from "./types"

export function formatCell(value: Primitive, yes = "Sí", no = "No"): React.ReactNode {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? yes : no
  return String(value)
}

export function ariaSortFrom(currentSortBy?: string, currentSortDir: "asc" | "desc" = "asc", key?: string) {
  if (!key || currentSortBy !== key) return "none" as const
  return currentSortDir === "asc" ? ("ascending" as const) : ("descending" as const)
}

export function pad2(n: number) {
  return n.toString().padStart(2, "0")
}