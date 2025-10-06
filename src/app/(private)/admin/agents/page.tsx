"use client";

import { useEffect } from "react";
import { useAgents } from "./context/agents.context";

export default function AgentsPage() {
    const { agents, characters, loading, error, fetchAgents, fetchCharacters } = useAgents();

    useEffect(() => {
        // fetchAgents();
        fetchCharacters();
    }, []);

    return (
        <div>
            {loading}
            <pre>{JSON.stringify(characters, null, 2)}</pre>
        </div>
    )
}