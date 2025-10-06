"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { CharacterDTO } from "./model";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pencil, Play, } from "lucide-react";

interface CharacterGalleryProps {
    hasNext?: boolean;
    hasPrev?: boolean;
    characters: CharacterDTO[];
    onNextPage?: () => void | Promise<void>;
    onPrevPage?: () => void | Promise<void>;
    onEdit?: (character: CharacterDTO) => void;
    onDetail: (character: CharacterDTO) => void; // default edit action
    onDelete?: (character: CharacterDTO) => void;
}

export default function CharacterGallery( { characters, onDetail, onEdit, onDelete, onPrevPage, onNextPage, hasPrev = false, hasNext = false }: CharacterGalleryProps ) {
    
    const handlePlay = (id: string) => {
        const audio = document.getElementById(id) as HTMLAudioElement;
        audio.play();
    }

    return (
        <div className="flex items-center justify-center mt-10">
            <button
                className={cn("cursor-pointer p-2 rounded-full bg-white disabled:opacity-50 disabled:cursor-not-allowed")}
                onClick={onPrevPage}
                disabled={!hasPrev}
                aria-disabled={!hasPrev}
            >
                <ChevronLeft className="size-8" />
            </button>
            <div className="flex gap-4 justify-center items-end w-full">
                {
                    characters.map((character) => (
                        <div
                            key={character.id}
                            className="group relative h-[120px] w-[120px] [perspective:1200px]"
                        >
                            <div className={cn(
                                "relative h-full w-full",
                                "[transform-style:preserve-3d]",
                                "transition-transform duration-500",
                                "group-hover:[transform:rotateY(180deg)]"
                            )}>
                                {/* Front */}
                                <div
                                    className={cn(
                                        "absolute inset-0 h-full w-full",
                                        "[backface-visibility:hidden]",
                                        "rounded-lg",
                                        "group-hover:pointer-events-none",
                                    )}
                                    // onClick={() => (onDetail)(character)}
                                >
                                    <Image
                                        loading="lazy"
                                        width={120} height={120}
                                        src={character.avatar_url}
                                        alt={character.id.toString()}
                                        className="absolute rounded-lg bottom-0 z-10"
                                    />
                                    <div className={cn("absolute border-4 border-white rounded-lg h-[100px] w-full bottom-0 z-0", character.style?.background)} />
                                </div>

                                {/* Back */}
                                <div
                                    className={cn(
                                        "absolute inset-0 h-full w-full",
                                        "[transform:rotateY(180deg)] [backface-visibility:hidden]",
                                        "rounded-lg",
                                        "border-4 border-white",
                                        "pointer-events-none group-hover:pointer-events-auto",
                                        character.style?.background
                                    )}
                                >
                                    <div className="absolute inset-0 bg-white/85 backdrop-blur-sm dark:bg-zinc-900/80 pointer-events-none" />

                                    <div className="relative z-10 flex h-full w-full items-center justify-center gap-2 px-2">
                                        <audio id={`audio-${character.id}`} key={character.id} src={character.voice?.url} />

                                        <button onClick={() => handlePlay(`audio-${character.id}`)} className="p-2 rounded-full bg-white cursor-pointer">
                                            <Play className="size-4 text-brand" />
                                        </button>

                                        <Button
                                            size="icon"
                                            variant="default"
                                            className="h-7 px-2"
                                            onClick={(e) => { e.stopPropagation(); onEdit?.(character); }}
                                            aria-label="Editar personaje"
                                        >
                                            <Pencil className="size-4" />
                                        </Button>
                                        {/* <Button
                                            size="sm"
                                            variant="destructive"
                                            className="h-7 px-2"
                                            onClick={(e) => { e.stopPropagation(); onDelete?.(character); }}
                                            aria-label="Eliminar personaje"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button> */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                }
            </div>
            <button
                className={cn("cursor-pointer p-2 rounded-full bg-white disabled:opacity-50 disabled:cursor-not-allowed")}
                onClick={onNextPage}
                disabled={!hasNext}
                aria-disabled={!hasNext}
            >
                <ChevronRight className="size-8" />
            </button>
        </div>
    );
}