"use client";

/**
 * Tab Usuarios: lista read-only sobre el `DataTable` compartido en modo
 * cliente (sin paginación server). Búsqueda por nombre/email integrada de la
 * tabla; sin facets (el volumen por tenant es bajo).
 */
import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/features/data-table";
import { TableSkeleton } from "@/shared/components/features/loading";
import type { TenantUser } from "../../../../domain/tenant";
import { useTenantUsersQuery } from "../../../../infrastructure/api/hooks/use-tenants";
import { EmptyState } from "../../../components/EmptyState";
import { ProblemAlert } from "../../../components/ProblemAlert";
import { sortRows } from "../../../lib/sort-rows";
import { tenantUserColumns } from "./tenant-users-table.config";

type UsersSearch = { field: keyof TenantUser & string; value: string };
type UsersSort = { by: keyof TenantUser & string; dir: "asc" | "desc" };

export function TenantUsersView({ tenantId }: { tenantId: string }) {
  const { data, isPending, isError, error, refetch } = useTenantUsersQuery(tenantId);
  const [search, setSearch] = useState<UsersSearch>({ field: "name", value: "" });
  const [sort, setSort] = useState<UsersSort>({ by: "name", dir: "asc" });
  const [page, setPage] = useState(1);

  const users = useMemo(() => data?.data ?? [], [data]);
  const filtered = useMemo(() => {
    const query = search.value.trim().toLowerCase();
    const matched = query
      ? users.filter((user) => String(user[search.field] ?? "").toLowerCase().includes(query))
      : users;
    return sortRows(matched, sort.by, sort.dir);
  }, [users, search, sort]);

  if (isPending) return <TableSkeleton rows={5} showHeader={false} />;
  if (isError) return <ProblemAlert error={error} onRetry={() => void refetch()} />;

  if (users.length === 0) {
    return (
      <EmptyState
        glyph="people"
        title="Sin usuarios"
        description="Este tenant aún no tiene usuarios registrados."
      />
    );
  }

  return (
    <DataTable
      data={filtered}
      columns={tenantUserColumns}
      pagination={{ page, pageSize: 10 }}
      onPageChange={setPage}
      preferredSearchFields={["name", "email"]}
      search={search}
      sorting={{ by: sort.by, dir: sort.dir }}
      onSortChange={(by, dir) => setSort({ by, dir })}
      onSearchChange={({ field, value }) => {
        setSearch({ field, value });
        setPage(1);
      }}
    />
  );
}
