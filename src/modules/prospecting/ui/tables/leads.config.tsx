"use client";

import Link from "next/link";
import { LoaderCircle } from "lucide-react";

import type { Paginated } from "@/core/api/types";
import { formatShortDate } from "@/core/lib/format";
import type { ListQuery } from "@/shared/api/query";
import type { ColumnDef } from "@/shared/components/features/data-table";
import { StatusBadge } from "@/shared/components/features/status-badge";

import {
  QUALITY_STATUS_MAP,
  SOURCE_LABELS,
  dataCompleteness,
  mapLeadToRow,
  rowChannelSubject,
  type LeadRow,
  type LeadSource,
} from "../../domain/lead";
import {
  listLeads,
  type ListLeadsParams,
} from "../../infrastructure/services/prospecting-service.adapter";
import { ChannelPermissions } from "../components/ChannelPermissions";
import { QualityIndex } from "../components/QualityIndex";

/**
 * Punto de color por fuente: se reconoce antes de leer la etiqueta.
 *
 * Las de F4 comparten el acento y no llevan color de marca a propósito: lo que
 * el ojo tiene que separar de un vistazo es «me escribió» de «lo salimos a
 * buscar», no Google de OpenStreetMap.
 */
export const SOURCE_DOTS: Record<LeadSource, string> = {
  ctwa: "bg-[var(--logo-whatsapp)]",
  meta_lead_ads: "bg-[var(--logo-messenger)]",
  manual: "bg-muted-foreground",
  google_places: "bg-accent",
  openstreetmap: "bg-accent",
  serp: "bg-accent",
};

/**
 * La celda del lead. Cuando hay una búsqueda de datos en curso lo dice bajo el
 * nombre, en vez de pintar el badge `enriching` de `LEAD_STATUS_MAP`: ese badge
 * es el ciclo de vida del lead, y el lead sigue siendo `new` o `qualified`.
 * Taparlo con un estado que el servidor nunca escribe sería mentir sobre él.
 * Lo transitorio es nuestra petición.
 */
function nameColumn(working: ReadonlySet<string>): ColumnDef<LeadRow> {
  return {
    accessorKey: "name",
    header: "Lead",
    alwaysVisible: true,
    minWidth: 220,
    cell: ({ row }) => (
      <Link
        href={`/marketing/leads/${row.original.id}`}
        className="hover:text-brand block"
      >
        <span className="block text-sm font-semibold">{row.original.name}</span>
        {working.has(row.original.id) ? (
          <span className="text-info flex items-center gap-1.5 text-xs">
            <LoaderCircle aria-hidden className="size-3 animate-spin" />
            Buscando datos…
          </span>
        ) : (
          <span className="text-muted-foreground block text-xs">
            {row.original.contact_line || "Sin datos de contacto"}
          </span>
        )}
      </Link>
    ),
  };
}

const BASE_COLUMNS: ColumnDef<LeadRow>[] = [
  {
    accessorKey: "source",
    header: "Origen",
    cell: ({ row }) => (
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <span
          className={`size-2 rounded-sm ${SOURCE_DOTS[row.original.source]}`}
          aria-hidden
        />
        {SOURCE_LABELS[row.original.source]}
      </span>
    ),
  },
  {
    // Estas DOS columnas van contiguas y SEPARADAS a propósito: la fila tiene
    // que poder decir «verificado» y «WhatsApp no» al mismo tiempo. Fusionarlas
    // en un solo indicador es el error que acaba quemando números de WhatsApp.
    accessorKey: "quality_status",
    header: "Calidad del dato",
    minWidth: 140,
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.quality_status}
        map={QUALITY_STATUS_MAP}
      />
    ),
  },
  {
    accessorKey: "quality_score",
    header: "Calidad",
    minWidth: 130,
    cell: ({ row }) => <QualityIndex row={row.original} />,
  },
  {
    accessorKey: "data_count",
    header: "Datos",
    // Ordenable de verdad: antes el `accessorKey` era `has_email`, una mentira
    // de conveniencia que hacía que ordenar por «Datos» ordenara por «tiene
    // correo». Ahora es la columna generada que el servidor cuenta.
    sortable: true,
    minWidth: 92,
    cell: ({ row }) => <DataDots row={row.original} />,
  },
  {
    accessorKey: "allows_whatsapp",
    header: "Puedo contactar por",
    minWidth: 120,
    cell: ({ row }) => <ChannelPermissions lead={rowChannelSubject(row.original)} />,
  },
  {
    accessorKey: "city",
    header: "Ciudad",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.city ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Descubierto",
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {formatShortDate(row.original.created_at)}
      </span>
    ),
  },
];

/**
 * Cuántos datos clave conocemos. NEUTRO A PROPÓSITO: verde/rojo aquí se leería
 * como un juicio de calidad, y son dos ejes distintos. Un lead puede tener los
 * cinco datos y seguir sin permiso de WhatsApp; y otro con dos verificados vale
 * más que uno con cinco sin verificar.
 */
function DataDots({ row }: { row: LeadRow }) {
  const { filled, total } = dataCompleteness(row);
  return (
    <div className="flex flex-col gap-1">
      <span aria-hidden className="flex gap-[3px]">
        {Array.from({ length: total }, (_, index) => (
          <i
            key={index}
            className={`size-[7px] rounded-full ${
              index < filled ? "bg-foreground/55" : "bg-foreground/15"
            }`}
          />
        ))}
      </span>
      <span className="text-muted-foreground text-[11px] tabular-nums">
        {filled} de {total}
      </span>
    </div>
  );
}

/**
 * Columnas por factory y no constante: la del nombre necesita saber qué filas
 * están buscando datos, y `ColumnDef.cell` solo recibe la fila.
 *
 * **La casilla de selección ya NO se declara aquí.** La sintetiza `DataTable`
 * desde su prop `selection`, con `pinned: "start"` — que es lo único que
 * garantiza que salga primera y no se caiga dentro del panel «Ver más», porque
 * `useResponsiveColumns` reordena y la posición en el array no era la de
 * pantalla. Aquí estaba, en efecto, en el sitio equivocado.
 */
export function buildLeadColumns(
  working: ReadonlySet<string> = EMPTY,
): ColumnDef<LeadRow>[] {
  return [nameColumn(working), ...BASE_COLUMNS];
}

const EMPTY: ReadonlySet<string> = new Set();

/** El fetcher del hook: la traducción DTO→fila vive aquí, nunca en la vista. */
export async function fetchLeads(
  params: ListQuery,
): Promise<Paginated<LeadRow>> {
  const page = await listLeads(params as ListLeadsParams);
  return { ...page, data: page.data.map(mapLeadToRow) };
}
