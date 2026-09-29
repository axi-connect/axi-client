"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { KeyRound, TriangleAlert, UsersRound } from "lucide-react";

import { errorMessage } from "@/core/lib/error-messages";
import { useAlert } from "@/core/providers/alert-provider";
import { useAuth } from "@/shared/auth/auth.hooks";
import { usePaginatedList } from "@/shared/api/use-paginated-list";
import type { ListQuery } from "@/shared/api/query";
import { DataTable } from "@/shared/components/features/data-table";
import type { ColumnDef } from "@/shared/components/features/data-table/types";
import { EmptyState } from "@/shared/components/features/empty-state";
import { TableSkeleton } from "@/shared/components/features/loading";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { BrandLoader } from "@/shared/components/ui/brand-loader";
import { Button } from "@/shared/components/ui/button";
import { SegmentedControl } from "@/shared/components/ui/segmented";

import type { LeadDTO } from "../domain/lead";
import {
  EMPTY_PEOPLE_FILTERS,
  PEOPLE_PAGE_SIZE,
  SIZE_OPTIONS,
  peopleSearchInput,
  type PeopleFilters as Filters,
} from "../domain/people-filters";
import {
  BUYING_ROLE_LABELS,
  NO_REVEAL_COSTS,
  revealCandidateOf,
  revealCeiling,
  type BuyingRole,
  type RevealCosts,
} from "../domain/person";
import { isInFlight, type DiscoveryCategoryDTO, type SearchDTO, type SourceCatalogItemDTO } from "../domain/search";
import {
  getSearch,
  listLeads,
  listMyProviderKeys,
  listSources,
  nextSearchPage,
  promoteLeads,
  revealLeads,
  startSearch,
} from "../infrastructure/services/prospecting-service.adapter";
import { CaptureHeader } from "./components/CaptureHeader";
import { PeopleFilters } from "./components/PeopleFilters";
import { RevealButtons } from "./components/RevealButtons";

/** Mientras la búsqueda corre se mira la fila: termina en segundos. */
const SEARCH_POLL_MS = 1_500;
/** Revelar el correo tarda segundos; el celular, minutos. Se pregunta según lo que se espera. */
const EMAIL_POLL_MS = 3_000;
const PHONE_POLL_MS = 15_000;
/** Pasado esto, el servidor ya cerró la espera («no llegó»): se deja de esperar aquí también. */
const PHONE_WAIT_MS = 30 * 60_000;

type Tab = "new" | "saved";

/** Una fila de la tabla. Plana: el `DataTable` solo pinta primitivos. */
type PersonRow = {
  id: string;
  name: string;
  title: string | null;
  role: BuyingRole;
  confidence: number | null;
  company: string | null;
  company_id: string | null;
  city: string | null;
  masked: boolean;
  revealable: boolean;
  email: string | null;
  phone: string | null;
  has_email: boolean;
  has_phone: boolean;
  in_crm: boolean;
};

function rowOf(lead: LeadDTO): PersonRow {
  const candidate = revealCandidateOf(lead);
  const name =
    lead.display_name ?? ([lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Sin nombre");
  return {
    id: lead.id,
    name,
    title: lead.title,
    role: lead.buying_role ?? "unknown",
    confidence: lead.decision_maker_confidence,
    company: lead.parent?.display_name ?? null,
    company_id: lead.parent?.id ?? null,
    city: lead.parent?.city ?? lead.city,
    masked: lead.masked,
    revealable: lead.source === "apollo_people",
    email: lead.email,
    phone: lead.phone,
    has_email: candidate.has_email,
    has_phone: candidate.has_phone,
    in_crm: lead.contact_id !== null,
  };
}

/**
 * Captación › Personas (tablero 5, P2 del piloto).
 *
 * Buscar a quien decide, por cargo y por empresa, en Apollo con la llave del
 * propio negocio. Buscar es gratis; revelar el correo o el celular cuesta lo
 * que la cuenta declara, y solo si Apollo lo encuentra.
 *
 * No hay un buscador aparte: cada «Buscar» es una `prospecting_search` de la
 * fuente `apollo_people` en modo navegar (una página por clic), y las personas
 * son leads de la cuarentena colgados de su negocio. «Nuevos» son las de ESTA
 * búsqueda; «Guardados», todas las ya reveladas de cualquier búsqueda.
 */
export function PeopleView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const searchId = params.get("search");
  const { hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const canManage = hasPermission("leads:manage");
  const canPromote = hasPermission("leads:promote");

  const [source, setSource] = useState<SourceCatalogItemDTO | null>(null);
  const [categories, setCategories] = useState<DiscoveryCategoryDTO[]>([]);
  const [costs, setCosts] = useState<RevealCosts>(NO_REVEAL_COSTS);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(EMPTY_PEOPLE_FILTERS);
  const [search, setSearch] = useState<SearchDTO | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  const [starting, setStarting] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [revealing, setRevealing] = useState<ReadonlySet<string>>(new Set());
  const [waitingPhone, setWaitingPhone] = useState<ReadonlyMap<string, number>>(new Map());
  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [promoting, setPromoting] = useState(false);
  const hydrated = useRef<string | null>(null);

  // ─── La fuente, las categorías y lo que cuesta revelar ──────────────────
  const loadCatalog = useCallback(() => {
    setCatalogError(null);
    Promise.all([listSources(), listMyProviderKeys()])
      .then(([catalog, keys]) => {
        setSource(catalog.items.find((item) => item.source === "apollo_people") ?? null);
        setCategories(catalog.categories);
        const apollo = keys.items.find((item) => item.provider === "apollo");
        setCosts(apollo?.credit_costs ?? NO_REVEAL_COSTS);
      })
      .catch((caught: unknown) => setCatalogError(errorMessage(caught, "Revisa tu conexión e intenta otra vez.")));
  }, []);
  useEffect(() => loadCatalog(), [loadCatalog]);

  // ─── La búsqueda de la URL ─────────────────────────────────────────────
  const loadSearch = useCallback(async () => {
    if (searchId === null) {
      setSearch(null);
      return;
    }
    try {
      const row = await getSearch(searchId);
      setSearch(row);
      // Al volver a una búsqueda, sus filtros vuelven al panel (una sola vez).
      if (hydrated.current !== row.id) {
        hydrated.current = row.id;
        setFilters(filtersOf(row));
      }
    } catch (caught) {
      showAlert({ tone: "error", title: "No pudimos leer la búsqueda", description: errorMessage(caught) });
    }
  }, [searchId, showAlert]);
  useEffect(() => void loadSearch(), [loadSearch]);

  const searching = search !== null && isInFlight(search);
  useEffect(() => {
    if (!searching) return;
    const timer = setInterval(() => void loadSearch(), SEARCH_POLL_MS);
    return () => clearInterval(timer);
  }, [searching, loadSearch]);

  // ─── La lista ──────────────────────────────────────────────────────────
  const extraParams = useMemo(
    () =>
      tab === "new"
        ? // TODAS las de esta búsqueda, reveladas o no: quien acaba de revelar a
          // alguien lo ve en la misma fila, con su correo (tablero 5).
          { kind: "person", masked: "include", search_id: searchId ?? undefined, sort: "discovered" }
        : { kind: "person", masked: "exclude", sort: "recent" },
    [tab, searchId],
  );
  const fetcher = useCallback(
    async (query: ListQuery) => {
      // «Nuevos» sin búsqueda no pregunta nada: no hay qué listar.
      if (tab === "new" && searchId === null) return { data: [] as PersonRow[], meta: { total: 0 } };
      const page = await listLeads(query as Parameters<typeof listLeads>[0]);
      return { data: page.data.map(rowOf), meta: page.meta };
    },
    [tab, searchId],
  );
  const { items, total, loading, error, page, setPage, refresh } = usePaginatedList<PersonRow>({
    fetcher,
    pageSize: PEOPLE_PAGE_SIZE,
    extraParams,
  });

  // Al terminar una página de la búsqueda se recarga la lista, y si se había
  // pedido «Siguiente», se va a ella.
  const wasSearching = useRef(false);
  useEffect(() => {
    if (wasSearching.current && !searching) {
      void refresh();
      if (pendingPage !== null) {
        setPage(pendingPage);
        setPendingPage(null);
      }
    }
    wasSearching.current = searching;
  }, [searching, refresh, pendingPage, setPage]);

  // Mientras se revela, se pregunta: el correo tarda segundos, el celular minutos.
  useEffect(() => {
    if (revealing.size === 0 && waitingPhone.size === 0) return;
    const every = revealing.size > 0 ? EMAIL_POLL_MS : PHONE_POLL_MS;
    const timer = setInterval(() => void refresh(), every);
    return () => clearInterval(timer);
  }, [revealing, waitingPhone, refresh]);

  // Lo que ya llegó deja de esperarse.
  useEffect(() => {
    const byId = new Map(items.map((row) => [row.id, row]));
    setRevealing((current) => {
      const next = new Set([...current].filter((id) => byId.get(id)?.masked !== false));
      return next.size === current.size ? current : next;
    });
    setWaitingPhone((current) => {
      const now = Date.now();
      const next = new Map(
        [...current].filter(([id, since]) => byId.get(id)?.phone === null && now - since < PHONE_WAIT_MS),
      );
      return next.size === current.size ? current : next;
    });
  }, [items]);

  // ─── Acciones ──────────────────────────────────────────────────────────
  const category = categories.find((entry) => entry.id === filters.categoryId) ?? null;

  async function onSearch() {
    setStarting(true);
    try {
      const started = await startSearch(peopleSearchInput(filters, category?.label ?? null));
      hydrated.current = started.search_id;
      setTab("new");
      setSelected(new Set());
      setPage(1);
      router.replace(`${pathname}?search=${started.search_id}`, { scroll: false });
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo buscar", description: errorMessage(caught) });
    } finally {
      setStarting(false);
    }
  }

  const reveal = useCallback(
    async (ids: string[], fields: ("email" | "phone")[]) => {
      if (ids.length === 0) return;
      try {
        await revealLeads(ids, fields);
        setRevealing((current) => new Set([...current, ...ids]));
        if (fields.includes("phone")) {
          const now = Date.now();
          setWaitingPhone((current) => new Map([...current, ...ids.map((id) => [id, now] as const)]));
        }
      } catch (caught) {
        showAlert({ tone: "error", title: "No se pudo revelar", description: errorMessage(caught) });
      }
    },
    [showAlert],
  );

  async function promote(ids: string[]) {
    setPromoting(true);
    try {
      const result = await promoteLeads(ids);
      showAlert(
        result.failed.length === 0
          ? { tone: "success", title: result.promoted.length === 1 ? "Guardada en el CRM" : `${String(result.promoted.length)} guardadas en el CRM` }
          : {
              tone: "warning",
              title: `${String(result.promoted.length)} guardadas, ${String(result.failed.length)} no`,
              description: result.failed[0]?.reason,
            },
      );
      setSelected(new Set());
      void refresh();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo guardar en el CRM", description: errorMessage(caught) });
    } finally {
      setPromoting(false);
    }
  }

  // ─── Paginación contra Apollo ──────────────────────────────────────────
  const loadedPages = Math.max(1, Math.ceil(total / PEOPLE_PAGE_SIZE));
  const hasMore = tab === "new" && search !== null && search.has_more && !searching;
  async function onPageChange(next: number) {
    if (next <= loadedPages) {
      setPage(next);
      return;
    }
    if (!hasMore || searchId === null) return;
    try {
      await nextSearchPage(searchId);
      setPendingPage(next);
      await loadSearch();
    } catch (caught) {
      showAlert({ tone: "error", title: "No se pudo traer la página", description: errorMessage(caught) });
    }
  }

  // ─── Pintura ───────────────────────────────────────────────────────────
  const visible = filters.directPhone ? items.filter((row) => row.has_phone) : items;
  const selectedRows = visible.filter((row) => selected.has(row.id));
  const ceiling = revealCeiling(
    selectedRows.map((row) => ({
      id: row.id,
      masked: row.masked,
      source: row.revealable ? "apollo_people" : "other",
      email: row.email,
      phone: row.phone,
      has_email: row.has_email,
      has_phone: row.has_phone,
    })),
    false,
    costs,
  );
  const toReveal = selectedRows.filter((row) => row.revealable && row.masked && row.has_email).map((row) => row.id);
  const toPromote = selectedRows
    .filter((row) => !row.in_crm && (row.email !== null || row.phone !== null))
    .map((row) => row.id);

  const columns = useMemo<ColumnDef<PersonRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Persona",
        alwaysVisible: true,
        minWidth: 200,
        cellClassName: "@md:min-w-44",
        cell: ({ row }) => <PersonCell row={row.original} />,
      },
      {
        accessorKey: "company",
        header: "Empresa",
        minWidth: 160,
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            {row.original.company_id === null ? (
              <span className="truncate font-medium">{row.original.company ?? "—"}</span>
            ) : (
              <Link
                href={`/marketing/leads/${row.original.company_id}`}
                className="truncate font-medium hover:underline"
                title={row.original.company ?? undefined}
              >
                {row.original.company ?? "Su negocio"}
              </Link>
            )}
            {row.original.city !== null && (
              <span className="text-muted-foreground truncate text-xs">{row.original.city}</span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Decide",
        minWidth: 120,
        cell: ({ row }) => <RolePill role={row.original.role} confidence={row.original.confidence} />,
      },
      {
        id: "actions",
        header: "Revelar",
        pinned: "end",
        cell: ({ row }) => (
          <RevealButtons
            target={row.original}
            costs={costs}
            busy={revealing.has(row.original.id)}
            waitingPhone={waitingPhone.has(row.original.id)}
            disabled={!canManage}
            onReveal={(fields) => void reveal([row.original.id], fields)}
          />
        ),
      },
    ],
    [costs, revealing, waitingPhone, canManage, reveal],
  );

  const header = (
    <CaptureHeader
      title="Personas"
      description="Busca a quien decide, por cargo y por empresa. Buscar es gratis; revelar su contacto cuesta créditos de tu Apollo, y solo pagas si lo encuentra."
    />
  );

  if (source === null && catalogError === null) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        <BrandLoader label="Cargando personas" />
      </div>
    );
  }
  if (catalogError !== null) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        <EmptyState
          icon={TriangleAlert}
          title="No pudimos cargar Personas"
          description={catalogError}
          action={<Button onClick={loadCatalog}>Reintentar</Button>}
        />
      </div>
    );
  }
  if (source === null || !source.available) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        <UnavailableState reason={source?.unavailable_reason ?? "no_account"} />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {header}

      <div className="grid min-w-0 gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start [&>*]:min-w-0">
        <PeopleFilters
          value={filters}
          onChange={setFilters}
          onSearch={() => void onSearch()}
          categories={categories}
          searching={starting || searching}
          disabled={!canManage}
        />

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <SegmentedControl<Tab>
              label="Qué personas ver"
              value={tab}
              onValueChange={(next) => {
                setTab(next);
                setSelected(new Set());
                setPage(1);
              }}
              size="sm"
              items={[
                {
                  value: "new",
                  label: "Nuevos",
                  count:
                    search === null
                      ? null
                      : (search.estimated_total ?? total).toLocaleString("es-CO"),
                },
                { value: "saved", label: "Guardados" },
              ]}
            />
            <p className="text-muted-foreground text-xs">Apollo · buscar no gasta créditos</p>
          </div>

          {tab === "new" && searchId === null ? (
            <EmptyState
              icon={UsersRound}
              title="Elige a quién buscas"
              description="Escribe un cargo o elige una jerarquía y pulsa Buscar. Verás nombres y empresas sin gastar nada; revelas solo a quien te interese."
            />
          ) : (loading || searching) && items.length === 0 ? (
            <TableSkeleton rows={6} />
          ) : error !== null ? (
            <EmptyState
              icon={TriangleAlert}
              title="No pudimos cargar las personas"
              description={errorMessage(error, "Revisa tu conexión e intenta otra vez.")}
              action={<Button onClick={() => void refresh()}>Reintentar</Button>}
            />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={UsersRound}
              title={tab === "new" ? "Nadie cumple estos filtros" : "Aún no has revelado a nadie"}
              description={
                tab === "new"
                  ? "Prueba con cargos parecidos, otra ciudad o sin filtro de tamaño."
                  : "Cuando reveles a alguien en Nuevos, queda aquí."
              }
            />
          ) : (
            <section
              aria-label="Personas"
              className="border-border bg-card min-w-0 rounded-3xl border px-3 pt-4 pb-3 @container sm:px-4"
            >
              <DataTable<PersonRow>
                data={visible}
                columns={columns}
                pagination={{
                  page,
                  pageSize: PEOPLE_PAGE_SIZE,
                  // Una página más si Apollo tiene más: «Siguiente» la trae.
                  total: total + (hasMore ? 1 : 0),
                }}
                onPageChange={(next) => void onPageChange(next)}
                selection={
                  canManage || canPromote
                    ? {
                        rowId: (row) => row.id,
                        rowLabel: (row) => row.name,
                        selected,
                        onChange: setSelected,
                        isSelectable: (row) => !row.in_crm,
                        actions: () => (
                          <>
                            {canManage && toReveal.length > 0 && (
                              <Button variant="glass" onClick={() => void reveal(toReveal, ["email"])}>
                                Revelar correos · {toReveal.length}
                              </Button>
                            )}
                            {canPromote && toPromote.length > 0 && (
                              <Button
                                variant="contrast"
                                className="rounded-full"
                                disabled={promoting}
                                onClick={() => void promote(toPromote)}
                              >
                                Guardar en el CRM · {toPromote.length}
                              </Button>
                            )}
                          </>
                        ),
                        note:
                          ceiling.emails > 0 ? (
                            <>
                              {ceiling.emails === 1 ? "1 correo por revelar" : `${String(ceiling.emails)} correos por revelar`}
                              {ceiling.credits !== null && ` · hasta ${String(ceiling.credits)} créditos`}
                            </>
                          ) : undefined,
                        presentation: "dock",
                      }
                    : undefined
                }
              />
              {tab === "new" && (
                <p className="text-muted-foreground px-1 pt-2 text-xs">
                  El apellido y el contacto los entrega Apollo al revelar.
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** Los filtros de una búsqueda guardada, para volver a ella. */
function filtersOf(search: SearchDTO): Filters {
  const person = search.params.person;
  const company = search.params.company;
  const ranges = company?.employee_ranges ?? [];
  return {
    titles: [...(person?.titles ?? [])],
    includeSimilar: person?.include_similar ?? true,
    seniorities: [...(person?.seniorities ?? [])],
    categoryId: null,
    city: search.params.city ?? "",
    sizes: SIZE_OPTIONS.filter((option) => option.ranges.every((range) => (ranges as string[]).includes(range))).map(
      (option) => option.value,
    ),
    emailVerified: person?.email_verified ?? false,
    directPhone: false,
    hiring: person?.hiring ?? false,
  };
}

function PersonCell({ row }: { row: PersonRow }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link href={`/marketing/leads/${row.id}`} className="truncate font-medium hover:underline" title={row.name}>
        {row.name}
      </Link>
      {row.title !== null && (
        <span className="text-muted-foreground truncate text-xs" title={row.title}>
          {row.title}
        </span>
      )}
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        <HasDot on={row.has_email} label="correo" />
        <HasDot on={row.has_phone} label="celular" />
      </span>
    </div>
  );
}

/** Qué sabe Apollo que se podría revelar: el color en el punto, el texto en gris (§10). */
function HasDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span aria-hidden className={on ? "bg-success size-1.5 rounded-full" : "bg-border size-1.5 rounded-full"} />
      <span>
        {label}
        <span className="sr-only">{on ? ": Apollo lo tiene" : ": Apollo no lo tiene"}</span>
      </span>
    </span>
  );
}

/**
 * El papel en la compra y cuánto nos fiamos. El punto violeta marca a quien
 * decide o aprueba (es lo que se busca); el texto va en foreground (§10).
 */
function RolePill({ role, confidence }: { role: BuyingRole; confidence: number | null }) {
  const decides = role === "decides" || role === "approves";
  const label = BUYING_ROLE_LABELS[role];
  return (
    <span className="bg-muted inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap">
      <span aria-hidden className={decides ? "bg-accent-violet size-1.5 rounded-full" : "bg-muted-foreground size-1.5 rounded-full"} />
      {label.charAt(0).toUpperCase() + label.slice(1)}
      {confidence !== null && <span className="tabular-nums">· {confidence}</span>}
    </span>
  );
}

/** Por qué no se puede buscar personas todavía, y qué hacer. */
function UnavailableState({ reason }: { reason: string }) {
  if (reason === "plan_without_api") {
    return (
      <Alert variant="info">
        <KeyRound />
        <AlertTitle>Tu plan de Apollo no incluye la API de personas</AlertTitle>
        <AlertDescription>
          Tu llave vale para completar empresas. Para buscar y revelar personas, Apollo pide un plan pago; cuando lo
          tengas, vuelve a validar la llave en{" "}
          <Link href="/marketing/leads/sources" className="font-medium underline underline-offset-4">
            Fuentes
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }
  return (
    <EmptyState
      icon={KeyRound}
      title={reason === "no_tenant_key" ? "Pon tu llave de Apollo" : "Apollo no está disponible"}
      description={
        reason === "no_tenant_key"
          ? "Personas usa tu propia cuenta de Apollo: buscar es gratis y revelar descuenta de tu saldo. Pégala una vez en Fuentes."
          : "La fuente de personas está apagada o dando problemas. Revisa su estado en Fuentes."
      }
      action={
        <Button asChild>
          <Link href="/marketing/leads/sources">Ir a Fuentes</Link>
        </Button>
      }
    />
  );
}

