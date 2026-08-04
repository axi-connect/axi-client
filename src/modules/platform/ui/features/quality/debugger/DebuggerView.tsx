"use client";

/**
 * Depurador forense: tenant → contacto (búsqueda server, cap 25) →
 * conversaciones (cap 25) → descarga del diagnóstico. El directorio incluye
 * entidades simuladas a propósito y TODO acceso queda auditado (aviso
 * permanente arriba). Sin paginación: el cap se declara y se sugiere
 * refinar la búsqueda.
 */
import { useEffect, useState } from "react";
import { MessagesSquare, ShieldAlert, UserSearch } from "lucide-react";
import { cn } from "@/core/lib/utils";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  DEBUG_DIRECTORY_CAP,
  type DebugContact,
} from "../../../../domain/quality-debug";
import {
  useDebugContactsQuery,
  useDebugConversationsQuery,
} from "../../../../infrastructure/api/hooks/use-quality-debug";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { TenantSelect } from "../../../components/TenantSelect";
import { ContactsList } from "./ContactsList";
import { ConversationsList } from "./ConversationsList";
import { ReportDownloadDialog } from "./ReportDownloadDialog";

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function DebuggerView() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<DebugContact | null>(null);
  const [downloadTarget, setDownloadTarget] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft), 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const contactsQuery = useDebugContactsQuery(companyId, search);
  const conversationsQuery = useDebugConversationsQuery(companyId, selectedContact?.id ?? null);

  const contacts = contactsQuery.data?.data ?? [];
  const conversations = conversationsQuery.data?.data ?? [];

  return (
    <div className="space-y-4">
      <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        Herramienta forense: incluye contactos y conversaciones simuladas, y todo acceso (búsquedas y
        descargas) queda registrado en la auditoría de la plataforma.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <TenantSelect
          value={companyId ?? ""}
          onValueChange={(value) => {
            setCompanyId(value);
            setSelectedContact(null);
            setSearchDraft("");
            setSearch("");
          }}
          ariaLabel="Tenant a depurar"
          placeholder="Elige el tenant"
          className="w-56"
        />
        <Input
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          placeholder="Nombre, correo o teléfono…"
          aria-label="Buscar contacto"
          className="w-64"
          disabled={!companyId}
        />
      </div>

      {!companyId ? (
        <EmptyState
          icon={UserSearch}
          title="Elige un tenant"
          description="El directorio de contactos y conversaciones se abre por tenant."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Contactos{" "}
              <span className="font-normal text-muted-foreground">
                (máx. {DEBUG_DIRECTORY_CAP} — refina la búsqueda)
              </span>
            </h3>
            {contactsQuery.isPending ? (
              <ListSkeleton />
            ) : contactsQuery.isError ? (
              <ProblemAlert error={contactsQuery.error} onRetry={() => void contactsQuery.refetch()} />
            ) : contacts.length === 0 ? (
              <EmptyState
                icon={UserSearch}
                title="Sin contactos"
                description={search ? "Nadie coincide con la búsqueda." : "Este tenant no tiene contactos todavía."}
              />
            ) : (
              <div
                className={cn("transition-opacity", contactsQuery.isPlaceholderData && "opacity-60")}
                aria-busy={contactsQuery.isPlaceholderData}
              >
                <ContactsList
                  contacts={contacts}
                  selectedId={selectedContact?.id ?? null}
                  onSelect={setSelectedContact}
                />
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">
              Conversaciones
              {selectedContact && (
                <span className="font-normal text-muted-foreground">
                  {" "}
                  de {selectedContact.full_name ?? "sin nombre"}
                </span>
              )}
            </h3>
            {!selectedContact ? (
              <EmptyState
                icon={MessagesSquare}
                title="Elige un contacto"
                description="Sus conversaciones aparecen aquí con la descarga del diagnóstico."
              />
            ) : conversationsQuery.isPending ? (
              <ListSkeleton />
            ) : conversationsQuery.isError ? (
              <ProblemAlert
                error={conversationsQuery.error}
                onRetry={() => void conversationsQuery.refetch()}
              />
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="Sin conversaciones"
                description="Este contacto no tiene conversaciones registradas."
              />
            ) : (
              <ConversationsList
                conversations={conversations}
                onDownload={(conversation) => setDownloadTarget(conversation.id)}
              />
            )}
          </section>
        </div>
      )}

      <ReportDownloadDialog
        open={downloadTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDownloadTarget(null);
        }}
        target={companyId && downloadTarget ? { companyId, conversationId: downloadTarget } : null}
      />
    </div>
  );
}
