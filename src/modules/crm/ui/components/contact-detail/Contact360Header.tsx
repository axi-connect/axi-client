"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy as CopyIcon, Mail, MoreVertical, Pencil, Phone, Trash2 } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { formatShortDate } from "@/core/lib/format";
import { relativeTime } from "@/core/lib/relative-time";
import { useAlert } from "@/core/providers/alert-provider";
import { ChannelKindIcon } from "@/modules/channels/public";
import { contactDisplayName, primaryChannel, type ContactDTO, type ContactProfileDTO } from "@/modules/crm/domain/contact";
import { CONTACT_STAGE_LABELS, type ContactLifecycleStage } from "@/modules/crm/domain/enums";
import { assignContactOwner, deleteContact } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { useAuth } from "@/shared/auth/auth.hooks";
import { StatePill, type StatePillTone } from "@/shared/components/features/bento";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

const NO_OWNER = "__none__";

const STAGE_TONE: Record<ContactLifecycleStage, StatePillTone> = {
  prospect: "neutral",
  lead: "info",
  customer: "success",
  other: "neutral",
};

const CHANNEL_LABEL = {
  whatsapp_cloud: "WhatsApp",
  whatsapp_web: "WhatsApp",
  instagram_dm: "Instagram",
  facebook_messenger: "Messenger",
} as const;

/**
 * Cabecera del 360 (lienzo CRM premium F2, tablero 4): el nombre en grande
 * con su etapa, los datos para copiar en píldoras y una línea de contexto
 * (ciudad · canal y última vez · desde cuándo). A la derecha, el responsable
 * (PATCH profile, gate `crm:manage`), Editar y el menú.
 *
 * Nada se desborda: el nombre trunca con `title`, el correo largo también, y
 * en el celular las acciones bajan a su propia fila.
 */
export function Contact360Header({
  contact,
  profile,
  users,
}: {
  contact: ContactDTO;
  profile: ContactProfileDTO;
  users: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const { hasPermission } = useAuth();
  const { showAlert, showModal, closeModal } = useAlert();
  const canManageCrm = hasPermission("crm:manage");
  const canManageContacts = hasPermission("contacts:manage");
  const [ownerId, setOwnerId] = useState<string | null>(profile.owner_user_id);
  const name = contactDisplayName(contact);
  const channel = primaryChannel(contact.channel_identities);

  const changeOwner = async (value: string) => {
    const next = value === NO_OWNER ? null : value;
    const previous = ownerId;
    setOwnerId(next);
    try {
      await assignContactOwner(contact.id, next);
    } catch (err) {
      setOwnerId(previous);
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo reasignar el responsable") });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact(contact.id);
      showAlert({ tone: "success", title: "Contacto eliminado" });
      router.replace("/crm/contacts");
    } catch (err) {
      showAlert({ tone: "error", title: errorMessage(err, "No se pudo eliminar el contacto") });
    } finally {
      closeModal();
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value);
    showAlert({ tone: "success", title: "Copiado al portapapeles" });
  };

  const context = [
    contact.city,
    channel.channel_kind !== null
      ? `${CHANNEL_LABEL[channel.channel_kind]}${channel.last_seen_at !== null ? `, escribió ${relativeTime(channel.last_seen_at)}` : ""}`
      : null,
    `desde el ${formatShortDate(contact.created_at)}`,
  ].filter((part): part is string => part !== null && part !== "");

  return (
    <header className="space-y-4">
      <Link
        href="/crm/contacts"
        className="inline-flex min-h-6 items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Contactos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-[min(100%,20rem)] flex-1 items-center gap-4">
          <Avatar src={contact.avatar_url} alt="" fallback={name} size={64} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="min-w-0 truncate font-heading text-2xl leading-tight font-bold tracking-tight md:text-3xl" title={name}>
                {name}
              </h1>
              <StatePill tone={STAGE_TONE[contact.lifecycle_stage]}>{CONTACT_STAGE_LABELS[contact.lifecycle_stage]}</StatePill>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {contact.phone && (
                <button
                  type="button"
                  className="inline-flex h-7 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => copy(contact.phone as string)}
                  aria-label={`Copiar teléfono ${contact.phone}`}
                >
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate tabular-nums">{contact.phone}</span>
                  <CopyIcon className="size-3 shrink-0 opacity-60" aria-hidden />
                </button>
              )}
              {contact.email && (
                <button
                  type="button"
                  className="inline-flex h-7 max-w-[18rem] min-w-[8rem] items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => copy(contact.email as string)}
                  aria-label={`Copiar correo ${contact.email}`}
                  title={contact.email}
                >
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{contact.email}</span>
                  <CopyIcon className="size-3 shrink-0 opacity-60" aria-hidden />
                </button>
              )}
              <span className="inline-flex min-w-0 items-center gap-1.5 text-[13px] text-muted-foreground">
                {channel.channel_kind !== null && <ChannelKindIcon kind={channel.channel_kind} className="size-3.5" />}
                <span className="truncate">
                  {context.map((part, index) => (
                    <span key={part} className="whitespace-nowrap">
                      {part}
                      {index < context.length - 1 ? " · " : ""}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex max-w-full min-w-0 flex-wrap items-center gap-2">
          <Select value={ownerId ?? NO_OWNER} onValueChange={(value: string) => void changeOwner(value)} disabled={!canManageCrm}>
            <SelectTrigger className="h-10 w-auto max-w-[15rem] min-w-0 rounded-full bg-card [&>span]:truncate" aria-label="Responsable del contacto">
              <SelectValue placeholder="Sin responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_OWNER}>Sin responsable</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canManageContacts && (
            <>
              <Button variant="outline" className="h-10 rounded-full" onClick={() => router.push(`/crm/contacts/update/${contact.id}`)}>
                <Pencil className="size-4" aria-hidden />
                Editar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-10 rounded-full" aria-label="Más acciones">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="flex items-center gap-2" onClick={() => router.push("/crm/contacts/duplicates")}>
                    <CopyIcon className="size-4" /> Buscar duplicados
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="flex items-center gap-2 text-destructive"
                    onClick={() =>
                      showModal({
                        title: "Eliminar contacto",
                        description: `¿Seguro que deseas eliminar a “${name}”? Sus conversaciones y pedidos se conservan.`,
                        actions: [
                          { label: "Cancelar", variant: "outline", asClose: true, id: "c360-delete-cancel" },
                          { label: "Eliminar", variant: "destructive", asClose: false, id: "c360-delete-confirm", onClick: () => void handleDelete() },
                        ],
                        className: "sm:max-w-md",
                      })
                    }
                  >
                    <Trash2 className="size-4" /> Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
