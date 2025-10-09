"use client"

import { useAgents } from "../../context/agents.context"
import ModalFormAgents from "../../components/modal-form-agents"

export default function AgentsInterceptCreate() {
  const { fetchAgents } = useAgents()
  const refresh = () => fetchAgents()
  
  return (
    <ModalFormAgents refresh={refresh} />
  )
}