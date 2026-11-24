"use client";

import Link from "next/link";
import { LoaderCircle, Mail, MessageCircle, Phone } from "lucide-react";

import type { Paginated } from "@/core/api/types";
import { formatShortDate } from "@/core/lib/format";
import type { ListQuery } from "@/shared/api/query";
import type { ColumnDef } from "@/shared/components/features/data-table";
import { StatePill } from "@/shared/components/features/bento";
import { StatusBadge } from "@/shared/components/features/status-badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";

import {
  QUALITY_STATUS_MAP,
  REACH_CHANNELS,
  REACH_LEVELS,
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
  // P2: también «lo salimos a buscar».
  apollo_people: "bg-accent",
  rues_open: "bg-accent",
  website: "bg-accent",
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
    // El mismo tope que la celda (13rem): la tabla reparte columnas con este número.
    minWidth: 208,
    cell: ({ row }) => (
      // Ancho con tope: un nombre de 100 caracteres se corta con difuminado en
      // vez de empujar «Quién decide» y «Alcance» fuera de la tabla.
      <Link
        href={`/marketing/leads/${row.original.id}`}
        className="hover:text-brand block max-w-[13rem] min-w-0"
      >
        <span className="block truncate text-sm font-semibold" title={row.original.name}>
          {row.original.name}
        </span>
        {/* P2: una persona dice su cargo, su papel y su negocio bajo el nombre. */}
        {row.original.person_line.length > 0 && (
          <span className="text-muted-foreground block truncate text-xs">{row.original.person_line}</span>
        )}
        {working.has(row.original.id) ? (
          <span className="text-info flex items-center gap-1.5 text-xs">
            <LoaderCircle aria-hidden className="size-3 animate-spin" />
            Buscando datos…
          </span>
        ) : (
          <span className="text-muted-foreground block truncate text-xs" title={row.original.contact_line || undefined}>
            {row.original.contact_line || "Sin datos de contacto"}
          </span>
        )}
        {/* «Origen · Ciudad» vive aquí, a la vista en TODOS los anchos: antes eran dos columnas que la
            tabla escondía tras «Ver más» en cuanto faltaba sitio. */}
        <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
          <span className={`size-2 shrink-0 rounded-sm ${SOURCE_DOTS[row.original.source]}`} aria-hidden />
          <span className="truncate">
            {SOURCE_LABELS[row.original.source]}
            {row.original.city !== null && ` · ${row.original.city}`}
          </span>
        </span>
        {/* En el celular solo cabe esta columna: quién decide y el alcance bajan aquí, en una línea. */}
        {row.original.kind === "business" && row.original.reach_level !== null && (
          <span className="flex min-w-0 items-center gap-1.5 pt-0.5 text-xs sm:hidden">
            <span
              aria-hidden
              className={`size-1.5 shrink-0 rounded-full ${REACH_DOTS[REACH_LEVELS[row.original.reach_level].tone]}`}
            />
            <span className="truncate">
              <span className="text-foreground font-medium">
                {/* De una pista no hace falta más: su alcance ya dice «Por confirmar». */}
                {row.original.decider_name ?? "Sin identificar"}
              </span>
              <span className="text-muted-foreground"> · {REACH_LEVELS[row.original.reach_level].label}</span>
            </span>
          </span>
        )}
      </Link>
    ),
  };
}

/** El punto de color del alcance en la línea de celular (el mismo de la píldora). */
const REACH_DOTS: Record<"success" | "info" | "warning" | "neutral" | "destructive", string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  neutral: "bg-muted-foreground",
  destructive: "bg-destructive",
};

const REACH_ICONS = { whatsapp: MessageCircle, email: Mail, call: Phone } as const;

/**
 * Quién decide en el negocio. Un HECHO se nombra con su cargo; una PISTA (un
 * nombre leído en su sitio web) se nombra con «Por confirmar» debajo; sin
 * nadie, «Sin identificar». Nunca vacío: la ausencia también es un dato.
 */
function DecisionMakerCell({ row }: { row: LeadRow }) {
  // Una persona no «tiene» quien decide: la columna es de negocios.
  if (row.kind === "person") return <span className="text-muted-foreground text-xs">—</span>;
  if (row.decider_name === null) {
    return <span className="text-muted-foreground text-[13.5px]">Sin identificar</span>;
  }
  const { decider_name: name, decider_title: title, decider_level: level } = row;
  return (
    <span className="flex max-w-[8.5rem] min-w-0 flex-col gap-px">
      {/* Hasta dos renglones: «Mariana Restrepo Gil» cabe entero; lo que pase de ahí se difumina. */}
      <span className="line-clamp-2 text-[13.5px] leading-snug font-medium whitespace-normal" title={name}>
        {name}
      </span>
      <span className="text-muted-foreground truncate text-xs" title={title ?? undefined}>
        {level === "hypothesis" ? "Por confirmar" : (title ?? "Decide")}
      </span>
    </span>
  );
}

/**
 * Qué tan cerca estamos de esa persona, y por dónde hay un dato útil. NO es el
 * permiso: eso sigue en «Puedo contactar por», dos columnas más allá.
 */
function ReachCell({ row }: { row: LeadRow }) {
  if (row.reach_level === null) return <span className="text-muted-foreground text-xs">—</span>;
  const level = REACH_LEVELS[row.reach_level];
  const have = REACH_CHANNELS.filter((channel) => row[channel.row]).map((channel) => channel.label);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring/50 flex flex-col items-start gap-1.5 rounded-md text-left outline-none focus-visible:ring-[3px]"
          aria-label={`Alcance: ${level.label}. ${have.length > 0 ? `Hay dato para ${have.join(", ")}` : "Sin datos de contacto"}.`}
        >
          <StatePill tone={level.tone}>{level.label}</StatePill>
          <span aria-hidden className="flex items-center gap-1">
            {REACH_CHANNELS.map((channel) => {
              const Icon = REACH_ICONS[channel.key];
              return (
                <span
                  key={channel.key}
                  className={`grid size-6 place-items-center rounded-md border ${
                    row[channel.row] ? "border-foreground/30" : "border-border text-foreground/35 border-dashed"
                  }`}
                >
                  <Icon className="size-3" />
                </span>
              );
            })}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-72">
        <p className="font-medium">{level.label}</p>
        <p className="text-muted-foreground mt-0.5 text-xs">{level.hint}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {have.length > 0 ? `Hay dato para: ${have.join(", ")}.` : "No hay datos de contacto todavía."}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * El ORDEN es la prioridad: cuando la tabla no cabe, ceden primero las últimas.
 *
 * 1. «Quién decide» y «Alcance»: a quién hay que llegarle y qué tan cerca estamos.
 * 2. «Calidad del dato» y «Puedo contactar por», contiguas y SEPARADAS a
 *    propósito: la fila tiene que poder decir «verificado» y «WhatsApp no» al
 *    mismo tiempo. El permiso no cede antes que un dato descriptivo.
 * 3. «Calidad»: el puntaje por el que se ordena la bandeja. Tiene que verse a
 *    1280 px, y los anchos mínimos están ajustados para eso.
 * 4. «Datos» y «Descubierto»: las primeras en pasar al botón de fin de fila.
 *
 * «Origen» y «Ciudad» ya no son columnas: van como tercera línea de la celda
 * «Lead», a la vista en todos los anchos.
 *
 * Holgura a 1280 px, medida en pantalla (M6 de la 2.ª auditoría): la tabla
 * medía 953 px en un contenedor de 942. La celda del lead bajó a 13rem y la de
 * quien decide a 8.5rem; no debe haber desplazamiento horizontal a ese ancho.
 *
 * Qué cabe (menú lateral abierto): a 1440 px, todo menos «Descubierto»; a
 * 1280 px, hasta «Calidad»; a 768 px, «Quién decide» y «Alcance»; en el
 * celular, solo «Lead», con quién decide y el alcance en una línea bajo el nombre.
 */
const BASE_COLUMNS: ColumnDef<LeadRow>[] = [
  {
    accessorKey: "decider_name",
    header: "Quién decide",
    // 8.5rem de celda más su relleno.
    minWidth: 152,
    cell: ({ row }) => <DecisionMakerCell row={row.original} />,
  },
  {
    accessorKey: "reach_level",
    header: "Alcance",
    minWidth: 118,
    cell: ({ row }) => <ReachCell row={row.original} />,
  },
  {
    accessorKey: "quality_status",
    header: "Calidad del dato",
    // 130: a 768 px no cabe (si entrara, empujaría el botón de fin de fila) y a 1280 sí.
    minWidth: 130,
    headerCell: () => <TwoLineHeader>Calidad del dato</TwoLineHeader>,
    cell: ({ row }) => (
      <StatusBadge
        status={row.original.quality_status}
        map={QUALITY_STATUS_MAP}
      />
    ),
  },
  {
    accessorKey: "allows_whatsapp",
    header: "Puedo contactar por",
    // El rótulo va en dos renglones: en uno solo pedía 150 px para tres iconos.
    minWidth: 124,
    headerCell: () => <TwoLineHeader>Puedo contactar por</TwoLineHeader>,
    cell: ({ row }) => <ChannelPermissions lead={rowChannelSubject(row.original)} />,
  },
  {
    accessorKey: "quality_score",
    header: "Calidad",
    minWidth: 120,
    cell: ({ row }) => <QualityIndex row={row.original} />,
  },
  {
    accessorKey: "data_count",
    header: "Datos",
    // Ordenable de verdad: antes el `accessorKey` era `has_email`, una mentira
    // de conveniencia que hacía que ordenar por «Datos» ordenara por «tiene
    // correo». Ahora es la columna generada que el servidor cuenta.
    sortable: true,
    minWidth: 88,
    cell: ({ row }) => <DataDots row={row.original} />,
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

/** Un rótulo de columna largo, partido en dos renglones para no ensanchar la columna. */
function TwoLineHeader({ children }: { children: string }) {
  return <span className="block max-w-[7rem] leading-tight whitespace-normal">{children}</span>;
}

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
