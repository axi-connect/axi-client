"use client";

import { useMemo, useState } from "react";
import { Archive, Check, MessagesSquare, Plus } from "lucide-react";

import { cn } from "@/core/lib/utils";
import type { CmoThreadDTO } from "@/modules/cmo/domain/cmo";
import { groupThreadsByDay, threadTitle, threadWhen } from "@/modules/cmo/domain/thread-labels";
import { useCmoStore } from "@/modules/cmo/infrastructure/stores/cmo.store";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ICON_BUTTON } from "./CmoActions";

const GROUP_LABELS = { today: "Hoy", yesterday: "Ayer", earlier: "Antes" } as const;

/**
 * Las conversaciones con Axel, en un menú.
 *
 * `Popover` + `Command` (cmdk) sin buscador: cmdk da `listbox`/`option`, flechas,
 * Home/End y Enter, agrupa con encabezado y sus ítems son `div`, así que admiten
 * el botón «Archivar» dentro. El `DropdownMenu` propio no lo admite (su ítem es
 * un `<button>`) y se recortaría dentro del scroller. Menos de treinta hilos no
 * justifican un campo de búsqueda.
 *
 * Se deshabilita mientras Axel trabaja: cambiar de hilo con un turno en vuelo
 * pintaría la respuesta en la conversación equivocada.
 */
export function ThreadSwitcher() {
  const [open, setOpen] = useState(false);
  const threads = useCmoStore((state) => state.threads);
  const currentId = useCmoStore((state) => state.thread.id);
  const thinking = useCmoStore((state) => state.thread.thinking);
  const selectThread = useCmoStore((state) => state.selectThread);
  const archiveThread = useCmoStore((state) => state.archiveThread);
  const newThread = useCmoStore((state) => state.newThread);

  const groups = useMemo(() => groupThreadsByDay(threads.data ?? []), [threads.data]);
  const current = threads.data?.find((thread) => thread.id === currentId) ?? null;
  const loading = threads.status === "loading" && threads.data === null;
  const empty = (threads.data ?? []).length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={thinking}
          aria-label="Conversaciones"
          aria-haspopup="listbox"
          title={thinking ? "Axel está trabajando" : current === null ? "Conversaciones" : threadTitle(current)}
          className={ICON_BUTTON}
        >
          <MessagesSquare className="size-[17px]" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-80 p-1">
        <Command loop aria-label="Conversaciones" className="bg-transparent">
          <CommandList className="max-h-[min(60vh,420px)]">
            <CommandGroup>
              <CommandItem
                value="nueva-conversacion"
                onSelect={() => {
                  newThread();
                  setOpen(false);
                }}
                className="gap-2.5 font-semibold"
              >
                <Plus className="size-4 text-accent-violet" aria-hidden="true" />
                Nueva conversación
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />

            {loading ? (
              <div className="flex flex-col gap-2 p-2" aria-hidden="true">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : empty ? (
              <CommandEmpty className="py-5 text-xs text-muted-foreground">Aún no hay conversaciones</CommandEmpty>
            ) : (
              (["today", "yesterday", "earlier"] as const).map((key) =>
                groups[key].length === 0 ? null : (
                  <CommandGroup key={key} heading={GROUP_LABELS[key]}>
                    {groups[key].map((thread) => (
                      <ThreadRow
                        key={thread.id}
                        thread={thread}
                        current={thread.id === currentId}
                        onSelect={() => {
                          void selectThread(thread.id);
                          setOpen(false);
                        }}
                        onArchive={() => {
                          void archiveThread(thread.id);
                        }}
                      />
                    ))}
                  </CommandGroup>
                ),
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ThreadRow({
  thread,
  current,
  onSelect,
  onArchive,
}: {
  thread: CmoThreadDTO;
  current: boolean;
  onSelect: () => void;
  onArchive: () => void;
}) {
  const title = threadTitle(thread);
  return (
    <CommandItem
      value={thread.id}
      onSelect={onSelect}
      aria-selected={current}
      className="group/thread gap-2.5"
    >
      <span className="min-w-0 flex-1 truncate">{title}</span>
      {current ? (
        <>
          <Check className="size-3.5 flex-none text-accent-violet" aria-hidden="true" />
          <span className="sr-only">actual</span>
        </>
      ) : null}
      <span className="flex-none text-[11px] text-muted-foreground tabular-nums">{threadWhen(thread)}</span>
      <button
        type="button"
        aria-label={`Archivar «${title}»`}
        onClick={(event) => {
          // Que archivar no seleccione: el ítem de cmdk escucha el click del contenedor.
          event.stopPropagation();
          onArchive();
        }}
        className={cn(
          "grid size-6 flex-none place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity",
          "group-hover/thread:opacity-100 focus-visible:opacity-100 hover:bg-foreground/[0.08] hover:text-foreground",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        )}
      >
        <Archive className="size-3.5" aria-hidden="true" />
      </button>
    </CommandItem>
  );
}
