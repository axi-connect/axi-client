"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { CharacterDTO } from "./model";
import { motion } from "framer-motion";
import Modal from "@/components/ui/modal";
import { deleteCharacter } from "./service";
import { AudioLines, ChevronLeft, ChevronRight, Pencil, Play, Trash2 } from "lucide-react";
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
    const [submitting, setSubmitting] = useState(false);
    const [modalConfirmOpen, setModalConfirmOpen] = useState(false);
    const [character, setCharacter] = useState<CharacterDTO | null>(null);

    const handlePlay = (id: string) => {
        const audio = document.getElementById(id) as HTMLAudioElement;
        audio.play();
    }

    const handleDelete = (character: CharacterDTO) => {
        setCharacter(character);
        setModalConfirmOpen(true);
    }

    const handleConfirmDelete = async () => {
        setSubmitting(true);
        if(!character?.id) return;
        const res = await deleteCharacter(character?.id);
        if (res.successful) {
            setModalConfirmOpen(false);
            onDelete?.(character);
        }
        setSubmitting(false);
    }

    return (
        <div className="flex items-center justify-center mt-4">
            <button
                className={cn("cursor-pointer p-2 rounded-full bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md")}
                onClick={onPrevPage}
                disabled={!hasPrev}
                aria-disabled={!hasPrev}
            >
                <ChevronLeft className="size-8" />
            </button>
            <div className="flex gap-4 justify-center items-end w-full">
                {
                    characters.map((character, index) => (
                        <motion.div
                            initial={{ opacity: 0, x: 200 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 1, ease: "backInOut", delay: index * 0.1 }}
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

                                    <div className="relative z-10 flex flex-col h-full w-full items-center justify-center gap-2 px-2">
                                        <AudioLines className="size-6" />
                                        <span className="text-sm font-medium">{character.voice?.gender === "female" ? "Femenino" : "Masculino"}</span>
                                        <div className="flex items-center">
                                            {/* Play example audio character */}
                                            <button onClick={() => handlePlay(`audio-${character.id}`)} className="p-2 rounded-full cursor-pointer hover:scale-105 hover:z-10 -mr-1 bg-white border">
                                                <audio id={`audio-${character.id}`} key={character.id} src={character.voice?.url} />
                                                <Play className="size-4" />
                                            </button>
                                            {/* Edit properties character */}
                                            <button onClick={() => onEdit?.(character)} className="p-2 rounded-full cursor-pointer hover:scale-105 hover:z-10 -mr-1 bg-white border">
                                                <Pencil className="size-4" />
                                            </button>
                                            {/* Delete character */}
                                            <button onClick={() => handleDelete(character)} className="p-2 rounded-full cursor-pointer hover:scale-105 hover:z-10 -mr-1 bg-brand-gradient border">
                                                <Trash2 className="size-4 text-white" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                }
            </div>
            <button
                className={cn("cursor-pointer p-2 rounded-full bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md")}
                onClick={onNextPage}
                disabled={!hasNext}
                aria-disabled={!hasNext}
            >
                <ChevronRight className="size-8" />
            </button>

            <Modal
                open={modalConfirmOpen}
                onOpenChange={setModalConfirmOpen}
                config={{
                    title: "Eliminar personaje",
                    description: `¿Seguro que deseas eliminar a este personaje? Esta acción es permanente.`,
                    actions: [
                        { label: "Cancelar", variant: "outline", asClose: true, id: "character-delete-cancel" },
                        { label: submitting ? "Eliminando..." : "Eliminar", variant: "destructive", asClose: false, onClick: handleConfirmDelete, id: "character-delete-confirm" },
                    ],
                }}
            >
                <div className="text-sm text-muted-foreground">
                    Esta acción no se puede deshacer. Se eliminarán de forma permanente los datos asociados a este personaje.
                </div>
            </Modal>
        </div>
    );
}