"use client";

/**
 * Buscador global de la consola (Ctrl K / ⌘K), rediseño F1. Sin endpoint
 * nuevo: empresas desde la lista que ya está en caché y vistas del menú
 * (`searchConsole`, dominio con tests). Lo abren el botón «Buscar» de la barra
 * lateral, la lupa de la barra del celular y el atajo de teclado.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command as CommandPrimitive } from "cmdk";
import { CornerDownLeft, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { searchConsole, type CommandHit } from "../../domain/command-search";
import { useTenantsQuery } from "../../infrastructure/api/hooks/use-tenants";
import { usePlatformAuth } from "../../infrastructure/auth/platform-auth.context";
import { NAV_ICONS } from "./nav-icons";

type CommandContextValue = { open: boolean; setOpen: (open: boolean) => void };

const CommandContext = createContext<CommandContextValue | null>(null);

export function usePlatformCommand(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error("usePlatformCommand va dentro de PlatformCommandProvider");
  return ctx;
}

/** ¿Es Ctrl K (o ⌘K)? */
export function isCommandShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">) {
  return event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
}

/**
 * ¿Se puede abrir el buscador? No mientras el `ReLoginModal` está abierto (sobre
 * todo con la sesión vencida, que es bloqueante): el buscador no puede taparlo ni
 * navegar por debajo de él.
 */
export function canOpenCommand(auth: { expired: boolean; reloginOpen: boolean }): boolean {
  return !auth.expired && !auth.reloginOpen;
}

export function PlatformCommandProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpenState] = useState(false);
  const { expired, reloginOpen } = usePlatformAuth();
  const allowed = canOpenCommand({ expired, reloginOpen });
  const allowedRef = useRef(allowed);
  useEffect(() => {
    allowedRef.current = allowed;
  }, [allowed]);

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next && allowedRef.current);
  }, []);

  // Si la sesión vence con el buscador abierto, se cierra: manda el re-login.
  useEffect(() => {
    if (!allowed) setOpenState(false);
  }, [allowed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isCommandShortcut(event) || !allowedRef.current) return;
      event.preventDefault();
      setOpenState((current) => !current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open, setOpen]);
  return (
    <CommandContext.Provider value={value}>
      {children}
      <PlatformCommandDialog />
    </CommandContext.Provider>
  );
}

function HitItem({ hit, onPick }: { hit: CommandHit; onPick: (hit: CommandHit) => void }) {
  const Icon = NAV_ICONS[hit.icon] ?? Search;
  return (
    <CommandPrimitive.Item
      value={hit.id}
      onSelect={() => onPick(hit)}
      className="group flex min-h-10 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm outline-none data-[selected=true]:bg-accent"
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground group-data-[selected=true]:text-brand" />
      {/* El título usa todo el ancho y se corta con difuminado; la pista (contexto) solo desde
          640 px: en el celular le quitaba casi la mitad de la fila al título. */}
      <span className="min-w-0 flex-1 truncate" title={hit.label}>
        {hit.label}
      </span>
      <span className="hidden max-w-[40%] shrink-0 truncate text-xs text-muted-foreground sm:block">{hit.hint}</span>
    </CommandPrimitive.Item>
  );
}

const GROUP_HEADING =
  "px-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:uppercase";

function PlatformCommandDialog() {
  const { open, setOpen } = usePlatformCommand();
  const router = useRouter();
  const [query, setQuery] = useState("");
  // La misma lista en caché que usan la barra lateral, el Inicio y Empresas.
  const tenants = useTenantsQuery();
  const results = useMemo(() => searchConsole(query, tenants.data?.data ?? []), [query, tenants.data]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const pick = useCallback(
    (hit: CommandHit) => {
      setOpen(false);
      router.push(hit.href);
    },
    [router, setOpen],
  );

  const nothing = results.tenants.length === 0 && results.views.length === 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        // Un buscador se descarta tocando fuera (el diálogo compartido lo impide por defecto).
        onPointerDownOutside={() => setOpen(false)}
        // `flex` y no la rejilla del diálogo: una fila larga no puede ensanchar la caja más allá de la pantalla.
        className="top-[12vh] flex translate-y-0 flex-col gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Buscar en la consola</DialogTitle>
        <DialogDescription className="sr-only">Empresas por nombre o NIT, y las vistas de la consola.</DialogDescription>
        {/* `label`: cmdk enlaza el campo a su propia etiqueta (`aria-labelledby`), que sin esto
            queda vacía y deja el buscador sin nombre para el lector de pantalla. */}
        <CommandPrimitive label="Buscar en la consola" shouldFilter={false} loop className="flex min-w-0 flex-col">
          <div className="flex items-center gap-3 border-b border-border px-4">
            <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Busca una empresa, un NIT o una vista"
              aria-label="Buscar en la consola"
              className="h-14 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden shrink-0 rounded-md border border-border px-1.5 font-mono text-[11px] text-muted-foreground sm:inline">
              Esc
            </kbd>
          </div>
          <CommandPrimitive.List className="axi-scroll max-h-[min(60vh,26rem)] overflow-y-auto py-1.5">
            {nothing ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {tenants.isError
                  ? "No pudimos cargar las empresas; solo se buscan las vistas."
                  : "Nada coincide. Prueba con el nombre o el NIT de la empresa."}
              </p>
            ) : null}
            {results.tenants.length > 0 ? (
              <CommandPrimitive.Group heading="Empresas" className={GROUP_HEADING}>
                {results.tenants.map((hit) => (
                  <HitItem key={hit.id} hit={hit} onPick={pick} />
                ))}
              </CommandPrimitive.Group>
            ) : null}
            {results.views.length > 0 ? (
              <CommandPrimitive.Group heading="Vistas" className={GROUP_HEADING}>
                {results.views.map((hit) => (
                  <HitItem key={hit.id} hit={hit} onPick={pick} />
                ))}
              </CommandPrimitive.Group>
            ) : null}
          </CommandPrimitive.List>
          <div className="flex items-center gap-3 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CornerDownLeft aria-hidden="true" className="size-3.5" /> Abrir
            </span>
            <span>↑ ↓ Moverse</span>
            {tenants.isError ? <span className="ml-auto">Empresas sin cargar</span> : null}
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
