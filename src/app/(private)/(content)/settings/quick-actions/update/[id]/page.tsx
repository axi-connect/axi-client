"use client"

import { use } from "react"
import QuickActionsPage from "../../page"
import { QuickActionFormModal } from "@/modules/quick-actions/ui/forms/QuickActionFormModal"

/** Gemela REAL de `@form/(.)update/[id]`: la lista detrás y el modal de edición encima. */
export default function QuickActionsUpdatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <>
      <QuickActionsPage />
      <QuickActionFormModal actionId={id} />
    </>
  )
}
