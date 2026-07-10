"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/core/lib/utils";
import { Modal } from "@/shared/components/ui/modal";
import { Badge } from "@/shared/components/ui/badge";
import { errorMessage } from "@/core/lib/error-messages";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { characterStyle, type CharacterDTO } from "@/modules/agents/domain/character";
import { deleteCharacter } from "@/modules/agents/infrastructure/services/character-service.adapter";

/**
 * Galería de characters con tarjetas flip. Los characters `is_system` son
 * plantillas de la plataforma: sin editar/eliminar. Paginación en cliente.
 */
export default function CharacterGallery({
  characters,
  onEdit,
  onDeleted,
  onError,
  pageSize = 6,
}: {
  characters: CharacterDTO[]
  onEdit?: (character: CharacterDTO) => void
  onDeleted?: () => void
  onError?: (message: string) => void
  pageSize?: number
}) {
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState<CharacterDTO | null>(null);

  const totalPages = Math.max(1, Math.ceil(characters.length / pageSize));
  const visible = characters.slice(page * pageSize, (page + 1) * pageSize);
  const hasPrev = page > 0;
  const hasNext = page < totalPages - 1;

  const handleConfirmDelete = async () => {
    if (!confirming || submitting) return;
    setSubmitting(true);
    try {
      await deleteCharacter(confirming.id);
      setConfirming(null);
      onDeleted?.();
    } catch (err) {
      // `ai/character_in_use` y `ai/template_immutable` llegan tipados.
      onError?.(errorMessage(err, "No se pudo eliminar el character"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center mt-4">
      <button
        className="cursor-pointer p-2 rounded-full bg-background border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={!hasPrev}
        aria-label="Personajes anteriores"
      >
        <ChevronLeft className="size-6" />
      </button>

      <div className="flex gap-4 justify-center items-end w-full flex-wrap">
        {visible.map((character, index) => {
          const style = characterStyle(character);
          return (
            <motion.div
              initial={{ opacity: 0, x: 120 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "backInOut", delay: index * 0.08 }}
              key={character.id}
              className="group relative h-[120px] w-[120px] [perspective:1200px]"
            >
              <div
                className={cn(
                  "relative h-full w-full",
                  "[transform-style:preserve-3d] transition-transform duration-500",
                  "group-hover:[transform:rotateY(180deg)]",
                )}
              >
                {/* Frente */}
                <div className="absolute inset-0 h-full w-full [backface-visibility:hidden] rounded-lg group-hover:pointer-events-none">
                  {character.avatar_url ? (
                    <Image
                      loading="lazy"
                      width={1080}
                      height={1080}
                      src={character.avatar_url}
                      alt={character.name}
                      className="absolute rounded-lg bottom-0 z-10"
                    />
                  ) : (
                    <div className="absolute inset-x-0 bottom-0 z-10 flex h-[100px] items-center justify-center text-3xl font-bold text-foreground/60">
                      {character.name.charAt(0)}
                    </div>
                  )}
                  <div className={cn("absolute border-4 border-background rounded-lg h-[100px] w-full bottom-0 z-0 bg-muted", style.background)} />
                </div>

                {/* Reverso */}
                <div
                  className={cn(
                    "absolute inset-0 h-full w-full",
                    "[transform:rotateY(180deg)] [backface-visibility:hidden]",
                    "rounded-lg border-4 border-background bg-muted",
                    "pointer-events-none group-hover:pointer-events-auto",
                    style.background,
                  )}
                >
                  <div className="absolute inset-0 bg-background/85 backdrop-blur-sm rounded-md pointer-events-none" />
                  <div className="relative z-10 flex flex-col h-full w-full items-center justify-center gap-2 px-2">
                    <span className="max-w-full truncate text-sm font-medium">{character.name}</span>
                    {character.is_system ? (
                      <Badge variant="outline">Plantilla</Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEdit?.(character)}
                          className="p-2 rounded-full cursor-pointer hover:scale-105 bg-background border border-border"
                          aria-label={`Editar ${character.name}`}
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => setConfirming(character)}
                          className="p-2 rounded-full cursor-pointer hover:scale-105 bg-brand-gradient border border-border"
                          aria-label={`Eliminar ${character.name}`}
                        >
                          <Trash2 className="size-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {characters.length === 0 && (
          <p className="py-8 text-sm text-muted-foreground">
            Aún no hay characters. Crea el primero para darle personalidad a tus agentes.
          </p>
        )}
      </div>

      <button
        className="cursor-pointer p-2 rounded-full bg-background border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={!hasNext}
        aria-label="Personajes siguientes"
      >
        <ChevronRight className="size-6" />
      </button>

      <Modal
        open={confirming !== null}
        onOpenChange={(open) => { if (!open) setConfirming(null) }}
        config={{
          title: "Eliminar character",
          description: `¿Seguro que deseas eliminar a “${confirming?.name ?? ""}”? Esta acción es permanente.`,
          actions: [
            { label: "Cancelar", variant: "outline", asClose: true, id: "character-delete-cancel" },
            { label: submitting ? "Eliminando..." : "Eliminar", variant: "destructive", asClose: false, onClick: handleConfirmDelete, id: "character-delete-confirm" },
          ],
        }}
      >
        <div className="text-sm text-muted-foreground">
          Si el character está en uso por un agente, el backend rechazará la eliminación.
        </div>
      </Modal>
    </div>
  );
}
