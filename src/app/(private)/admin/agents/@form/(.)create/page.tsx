"use client"

import { useAgent } from "@/modules/agents/infrastructure/agent.context"
import ModalFormAgent from "@/modules/agents/ui/components/ModalFormAgent"

export default function AgentsInterceptCreate() {
  const { fetchAgents } = useAgent()
  const refresh = () => fetchAgents()
  
  return (
    <ModalFormAgent refresh={refresh} />
  )
}