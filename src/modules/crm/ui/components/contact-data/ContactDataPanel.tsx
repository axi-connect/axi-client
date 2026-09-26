"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/core/lib/utils";
import { useAuth } from "@/shared/auth/auth.hooks";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { groupByFlow, summarize, type ContactDataDTO } from "@/modules/crm/domain/contact-data";
import { useContactData } from "@/modules/crm/infrastructure/hooks/use-contact-data";
import { ContactDataEmpty } from "./ContactDataEmpty";
import { ContactDataGroup } from "./ContactDataGroup";
import { ContactDataRow } from "./ContactDataRow";
import { ContactDataSummary } from "./ContactDataSummary";
import { SessionLinks } from "./SessionLinks";
import type { ContactDataVariant } from "./types";

function RowsSkeleton({ variant }: { variant: ContactDataVariant }) {
  return (
    <div className="space-y-3 pt-1" role="status" aria-label="Cargando datos del cliente">
      <Skeleton className="h-3 w-2/5" />
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={cn("gap-3", variant === "card" ? "grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] sm:grid-cols-[180px_minmax(0,1fr)]" : "space-y-1.5")}
        >
          <Skeleton className="h-3.5 w-24" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Pie de la card: la regla de protección + las claves técnicas desplegables. */
function TechnicalFooter({ system }: { system: ContactDataDTO["system"] }) {
  const [open, setOpen] = useState(false);
  const count = system.length;
  return (
    <div className="mt-3.5 text-xs text-muted-foreground">
      <p>
        Lo que verificas queda protegido: el agente solo podrá proponer cambios.
        {count > 0 && (
          <>
            {" "}
            <button
              type="button"
              className="rounded-sm underline decoration-border underline-offset-[3px] outline-none hover:decoration-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {count} {count === 1 ? "clave técnica" : "claves técnicas"}
            </button>
          </>
        )}
      </p>
      {open && (
        <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 font-mono text-[12px]">
          {system.map((entry) => (
            <div key={entry.code} className="contents">
              <dt>{entry.code}</dt>
              <dd className="truncate text-foreground">
                {entry.value === null ? "—" : String(entry.value)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/**
 * «Datos del cliente»: lo que el agente, el equipo, una importación o un
 * formulario web han recopilado del contacto, agrupado como los formularios
 * de captura (Registro · Pedido · Cita), con origen, verificación y acciones.
 *
 * Autosuficiente (trae sus propios datos por `contactId`) para poder montarse
 * en el 360 (`variant="card"`) y en el rail del inbox (`variant="rail"`, con
 * `conversationId` para la sección «En esta conversación»). Las acciones se
 * gatean con `contacts:manage`; sin él es solo lectura.
 */
export function ContactDataPanel({
  contactId,
  conversationId,
  variant,
  className,
}: {
  contactId: string;
  conversationId?: string;
  variant: ContactDataVariant;
  className?: string;
}) {
  const titleId = useId();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("contacts:manage");
  const canSeeForms = hasPermission("forms:read");
  const canConfigureForms = hasPermission("forms:manage");
  const { data, loading, error, actorNames, changedCodes, reload, review } = useContactData(
    contactId,
    conversationId,
  );

  let body: React.ReactNode;
  if (data === null && loading) {
    body = <RowsSkeleton variant={variant} />;
  } else if (data === null) {
    body = (
      <div className="flex flex-col items-start gap-2 pt-1">
        <p className="text-sm text-muted-foreground">
          {error ?? "No se pudieron cargar los datos del cliente."}
        </p>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={reload}>
          Reintentar
        </Button>
      </div>
    );
  } else if (data.fields.length === 0) {
    body = <ContactDataEmpty variant={variant} canConfigure={canConfigureForms} />;
  } else {
    const groups = groupByFlow(data.fields);
    body = (
      <>
        <ContactDataSummary summary={summarize(data.fields)} variant={variant} />
        {groups.map((group) => (
          <ContactDataGroup key={group.flow} label={group.label} variant={variant}>
            <dl className="flex flex-col">
              {group.fields.map((field) => (
                <ContactDataRow
                  key={field.code}
                  field={field}
                  variant={variant}
                  canManage={canManage}
                  actorName={
                    field.actor_user_id === null
                      ? null
                      : (actorNames.get(field.actor_user_id) ?? null)
                  }
                  highlighted={changedCodes.has(field.code)}
                  onReview={(reviewBody) => review(field.code, reviewBody)}
                />
              ))}
            </dl>
          </ContactDataGroup>
        ))}
        {variant === "rail" && <SessionLinks session={data.session} />}
        {variant === "card" && <TechnicalFooter system={data.system} />}
      </>
    );
  }

  if (variant === "rail") {
    return (
      <section aria-label="Datos del cliente" className={className}>
        {body}
      </section>
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "rounded-3xl border border-border bg-card px-5 pt-5 pb-[18px] md:px-6 md:pt-6",
        className,
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <h3 id={titleId} className="font-heading text-lg font-bold">
          Datos del cliente
        </h3>
        {canSeeForms && (
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/settings/forms">Formularios de captura</Link>
          </Button>
        )}
      </div>
      {body}
    </section>
  );
}
