import Image from "next/image";
import { cn } from "@/core/lib/utils";
import { MessagesSquare } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { useCallback, useEffect, useState } from "react";
import { AgentDetailDTO } from "@/modules/agents/domain/agent";
import { DetailSheet } from "@/shared/components/features/detail-sheet";
import { getAgentById } from "@/modules/agents/infrastructure/agent-service.adapter";

export default function AgentDetailSheet() {
    const [open, setOpen] = useState(false)
    const [detail, setDetail] = useState<AgentDetailDTO | null>(null)
    const [id, setId] = useState<number | string | undefined>(undefined)

    const fetchDetail = useCallback(async (id: number | string) => {
        console.log('fetching detail for agent: ', id)
        const { data } = await getAgentById(id)
        console.log(data)
        setDetail(data)
        return data
    }, [id])

    useEffect(() => {
        const onOpen = (e: Event) => {
            const { id } = (e as CustomEvent<{ id: number | string }>).detail
            setId(id)
            setOpen(true)
        }
        window.addEventListener("agent:view:open", onOpen)
    }, [])
    
    return (
        <DetailSheet
            id={id}
            open={open}
            onOpenChange={setOpen}
            fetchDetail={fetchDetail}
            title={`Detalle del agente #${id}`}
            skeleton={<div className="animate-pulse h-3/5 bg-secondary rounded rounded-b-4xl" />}
        >
            {detail && (
                <>
                    <div className="-m-4 relative h-3/5">
                        <div
                            className={cn("w-full flex items-end justify-center h-full rounded-b-4xl", detail.character.style?.background)}
                        >
                            <Image 
                                width={300} 
                                height={300}
                                alt={detail.name} 
                                className="relative"
                                src={detail.character.avatar_url} 
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-2">
                        <div className="flex items-center">
                            <span className={`h-4 w-4 rounded-full ${detail.alive ? "bg-green-500" : "bg-red-500"}`} />
                            <h1 className="ml-2 text-2xl font-bold">{detail.name}</h1>

                            <div className="ml-auto flex items-center justify-center gap-2">
                                <MessagesSquare />
                                <div className="text-sm">
                                    <p className="w-full text-center">{detail.phone}</p>
                                    <p className="w-full text-center">{detail.company.name}</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            {
                                detail.skills.map((skill) => (
                                    <Badge variant="secondary" key={skill}>{skill}</Badge>
                                ))
                            }
                        </div>

                    </div>
                </>
            )}
        </DetailSheet>
    )
}