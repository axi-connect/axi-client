"use client"

import { useState, useEffect } from "react"
import { Modal } from "@/shared/components/ui/modal"
import { useParams, useRouter } from "next/navigation"
import { AgentForm } from "@/modules/agents/ui/forms/AgentForm"
import { useAgent } from "@/modules/agents/infrastructure/agent.context"
import { getAgentById } from "@/modules/agents/infrastructure/agent-service.adapter"

export default function AgentsInterceptUpdate() {
    const params = useParams<{ id: string }>()
    const id = params?.id
    const router = useRouter()
    const { fetchAgents } = useAgent()
    const [defaults, setDefaults] = useState<any | null>(null)

    const onModalSubmitClick = () => {
        const form = document.getElementById("agent-form") as HTMLFormElement | null
        form?.requestSubmit()
    }

    useEffect(() => {
        if (id) {
            getAgentById(id).then((res) => {
                console.log(res.data)
                setDefaults(res.data)
            })
        }
    }, [id])

    return (
        <Modal
            open={true}
            onOpenChange={(open) => { if (!open) router.back() }}
            config={{
                title: "Actualizar Agente",
                description: `Edita el agente #${id}`,
                actions: [
                    { label: "Cancelar", variant: "outline", asClose: true, id: "agent-update-cancel" },
                    { label: "Guardar", variant: "default", asClose: false, onClick: onModalSubmitClick, id: "agent-update-save" },
                ],
            }}
        >
            <AgentForm
                host={{
                    defaultValues: defaults,
                    onSuccess: async () => { await fetchAgents(); router.back() },
                }}
            />
        </Modal>
    )
}