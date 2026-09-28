"use client"

import { use } from "react"
import { QuickActionFormModal } from "@/modules/quick-actions/ui/forms/QuickActionFormModal"

/** Modal interceptado de edición: carga la acción y precarga el formulario. */
export default function QuickActionsInterceptUpdate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <QuickActionFormModal actionId={id} />
}
