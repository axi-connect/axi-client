"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Copy as CopyIcon,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { FaWhatsapp, FaInstagram, FaFacebookMessenger } from "react-icons/fa";
import { cn } from "@/core/lib/utils";
import { errorMessage } from "@/core/lib/error-messages";
import { relativeTime } from "@/core/lib/relative-time";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  contactDisplayName,
  type ContactChannelIdentity,
  type ContactDTO,
  type ContactProfileDTO,
} from "@/modules/crm/domain/contact";
import { CONTACT_STAGE_LABELS, type ContactLifecycleStage } from "@/modules/crm/domain/enums";
import {
  assignContactOwner,
  deleteContact,
} from "@/modules/crm/infrastructure/services/contacts-service.adapter";

const NO_OWNER = "__none__";

const STAGE_BADGE_CLASSES: Record<ContactLifecycleStage, string> = {
  prospect: "border-transparent bg-secondary text-secondary-foreground",
  lead: "border-transparent bg-info/12 text-info",
  customer: "border-transparent bg-success/12 text-success",
  other: "border-border bg-transparent text-muted-foreground",
};

const CHANNEL_META: Record<
  ContactChannelIdentity["channel_kind"],
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  whatsapp_cloud: { label: "WhatsApp", icon: FaWhatsapp },
  whatsapp_web: { label: "WhatsApp", icon: FaWhatsapp },
  instagram_dm: { label: "Instagram", icon: FaInstagram },
  facebook_messenger: { label: "Messenger", icon: FaFacebookMessenger },
};

/**
 * Cabecera del 360: identidad + etapa + datos de contacto + identidades de
 * canal (read-only) + owner comercial (PATCH profile, gate `crm:manage`).
 * Editar reusa el modal interceptado @form; Eliminar confirma y vuelve a la lista.
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

  const changeOwner = async (value: string) => {
    const next = value === NO_OWNER ? null : value;
    const previous = ownerId;
    setOwnerId(next);
    try {
      await assignContactOwner(contact.id, next);
    } catch (err) {
      setOwnerId(previous);
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo reasignar el dueño"),
        open: true,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteContact(contact.id);
      showAlert({ tone: "success", title: "Contacto eliminado", open: true });
      router.replace("/crm/contacts");
    } catch (err) {
      showAlert({
        tone: "error",
        title: errorMessage(err, "No se pudo eliminar el contacto"),
        open: true,
      });
    } finally {
      closeModal();
    }
  };

  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value);
    showAlert({ tone: "success", title: "Copiado al portapapeles", open: true });
  };

  return (
    <header className="space-y-3">
      <Link
        href="/crm/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Contactos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={contact.avatar_url} alt={name} fallback={name} size={48} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight">{name}</h2>
              <Badge
                variant="outline"
                className={cn(STAGE_BADGE_CLASSES[contact.lifecycle_stage])}
              >
                {CONTACT_STAGE_LABELS[contact.lifecycle_stage]}
              </Badge>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
              {contact.phone && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  onClick={() => copy(contact.phone as string)}
                  aria-label={`Copiar teléfono ${contact.phone}`}
                >
                  {contact.phone}
                  <CopyIcon className="size-3 opacity-60" aria-hidden />
                </button>
              )}
              {contact.email && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  onClick={() => copy(contact.email as string)}
                  aria-label={`Copiar correo ${contact.email}`}
                >
                  {contact.email}
                  <CopyIcon className="size-3 opacity-60" aria-hidden />
                </button>
              )}
              {contact.city && <span>{contact.city}</span>}
            </div>
            {contact.channel_identities.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {contact.channel_identities.map((identity) => {
                  const meta = CHANNEL_META[identity.channel_kind];
                  const Icon = meta.icon;
                  return (
                    <span key={identity.id} className="inline-flex items-center gap-1">
                      <Icon className="size-3.5" aria-hidden />
                      {meta.label}
                      {identity.last_seen_at && ` · ${relativeTime(identity.last_seen_at)}`}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={ownerId ?? NO_OWNER}
            onValueChange={(value: string) => void changeOwner(value)}
            disabled={!canManageCrm}
          >
            <SelectTrigger className="h-9 w-44" aria-label="Dueño comercial">
              <SelectValue placeholder="Sin dueño" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_OWNER}>Sin dueño</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManageContacts && (
            <>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => router.push(`/crm/contacts/update/${contact.id}`)}
              >
                <Pencil className="size-4" />
                Editar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Más acciones">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="flex items-center gap-2"
                    onClick={() => router.push("/crm/contacts/duplicates")}
                  >
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
                          {
                            label: "Eliminar",
                            variant: "destructive",
                            asClose: false,
                            id: "c360-delete-confirm",
                            onClick: () => void handleDelete(),
                          },
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
