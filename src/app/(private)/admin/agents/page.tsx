"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CharacterDTO } from "./characters/model";
import { useAgents } from "./context/agents.context";
import CharacterGallery from "./characters/character-gallery";

export default function AgentsPage() {
    const router = useRouter();
    const { agents, characters, loading, error, fetchAgents, fetchCharacters, setSelectedCharacter, nextCharactersPage, prevCharactersPage, hasNextCharactersPage, hasPrevCharactersPage } = useAgents();

    const handleCreateCharacter = () => {
        router.push("/admin/agents/characters/create");
    }

    const handleCharacterClick = (character: CharacterDTO) => {
        setSelectedCharacter(character);
        router.push(`/admin/agents/characters/update/${character.id}`);
    }
    
    const onEditCharacter = (character: CharacterDTO) => {
        setSelectedCharacter(character);
        router.push(`/admin/agents/characters/update/${character.id}`);
    }

    const onDeleteCharacter = (character: CharacterDTO) => {
        fetchCharacters();
    }

    useEffect(() => {
        fetchCharacters();
    }, []);

    return (
        <div>
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Character Gallery</h1>
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
                    Create Character
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
        </div>
    )
}