// src/shared/store/useTableActions.ts
import { create } from "zustand"

interface TableActions {
    onCopy: (row: any) => void
    onEdit: (row: any) => void
    onView: (row: any) => void
    onDelete: (row: any) => void
}

interface AgentStore {
    actions: TableActions
    setActions: (actions: TableActions) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
    actions: {
        onCopy: ()=>{},
        onEdit: ()=>{},
        onView: ()=>{},
        onDelete: ()=>{},
    },
    setActions: (actions) => set({ actions })
}))
