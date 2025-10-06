"use client";

import { AgentDTO } from "../model";
import { listAgents } from "../services";
import { CharacterDTO } from "../characters/model";
import { listCharacters } from "../characters/service";
import { createContext, useCallback, useContext, useState } from "react";

type AgentsContextValue = {
    loading: boolean;
    agents: AgentDTO[];
    error: string | null;
    characters: CharacterDTO[];
    fetchAgents: () => Promise<void>;
    fetchCharacters: () => Promise<void>;
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState<AgentDTO[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [characters, setCharacters] = useState<CharacterDTO[]>([]);

    const fetchAgents = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await listAgents({view: "summary"});
            setAgents(data.agents);
        } catch (error) {
            setError(error as string);
        }
    }, []);

    const fetchCharacters = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await listCharacters({view: "summary"});
            setCharacters(data.characters);
        } catch (error) {
            setError(error as string);
        }
    }, []);

    return (
        <AgentsContext.Provider value={{ agents, characters, loading, error, fetchAgents, fetchCharacters }}>
            {children}
        </AgentsContext.Provider>
    )
}

export function useAgents() {
    const context = useContext(AgentsContext);
    if (!context) {
        throw new Error("useAgents must be used within a AgentsProvider");
    }
    return context;
}