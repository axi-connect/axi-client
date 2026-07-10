import { create } from "zustand"
import type { AgentRow } from "@/modules/agents/domain/agent"

/**
 * Acciones de fila de la tabla de agentes. La página las registra al montar
 * y los menús (dropdown/contextual) las consumen sin prop-drilling.
 */
interface AgentTableActions {
  onEdit: (row: AgentRow) => void
  onView: (row: AgentRow) => void
  onDelete: (row: AgentRow) => void
}

interface AgentStore {
  actions: AgentTableActions
  setActions: (actions: AgentTableActions) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  actions: {
    onEdit: () => {},
    onView: () => {},
    onDelete: () => {},
  },
  setActions: (actions) => set({ actions }),
}))
