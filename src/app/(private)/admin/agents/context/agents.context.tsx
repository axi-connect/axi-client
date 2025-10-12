"use client";

import { AgentSummaryDTO, ListAgentsParams } from "../model";
import { listAgentSummary } from "../service";
import { listCharacters } from "../characters/service";
import { TreeNode } from "@/components/features/tree-view";
import { IntentionDTO, ListIntentionParams } from "../intentions/model";
import { createContext, useCallback, useContext, useState } from "react";
import { CharacterDTO, ListCharactersParams } from "../characters/model";
import { listIntention, listIntentionOverview } from "../intentions/service";

type AgentsContextValue = {
    loading: boolean;
    error: string | null;
    agents: AgentSummaryDTO[];
    characters: CharacterDTO[];
    charactersQuery: Required<Pick<ListCharactersParams, "limit" | "offset" | "sortBy" | "sortDir">> & Pick<ListCharactersParams, "avatar_url">;
    hasNextCharactersPage: boolean;
    hasPrevCharactersPage: boolean;
    selectedCharacter: CharacterDTO | null;
    fetchAgents: () => Promise<void>;
    fetchCharacters: (params?: Partial<ListCharactersParams>) => Promise<void>;
    nextCharactersPage: () => Promise<void>;
    prevCharactersPage: () => Promise<void>;
    setCharactersSearch: (avatar_url: string | undefined) => Promise<void>;
    setCharactersLimit: (limit: number) => Promise<void>;
    setCharactersSort: (sortBy: ListCharactersParams["sortBy"], sortDir: ListCharactersParams["sortDir"]) => Promise<void>;
    setSelectedCharacter: (character: CharacterDTO | null) => void;
    intentionsOverview: TreeNode[];
    fetchIntentionsOverview: () => Promise<void>;
    // intentions: IntentionDTO[];
    // intentionsQuery: Required<Pick<ListIntentionParams, "limit" | "offset" | "sortBy" | "sortDir">> & Pick<ListIntentionParams, "type" | "priority" | "code" | "flow_name" | "description" | "ai_instructions">;
    // fetchIntentions: (params?: Partial<ListIntentionParams>) => Promise<void>;
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(false);
    const [agents, setAgents] = useState<AgentSummaryDTO[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [intentionsOverview, setIntentionsOverview] = useState<TreeNode[]>([]);
    // const [intentions, setIntentions] = useState<IntentionDTO[]>([]);
    // const [intentionsTotal, setIntentionsTotal] = useState<number>(0);
    // const [intentionsQuery, setIntentionsQuery] = useState<Required<Pick<ListIntentionParams, "limit" | "offset" | "sortBy" | "sortDir">> & Pick<ListIntentionParams, "type" | "priority" | "code" | "flow_name" | "description" | "ai_instructions">>({
    //     limit: 6,
    //     offset: 0,
    //     sortBy: "id",
    //     sortDir: "desc",
    //     type: undefined,
    //     priority: undefined,
    //     code: undefined,
    //     flow_name: undefined,
    //     description: undefined,
    //     ai_instructions: undefined,
    // });
    const [characters, setCharacters] = useState<CharacterDTO[]>([]);
    const [charactersTotal, setCharactersTotal] = useState<number>(0);
    const [charactersQuery, setCharactersQuery] = useState<Required<Pick<ListCharactersParams, "limit" | "offset" | "sortBy" | "sortDir">> & Pick<ListCharactersParams, "avatar_url">>({
        limit: 6,
        offset: 0,
        sortBy: "id",
        sortDir: "desc",
        avatar_url: undefined,
    });
    const [selectedCharacter, setSelectedCharacter] = useState<CharacterDTO | null>(null);

    const fetchAgents = useCallback(async (params?: Partial<ListAgentsParams>) => {
        setLoading(true);
        try {
            const { data } = await listAgentSummary({
                ...params});
            setAgents(data.agents);
        } catch (error) {
            setError(error as string);
        }
    }, []);

    const fetchCharacters = useCallback(async (params?: Partial<ListCharactersParams>) => {
        setLoading(true);
        try {
            const nextQuery = {
                ...charactersQuery,
                ...params,
            } as ListCharactersParams;
            const { data } = await listCharacters({
                avatar_url: nextQuery.avatar_url,
                limit: nextQuery.limit,
                offset: nextQuery.offset,
                sortBy: nextQuery.sortBy,
                sortDir: nextQuery.sortDir,
                view: "summary",
            });
            setCharacters(data.characters);
            setCharactersTotal(data.total ?? 0);
            setCharactersQuery(q => ({
                ...q,
                avatar_url: nextQuery.avatar_url,
                limit: nextQuery.limit ?? q.limit,
                offset: nextQuery.offset ?? q.offset,
                sortBy: (nextQuery.sortBy ?? q.sortBy) as NonNullable<ListCharactersParams["sortBy"]>,
                sortDir: (nextQuery.sortDir ?? q.sortDir) as NonNullable<ListCharactersParams["sortDir"]>,
            }));
        } catch (error) {
            setError(error as string);
        } finally {
            setLoading(false);
        }
    }, [charactersQuery]);

    const fetchIntentionsOverview = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await listIntentionOverview();
            setIntentionsOverview(data);
        } catch (error) {
            setError(error as string);
        } finally {
            setLoading(false);
        }
    }, []);

    // const fetchIntentions = useCallback(async (params?: Partial<ListIntentionParams>) => {
    //     setLoading(true);
    //     try {
    //         const nextQuery = {
    //             ...intentionsQuery,
    //             ...params,
    //         } as ListIntentionParams;
    //         const { data } = await listIntention({
    //             type: nextQuery.type,
    //             priority: nextQuery.priority,
    //             code: nextQuery.code,
    //             flow_name: nextQuery.flow_name,
    //             description: nextQuery.description,
    //             ai_instructions: nextQuery.ai_instructions,
    //             limit: nextQuery.limit,
    //             offset: nextQuery.offset,
    //             sortBy: nextQuery.sortBy,
    //             sortDir: nextQuery.sortDir,
    //             view: "summary",
    //         });
    //         setIntentions(data.intentions);
    //         setIntentionsTotal(data.total ?? 0);
    //         setIntentionsQuery(q => ({
    //             ...q,
    //             ...params,
    //         }));
    //     } catch (error) {
    //         setError(error as string);
    //     } finally {
    //         setLoading(false);
    //     }
    // }, [intentionsQuery]);

    const hasNextCharactersPage = charactersQuery.offset + charactersQuery.limit < charactersTotal;
    const hasPrevCharactersPage = charactersQuery.offset > 0;

    const nextCharactersPage = useCallback(async () => {
        if (!hasNextCharactersPage) return;
        await fetchCharacters({ offset: charactersQuery.offset + charactersQuery.limit });
    }, [fetchCharacters, charactersQuery.offset, charactersQuery.limit, hasNextCharactersPage]);

    const prevCharactersPage = useCallback(async () => {
        if (!hasPrevCharactersPage) return;
        await fetchCharacters({ offset: Math.max(0, charactersQuery.offset - charactersQuery.limit) });
    }, [fetchCharacters, charactersQuery.offset, charactersQuery.limit, hasPrevCharactersPage]);

    const setCharactersSearch = useCallback(async (avatar_url: string | undefined) => {
        await fetchCharacters({ avatar_url, offset: 0 });
    }, [fetchCharacters]);

    const setCharactersLimit = useCallback(async (limit: number) => {
        await fetchCharacters({ limit, offset: 0 });
    }, [fetchCharacters]);

    const setCharactersSort = useCallback(async (sortBy: ListCharactersParams["sortBy"], sortDir: ListCharactersParams["sortDir"]) => {
        await fetchCharacters({ sortBy, sortDir, offset: 0 });
    }, [fetchCharacters]);

    return (
        <AgentsContext.Provider value={{
            agents,
            characters,
            charactersQuery,
            hasNextCharactersPage,
            hasPrevCharactersPage,
            loading,
            error,
            fetchAgents,
            fetchCharacters,
            nextCharactersPage,
            prevCharactersPage,
            setCharactersSearch,
            setCharactersLimit,
            setCharactersSort,
            selectedCharacter,
            setSelectedCharacter,
            intentionsOverview,
            fetchIntentionsOverview,
            // intentions,
            // intentionsQuery,
            // fetchIntentions,
        }}>
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