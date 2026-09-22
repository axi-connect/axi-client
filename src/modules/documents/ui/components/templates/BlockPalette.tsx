"use client";

import { Plus } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import type {
  BlockCatalogView,
  BlockType,
  DocumentTypeView,
} from "@/modules/documents/domain/template";
import { BLOCK_ICONS } from "./BlockList";

/**
 * «Añadir bloque»: solo lo que ESTE tipo de documento admite. Lo que no cabe
 * se muestra apagado con su razón en vez de desaparecer, para que el dueño
 * entienda que el catálogo tiene más y por qué aquí no.
 */
export function BlockPalette({
  type,
  catalog,
  onAdd,
}: {
  type: DocumentTypeView;
  catalog: readonly BlockCatalogView[];
  onAdd: (blockType: BlockType) => void;
}) {
  const allowed = new Set(type.allowed_blocks);
  const editable = catalog.filter(
    (entry) => entry.editable || allowed.has(entry.type),
  );
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-dashed"
        >
          <Plus aria-hidden="true" className="size-3.5" />
          Añadir bloque
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[360px] p-2">
        <p className="px-2.5 pb-1.5 pt-2 text-xs font-medium text-muted-foreground">
          Añadir a {type.label.toLowerCase()}
        </p>
        <ul className="flex flex-col">
          {editable.map((entry) => {
            const Icon = BLOCK_ICONS[entry.type];
            const isAllowed = allowed.has(entry.type);
            return (
              <li key={entry.type}>
                <button
                  type="button"
                  aria-label={`Añadir ${entry.label}`}
                  disabled={!isAllowed || !entry.editable}
                  onClick={() => onAdd(entry.type)}
                  className="grid w-full grid-cols-[30px_minmax(0,1fr)] items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-[30px] place-items-center rounded-[9px] bg-secondary text-muted-foreground"
                  >
                    <Icon className="size-[15px]" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {entry.label}
                    </span>
                    <span
                      className={`block text-xs leading-snug text-muted-foreground ${isAllowed && entry.editable ? "" : "italic"}`}
                    >
                      {!isAllowed
                        ? `No cabe en ${type.label.toLowerCase()}`
                        : !entry.editable
                          ? "Es texto fijo del tipo: ya está donde debe"
                          : entry.description}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
