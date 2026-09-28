"use client"

import QuickActionsPage from "../page"
import { QuickActionFormModal } from "@/modules/quick-actions/ui/forms/QuickActionFormModal"

/** Gemela REAL de `@form/(.)create`: recargar la URL daba 404. La lista detrás y el modal encima. */
export default function QuickActionsCreatePage() {
  return (
    <>
      <QuickActionsPage />
      <QuickActionFormModal />
    </>
  )
}
