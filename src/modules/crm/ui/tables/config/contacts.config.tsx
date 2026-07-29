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
import { listContacts } from "@/modules/crm/infrastructure/services/contacts-service.adapter";
import { ContactRowActions } from "@/modules/crm/ui/tables/contacts.actions";

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

/** Fetch server-side para `usePaginatedList` (mapeo DTO→Row aquí, no en la UI). */
export async function fetchContacts(
  params: ListQuery & ListContactsParams,
): Promise<{ data: ContactRow[]; meta: Paginated<never>["meta"] }> {
  const res = await listContacts(params);
  return { data: res.data.map(mapContactToRow), meta: res.meta };
}
