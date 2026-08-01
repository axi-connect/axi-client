"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, CircleSlash, Loader2, UserRound } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { assignContactOwner } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import type { AssignableUser } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { getTenantUsers } from "@/modules/crm/infrastructure/services/tenant-users.cache";

/**
 * Selector del RESPONSABLE COMERCIAL del contacto (`PATCH /crm/contacts/:id/profile`).
 *
 * Es un atributo del contacto, no de la conversación: persiste entre
 * conversaciones. El encabezado del popover lo dice explícitamente para que no
 * se confunda con "quién atiende ahora" — eso lo comunican el badge de modo y el
 * botón de acción de la cabecera del chat. (Asignar la conversación a otro
 * operador no existe en el backend; ver docs/modules/inbox.md §C.6.)
 *
 * Compacto por diseño: cabe en una cabecera de 40px.
 */
export function ContactOwnerSelect({
  contactId,
  ownerUserId,
  ownerName,
  onChanged,
  labelClassName,
  className,
}: {
  contactId: string;
  ownerUserId: string | null;
  /** Nombre ya resuelto por el consumidor; evita esperar a `/users` para pintar. */
  ownerName: string | null;
  /** Se llama tras un cambio confirmado para que el consumidor refresque. */
  onChanged?: (ownerUserId: string | null) => void;
  /**
   * Clases del bloque nombre + chevron. El consumidor decide desde qué ancho se
   * ve el nombre (`"hidden lg:inline-flex"`); por debajo queda solo el avatar,
   * cuya etiqueta accesible sigue nombrando al responsable.
   */
  labelClassName?: string;
  className?: string;
}) {
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canManage = hasPermission("crm:manage");

  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  // Optimista: se pinta el destino antes de que responda el servidor.
  const [optimistic, setOptimistic] = useState<{ id: string | null; name: string | null } | null>(
    null,
  );

  const currentId = optimistic !== null ? optimistic.id : ownerUserId;
  const currentName = optimistic !== null ? optimistic.name : ownerName;

  /** Lista cargada al ABRIR, no al montar: la cabecera no debe pagar `/users`. */
  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await getTenantUsers());
      setLoaded(true);
    } catch {
      // Sin lista no hay nada que elegir; el popover muestra el estado vacío.
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function assign(nextId: string | null, nextName: string | null) {
    if (nextId === currentId) {
      setOpen(false);
      return;
    }
    const previous = { id: currentId, name: currentName };
    setOptimistic({ id: nextId, name: nextName });
    setOpen(false);
    setSaving(true);
    try {
      await assignContactOwner(contactId, nextId);
      onChanged?.(nextId);
    } catch (err) {
      // Rollback: el valor mostrado vuelve al anterior, no al del servidor
      // (que no conocemos si la petición nunca llegó).
      setOptimistic(previous);
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo cambiar el responsable"),
        open: true,
      });
    } finally {
      setSaving(false);
    }
  }

  const triggerLabel = currentName ?? "Sin responsable";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && !loaded) void loadUsers();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          role="combobox"
          aria-expanded={open}
          aria-label={`Responsable del contacto: ${triggerLabel}`}
          disabled={!canManage || saving}
          className={cn(
            "h-8 gap-1.5 px-2 font-normal",
            currentName === null && "text-muted-foreground",
            className,
          )}
        >
          {saving ? (
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          ) : currentId !== null ? (
            <Avatar alt="" fallback={currentName ?? "?"} size={20} />
          ) : (
            <UserRound className="size-4 shrink-0" aria-hidden />
          )}
          <span className={cn("items-center gap-1.5", labelClassName ?? "inline-flex")}>
            <span className="max-w-[7rem] truncate text-xs">{triggerLabel}</span>
            <ChevronsUpDown className="size-3 shrink-0 opacity-50" aria-hidden />
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64 p-0">
        <Command>
          <CommandInput placeholder="Buscar persona…" />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Cargando…
              </div>
            ) : (
              <CommandEmpty>Sin resultados</CommandEmpty>
            )}

            {users.length > 0 && (
              <CommandGroup heading="Responsable del contacto">
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    // Búsqueda por nombre Y correo: en equipos grandes los
                    // nombres se repiten y el correo desambigua.
                    value={`${user.name} ${user.email}`}
                    onSelect={() => void assign(user.id, user.name)}
                  >
                    <Avatar src={user.avatar_url} alt="" fallback={user.name} size={22} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email} · {user.role.name}
                      </p>
                    </div>
                    {user.id === currentId && <Check className="size-4 shrink-0" aria-hidden />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {currentId !== null && (
              <CommandGroup>
                <CommandItem value="quitar responsable" onSelect={() => void assign(null, null)}>
                  <CircleSlash className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  Quitar responsable
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
