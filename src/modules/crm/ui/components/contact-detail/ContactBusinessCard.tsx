"use client";

import { useId, useState } from "react";
import { FaFacebook, FaInstagram, FaLinkedin, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { Globe, Hash, Lock, Map, MapPin, Pencil, Store, Tag } from "lucide-react";
import { formatShortDate } from "@/core/lib/format";
import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { CopyButton } from "@/shared/components/features/field-list";
import {
  businessProfileOf,
  hasBusinessProfile,
  type BusinessKey,
  type BusinessRow,
} from "@/modules/crm/domain/business-profile";
import { useContactData } from "@/modules/crm/infrastructure/hooks/use-contact-data";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

const ICONS: Record<BusinessKey, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  instagram: FaInstagram,
  facebook: FaFacebook,
  tiktok: FaTiktok,
  linkedin: FaLinkedin,
  whatsapp: FaWhatsapp,
  category: Tag,
  company_tax_id: Hash,
  google_maps_url: Map,
};

function BusinessRowItem({
  row,
  canManage,
  onSave,
}: {
  row: BusinessRow;
  canManage: boolean;
  onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState(row.value);
  const Icon = ICONS[row.key];

  if (editing) {
    const save = () => {
      const value = draft.trim();
      if (value === "" || busy) return;
      setBusy(true);
      void onSave(value)
        .then(() => setEditing(false))
        .catch(() => undefined)
        .finally(() => setBusy(false));
    };
    return (
      <li className="flex gap-3 py-2.5">
        <Icon className="mt-2 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div
          className="grid min-w-0 flex-1 gap-2"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setEditing(false);
            } else if (event.key === "Enter") {
              event.preventDefault();
              save();
            }
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={row.label}
            className="h-9"
            autoFocus
          />
          <p className="text-xs text-pretty text-muted-foreground">
            Al guardar queda protegido: la captación ya no lo cambia.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="rounded-full"
              onClick={save}
              disabled={busy || draft.trim() === ""}
            >
              {busy ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="grid min-w-0 flex-1 gap-px">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {row.label}
          {row.corrected && (
            <span className="inline-flex items-center gap-1 text-[11px]">
              <Lock className="size-3" aria-hidden />
              corregido
            </span>
          )}
        </span>
        {row.href === null ? (
          <span className="truncate text-sm" title={row.value}>
            {row.display}
          </span>
        ) : (
          <a
            href={row.href}
            target="_blank"
            rel="noopener noreferrer"
            title={row.value}
            className="truncate rounded-sm text-sm underline decoration-border underline-offset-[3px] hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            {row.display}
          </a>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <CopyButton value={row.value} label={row.label} />
        {canManage && (
          <button
            type="button"
            aria-label={`Corregir ${row.label.toLowerCase()}`}
            onClick={() => {
              setDraft(row.value);
              setEditing(true);
            }}
            className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Pencil className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <h4 className="mb-0.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h4>
      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}

/**
 * «El negocio»: lo que la captación sabe del negocio de este contacto (web,
 * redes, categoría, NIT, ficha de Maps), con abrir, copiar y corregir.
 * Corregir usa la misma revisión que «Datos del cliente», así que el dato queda
 * protegido y la captación no lo vuelve a cambiar. Sin ningún dato del negocio
 * no se pinta. Mockup aprobado: `docs/design/mockups/crm-contact-business.*`.
 */
export function ContactBusinessCard({
  contactId,
  fromProspecting,
}: {
  contactId: string;
  /**
   * El contacto llegó desde Captación. Solo entonces hay tarjeta: en un cliente
   * que escribió por su cuenta, un «instagram» suelto es el suyo, no el de un
   * negocio, y sigue en «Datos del cliente».
   */
  fromProspecting: boolean;
}) {
  const titleId = useId();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("contacts:manage");
  const { showAlert } = useAlert();
  const { data, review } = useContactData(contactId);
  if (data === null || !fromProspecting) return null;
  const profile = businessProfileOf(data.fields);
  if (!hasBusinessProfile(profile)) return null;

  const save = async (row: BusinessRow, value: string) => {
    try {
      await review(row.key, { value });
    } catch (error) {
      showAlert({ tone: "error", title: errorMessage(error, "No se pudo guardar el dato") });
      throw error;
    }
  };
  const renderRows = (rows: BusinessRow[]) =>
    rows.map((row) => (
      <BusinessRowItem
        key={row.key}
        row={row}
        canManage={canManage}
        onSave={(value) => save(row, value)}
      />
    ));

  return (
    <section aria-labelledby={titleId} className="rounded-3xl border border-border bg-card p-5 md:p-6">
      <h3 id={titleId} className="flex items-center gap-2 font-heading text-lg font-bold">
        <Store className="size-4.5" aria-hidden />
        El negocio
      </h3>
      <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
        Lo que encontró la captación. Se completa solo; lo que corrijas se respeta.
      </p>
      {profile.web.length > 0 && <Section title="En internet">{renderRows(profile.web)}</Section>}
      {profile.ficha.length > 0 && <Section title="Ficha">{renderRows(profile.ficha)}</Section>}
      <div className="mt-3.5 flex gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-px size-3.5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p>
              Según Google Maps y su web · Captación
              {profile.capturedAt !== null && `, ${formatShortDate(profile.capturedAt)}`}.
            </p>
            {profile.originalName !== null && (
              <details className="mt-1">
                <summary className="w-fit cursor-pointer rounded-sm underline decoration-border underline-offset-[3px] hover:decoration-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  Nombre en Google Maps
                </summary>
                <p className="mt-1.5 rounded-xl bg-muted px-2.5 py-2 text-foreground [overflow-wrap:anywhere]">
                  {profile.originalName}
                </p>
              </details>
            )}
          </div>
        </div>
    </section>
  );
}

/**
 * Los accesos del Inbox: una fila de enlaces a la web y las redes del negocio,
 * para abrirlos sin salir de la conversación. Sin datos no se pinta.
 */
export function ContactBusinessLinks({
  contactId,
  fromProspecting,
}: {
  contactId: string;
  fromProspecting: boolean;
}) {
  const { data } = useContactData(contactId);
  if (data === null || !fromProspecting) return null;
  const profile = businessProfileOf(data.fields);
  const links = [...profile.web, ...profile.ficha].filter(
    (row): row is BusinessRow & { href: string } => row.href !== null,
  );
  if (links.length === 0) return null;
  return (
    <nav aria-label="El negocio en internet" className="flex flex-wrap gap-1.5">
      {links.map((row) => {
        const Icon = ICONS[row.key];
        const text = row.key === "website" || row.key === "instagram" ? row.display : row.label;
        return (
          <a
            key={row.key}
            href={row.href}
            target="_blank"
            rel="noopener noreferrer"
            title={row.value}
            className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate">{row.key === "google_maps_url" ? "Maps" : text}</span>
          </a>
        );
      })}
    </nav>
  );
}
