"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAgents } from "./context/agents.context";
import { CharacterDTO } from "./characters/model";
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
        console.log("onDeleteCharacter", character);
        // setSelectedCharacter(character);
        // router.push(`/admin/agents/characters/delete/${character.id}`);
    }

    useEffect(() => {
        fetchCharacters();
    }, []);

    return (
        <div>
            <button onClick={handleCreateCharacter}>Create Character</button>

            <h1 className="text-2xl font-bold">Character Gallery</h1>

            <CharacterGallery 
                characters={characters}
                onEdit={onEditCharacter}
                onDetail={handleCharacterClick} 
                onDelete={onDeleteCharacter}
                onPrevPage={prevCharactersPage}
                onNextPage={nextCharactersPage}
                hasPrev={hasPrevCharactersPage}
                hasNext={hasNextCharactersPage}
            />
        </div>
    )
}