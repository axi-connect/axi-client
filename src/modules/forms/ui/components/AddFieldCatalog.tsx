"use client";

import { useState } from "react";
import { PencilLine, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { RECOMMENDED_FIELDS, type RecommendedField } from "@/modules/forms/domain/form";
import { FieldTypeIcon } from "./FieldTypeIcon";

/**
 * Alta de campo desde un catálogo, no desde un formulario vacío.
 *
 * El `code` no es un detalle técnico: `form_guard.ts` resuelve el valor como
 * `contact[code] ?? contact.custom_fields[code] ?? collected[code]`, así que un
 * campo llamado `address` aterriza en la ficha del CRM y la IA **no lo vuelve a
 * preguntar** en conversaciones siguientes; uno llamado `direccion_entrega` va a
 * `custom_fields` y nunca se auto-satisface. Ofrecer los codes que enganchan con
 * el CRM convierte el problema en una elección de lista.
 */
export function AddFieldCatalog({
  usedCodes,
  disabled,
  variant = "outline",
  label = "Añadir dato",
  onPick,
}: {
  usedCodes: ReadonlySet<string>;
  disabled?: boolean;
  variant?: "outline" | "default";
  label?: string;
  onPick: (preset?: RecommendedField) => void;
}) {
  const [open, setOpen] = useState(false);

  const pick = (preset?: RecommendedField) => {
    setOpen(false);
    onPick(preset);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant={variant} className="w-full rounded-xl" disabled={disabled}>
          <Plus className="size-4" />
          {label}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar un dato…" />
          <CommandList>
            <CommandEmpty>Ningún dato coincide. Créalo como dato personalizado.</CommandEmpty>

            <CommandGroup heading="Datos del cliente">
              <p className="px-2 pb-1.5 text-xs text-muted-foreground">
                Se guardan en su ficha del CRM. Si ya los tienes, la IA no los vuelve a preguntar.
              </p>
              {RECOMMENDED_FIELDS.map((recommended) => {
                const used = usedCodes.has(recommended.code);
                return (
                  <CommandItem
                    key={recommended.code}
                    value={`${recommended.label} ${recommended.code}`}
                    disabled={used}
                    onSelect={() => pick(recommended)}
                  >
                    <FieldTypeIcon type={recommended.type} />
                    <span className="flex-1 truncate">{recommended.label}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {used ? "Ya lo pides" : recommended.code}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Otro">
              <CommandItem value="crear dato personalizado" onSelect={() => pick()}>
                <PencilLine className="size-4 text-muted-foreground" aria-hidden />
                Crear un dato personalizado…
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
