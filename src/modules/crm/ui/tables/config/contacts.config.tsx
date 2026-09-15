"use client";

import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import { Avatar } from "@/shared/components/ui/avatar";
import type { ColumnDef } from "@/shared/components/features/data-table";
import type { Paginated } from "@/core/api/types";
import type { ListQuery } from "@/shared/api/query";
import { formatShortDate } from "@/core/lib/format";
import { cn } from "@/core/lib/utils";
import {
  mapContactToRow,
  type ContactRow,
  type ListContactsParams,
} from "@/modules/crm/domain/contact";
import {
  CONTACT_SOURCE_LABELS,
  CONTACT_STAGE_LABELS,
  type ContactLifecycleStage,
} from "@/modules/crm/domain/enums";
import {
  completenessTone,
  dataCompleteness,
  type CompletenessTone,
} from "@/modules/crm/domain/contact-data";
import { listContacts } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { getTenantFormsSafe } from "@/modules/crm/infrastructure/services/forms.cache";
import { ContactRowActions } from "@/modules/crm/ui/tables/contacts.actions";

/** Punto de estado de la columna «Datos»: verde completo · ámbar incompleto · gris sin formularios. */
const DATA_DOT_CLASSES: Record<CompletenessTone, string> = {
  complete: "bg-success",
  partial: "bg-warning",
  none: "bg-muted-foreground/40",
};

const DATA_TONE_LABELS: Record<CompletenessTone, string> = {
  complete: "Datos completos",
  partial: "Datos incompletos",
  none: "Sin formularios de captura",
};

/**
 * Celda «Datos»: `n / total` con un punto de color (estado = punto, jamás
 * badge tintado). Sin formularios activos, «—» en gris.
 */
function DataCompletenessCell({ row }: { row: ContactRow }) {
  const completeness =
    row.data_filled === null || row.data_total === null
      ? null
      : { filled: row.data_filled, total: row.data_total };
  const tone = completenessTone(completeness);
  return (
    <span
      className="inline-flex items-center gap-2 text-sm tabular-nums"
      title={DATA_TONE_LABELS[tone]}
    >
      <span aria-hidden className={cn("size-[7px] shrink-0 rounded-full", DATA_DOT_CLASSES[tone])} />
      <span className="sr-only">{DATA_TONE_LABELS[tone]}:</span>
      {completeness === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span>
          {completeness.filled} / {completeness.total}
        </span>
      )}
    </span>
  );
}

/** Tono suave por etapa (borde/fondo tenue, nunca fondo saturado). */
const STAGE_BADGE_CLASSES: Record<ContactLifecycleStage, string> = {
  prospect: "border-transparent bg-secondary text-secondary-foreground",
  lead: "border-transparent bg-info/12 text-info",
  customer: "border-transparent bg-success/12 text-success",
  other: "border-border bg-transparent text-muted-foreground",
};

export const contactColumns: ColumnDef<ContactRow>[] = [
  {
    accessorKey: "full_name",
    header: "Contacto",
    alwaysVisible: true,
    minWidth: 220,
    cell: ({ row }) => (
      <Link
        href={`/crm/contacts/${row.original.id}`}
        className="group flex items-center gap-3 py-0.5"
      >
        <Avatar src={row.original.avatar_url} alt={row.original.full_name} fallback={row.original.full_name} />
        <div className="min-w-0">
          <p className="truncate font-medium transition-colors group-hover:text-brand">
            {row.original.full_name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.phone ?? row.original.email ?? "Sin datos de contacto"}
          </p>
        </div>
      </Link>
    ),
  },
  {
    accessorKey: "lifecycle_stage",
    header: "Etapa",
    alwaysVisible: true,
    cell: ({ row }) => (
      <Badge variant="outline" className={cn(STAGE_BADGE_CLASSES[row.original.lifecycle_stage])}>
        {CONTACT_STAGE_LABELS[row.original.lifecycle_stage]}
      </Badge>
    ),
  },
  {
    accessorKey: "city",
    header: "Ciudad",
    minWidth: 100,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{row.original.city ?? "—"}</span>
    ),
  },
  {
    accessorKey: "source",
    header: "Fuente",
    minWidth: 110,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {CONTACT_SOURCE_LABELS[row.original.source]}
      </span>
    ),
  },
  {
    accessorKey: "data_filled",
    header: "Datos",
    minWidth: 90,
    cell: ({ row }) => <DataCompletenessCell row={row.original} />,
  },
  {
    accessorKey: "created_at",
    header: "Creado",
    minWidth: 90,
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatShortDate(row.original.created_at)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    alwaysVisible: true,
    cell: ({ row }) => <ContactRowActions row={row.original} />,
  },
];

/**
 * Fetch server-side para `usePaginatedList` (mapeo DTO→Row aquí, no en la UI).
 * La columna «Datos» se calcula en cliente sobre lo que ya trae el listado
 * (columnas + `custom_fields`) y los formularios activos, cacheados por sesión.
 */
export async function fetchContacts(
  params: ListQuery & ListContactsParams,
): Promise<{ data: ContactRow[]; meta: Paginated<never>["meta"] }> {
  const [res, forms] = await Promise.all([listContacts(params), getTenantFormsSafe()]);
  return {
    data: res.data.map((dto) => {
      const { custom_fields, ...columns } = dto;
      return mapContactToRow(dto, dataCompleteness(custom_fields, columns, forms));
    }),
    meta: res.meta,
  };
}
