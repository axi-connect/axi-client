import type { FieldValues, UseFormProps } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

export const GRID_COLS_CLASS_BY_COUNT: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
  7: "grid-cols-7",
  8: "grid-cols-8",
  9: "grid-cols-9",
  10: "grid-cols-10",
  11: "grid-cols-11",
  12: "grid-cols-12",
}

export const GAP_CLASS_BY_LEVEL: Record<number, string> = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  7: "gap-7",
  8: "gap-8",
}

export function clampInt(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function columnsToClasses(columns?:
  | number
  | { base?: number; sm?: number; md?: number; lg?: number; xl?: number }
): string {
  if (!columns) return GRID_COLS_CLASS_BY_COUNT[1]
  if (typeof columns === "number") {
    const c = clampInt(columns, 1, 12)
    return GRID_COLS_CLASS_BY_COUNT[c]
  }
  const parts: string[] = []
  const sizes: Array<[keyof typeof columns, string]> = [
    ["base", ""],
    ["sm", "sm:"],
    ["md", "md:"],
    ["lg", "lg:"],
    ["xl", "xl:"],
  ] as any
  for (const [size, prefix] of sizes) {
    const value = (columns as any)[size]
    if (typeof value === "number") {
      const c = clampInt(value, 1, 12)
      const base = GRID_COLS_CLASS_BY_COUNT[c]
      parts.push(`${prefix}${base}`)
    }
  }
  return parts.length ? parts.join(" ") : GRID_COLS_CLASS_BY_COUNT[1]
}

export const COL_SPAN_CLASS_BY_COUNT: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
}

export function colSpanToClasses(colSpan?:
  | number
  | { base?: number; sm?: number; md?: number; lg?: number; xl?: number }
): string | undefined {
  if (!colSpan) return undefined
  if (typeof colSpan === "number") {
    const c = clampInt(colSpan, 1, 12)
    return COL_SPAN_CLASS_BY_COUNT[c]
  }
  const parts: string[] = []
  const sizes: Array<[keyof typeof colSpan, string]> = [
    ["base", ""],
    ["sm", "sm:"],
    ["md", "md:"],
    ["lg", "lg:"],
    ["xl", "xl:"],
  ] as any
  for (const [size, prefix] of sizes) {
    const value = (colSpan as any)[size]
    if (typeof value === "number") {
      const c = clampInt(value, 1, 12)
      const base = COL_SPAN_CLASS_BY_COUNT[c]
      parts.push(`${prefix}${base}`)
    }
  }
  return parts.length ? parts.join(" ") : undefined
}

export const createZodResolver = <TValues extends FieldValues>(schema: z.ZodType<TValues>) =>
  (zodResolver as unknown as (s: z.ZodType<TValues>) => UseFormProps<TValues>["resolver"])(schema)