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
  canPromote,
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
const SOURCE_DOTS: Record<LeadSource, string> = {
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
    accessorKey: "has_email",
    header: "Datos",
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

export interface LeadColumnsOptions {
  /** Solo con `leads:promote`: sin permiso no se ofrece seleccionar nada. */
  selectable: boolean;
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  /**
   * Qué filas se pueden marcar. Se pasa en vez de cablear `canPromote` porque
   * las acciones en lote ya no son una: a un lead se le pueden buscar datos
   * aunque no sea promovible.
   */
  selectableRow?: (row: LeadRow) => boolean;
  /** Ids con una búsqueda de datos en curso. */
  working?: ReadonlySet<string>;
}

/**
 * Columnas por factory y no constante: la casilla necesita leer la selección y
 * `ColumnDef.cell` solo recibe la fila. Mismo criterio que
 * `buildPromotionFormFields` en marketing.
 */
export function buildLeadColumns(
  options: LeadColumnsOptions,
): ColumnDef<LeadRow>[] {
  const columns = [nameColumn(options.working ?? EMPTY), ...BASE_COLUMNS];
  if (!options.selectable) return columns;
  return [
    {
      accessorKey: "id",
      header: "",
      minWidth: 44,
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="accent-primary size-4 shrink-0"
          checked={options.selected.has(row.original.id)}
          // Un lead ya promovido o suprimido no se puede seleccionar: ofrecer
          // la casilla y que el lote falle después es un botón que miente.
          disabled={!(options.selectableRow ?? canPromote)(row.original)}
          onChange={() => options.onToggle(row.original.id)}
          aria-label={`Seleccionar ${row.original.name}`}
        />
      ),
    },
    ...columns,
  ];
}

const EMPTY: ReadonlySet<string> = new Set();

/** El fetcher del hook: la traducción DTO→fila vive aquí, nunca en la vista. */
export async function fetchLeads(
  params: ListQuery,
): Promise<Paginated<LeadRow>> {
  const page = await listLeads(params as ListLeadsParams);
  return { ...page, data: page.data.map(mapLeadToRow) };
}
