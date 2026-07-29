"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { contactDisplayName, type ContactListItemDTO } from "@/modules/crm/domain/contact";
import { listContacts } from "@/modules/crm/infrastructure/services/contacts-service.adapter";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Combobox de contacto (Popover + Command) con búsqueda server-side `q`.
 * Selección única — el deal pertenece a exactamente un contacto.
 */
export function ContactPicker({
  value,
  onChange,
  error,
}: {
  value: { id: string; label: string } | null;
  onChange: (contact: { id: string; label: string } | null) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactListItemDTO[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const timer = window.setTimeout(() => {
      listContacts({ q: query.trim() || undefined, page_size: 10 })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-9 w-full justify-between font-normal",
              value === null && "text-muted-foreground",
              error && "border-destructive",
            )}
          >
            <span className="truncate">{value?.label ?? "Buscar contacto…"}</span>
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Nombre, teléfono o correo…"
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Buscando…" : "Sin resultados"}
              </CommandEmpty>
              {results.map((contact) => {
                const label = contactDisplayName(contact);
                return (
                  <CommandItem
                    key={contact.id}
                    value={contact.id}
                    onSelect={() => {
                      onChange({ id: contact.id, label });
                      setOpen(false);
                    }}
                  >
                    <Avatar src={contact.avatar_url} alt={label} fallback={label} size={22} />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {contact.phone && (
                      <span className="text-xs text-muted-foreground">{contact.phone}</span>
                    )}
                    {value?.id === contact.id && <Check className="size-4" aria-hidden />}
                  </CommandItem>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
