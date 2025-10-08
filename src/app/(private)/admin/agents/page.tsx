"use client";

import { AgentRow } from "./model";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CharacterDTO } from "./characters/model";
import { FolderKanban, Plus } from "lucide-react";
import { useAgents } from "./context/agents.context";
// import TreeViewIntentions from "./intentions/tree-view";
import { DataTable } from "@/components/features/data-table";
import { agentColumns } from "./components/table/table.config";
import CharacterGallery from "./characters/character-gallery";

export default function AgentsPage() {
    const router = useRouter();
    const [agentRows, setAgentRows] = useState<AgentRow[]>([]);

    const { 
        loading, error,
        agents, fetchAgents,
        characters, fetchCharacters, setSelectedCharacter, nextCharactersPage, prevCharactersPage, hasNextCharactersPage, hasPrevCharactersPage,
        fetchIntentionsOverview,
    } = useAgents();

    const handleCreateCharacter = () => {
        router.push("/admin/agents/characters/create");
    }

    const handleCreateAgent = () => {
        router.push("/admin/agents/create");
    }

    const handleCharacterClick = (character: CharacterDTO) => {
        setSelectedCharacter(character);
        router.push(`/admin/agents/characters/update/${character.id}`);
    }
    
    const onEditCharacter = (character: CharacterDTO) => {
        setSelectedCharacter(character);
        router.push(`/admin/agents/characters/update/${character.id}`);
    }

    const onDeleteCharacter = (character: CharacterDTO) => fetchCharacters();

    useEffect(() => {
        fetchAgents();
        fetchCharacters();
        // fetchIntentionsOverview();
    }, []);

    useEffect(() => {
        setAgentRows(agents.map((agent) => ({
            id: String(agent.id),
            name: String(agent.name),
            phone: String(agent.phone),
            alive: Boolean(agent.alive),
            company_name: String(agent.company.name),
            avatar: String(agent.character.avatar_url),
            avatar_background: String(agent.character.style?.background),
        })));
    }, [agents]);

    return (
        <div>
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Galería de Personajes</h2>
                    <p className="text-sm text-muted-foreground">
                        Aquí puedes crear y gestionar los personajes de los agentes.
                    </p>
                </div>
                <Button 
                    variant="default"
                    onClick={handleCreateCharacter}
                    style={{ borderRadius: "9999px" }}
                >
                    <Plus className="h-4 w-4" />
                    Crear Personaje
                </Button>
            </div>

            <CharacterGallery 
                characters={characters}
                onEdit={onEditCharacter}
                onDelete={onDeleteCharacter}
                onDetail={handleCharacterClick} 
                onPrevPage={prevCharactersPage}
                onNextPage={nextCharactersPage}
                hasPrev={hasPrevCharactersPage}
                hasNext={hasNextCharactersPage}
            />

            <div className="absolute left-0 w-full h-[200px] text-background">
                <svg viewBox="0 0 944 595" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0.5 0C0.5 0 251.015 62.2189 473 56.5C686.056 51.0111 944.5 0 944.5 0V474H0.5V0Z" fill="currentColor"/>
                </svg>
            </div>

            {/* <div className="mt-20 relative z-10"> */}
                {/* <TreeViewIntentions /> */}
            {/* </div> */}

            <div className="mt-12 relative z-10">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h1 className="text-2xl font-bold">Agentes</h1>
                        <p className="text-sm text-muted-foreground">
                            Aquí puedes crear y gestionar los agentes.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline"
                            onClick={handleCreateAgent}
                            style={{ borderRadius: "9999px" }}
                        >
                            <FolderKanban className="h-4 w-4" />
                            Intentions
                        </Button>
                        <Button 
                            variant="default"
                            onClick={handleCreateAgent}
                            style={{ borderRadius: "9999px" }}
                        >
                            <Plus className="h-4 w-4" />
                            Crear Agente
                        </Button>
                    </div>
                </div>

                <DataTable<AgentRow>
                    data={agentRows}
                    columns={agentColumns}
                />
            </div>
        </div>
    )
}