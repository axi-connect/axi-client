"use client"

import type { CompanyRow } from "./model";
import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/data-table";
import { companyColumns, companyData, fetchCompanies } from "./table.config";

export default function CompaniesPage() {
  const pageSize = 3;
  const [page, setPage] = useState(1);
  const [searchValue, setSearchValue] = useState<string>("");
  const [rows, setRows] = useState<CompanyRow[]>(companyData);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [total, setTotal] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<keyof CompanyRow | undefined>();
  const [searchField, setSearchField] = useState<keyof CompanyRow>("name");

  async function load(
    p = page,
    by = sortBy,
    dir: "asc" | "desc" = sortDir,
    field = searchField,
    value = searchValue
  ) {
    try {
      const params: Record<string, unknown> = {
        limit: pageSize,
        offset: (p - 1) * pageSize,
        sortBy: by,
        sortDir: dir,
        view: "summary",
      };
      if (value && field) {
        params[field] = value;
      }
      const { rows, total: totalFromServer } = await fetchCompanies(params as any);
      setRows(rows);
      setTotal(totalFromServer);
    } catch {
      const local = [...companyData];
      if (by) local.sort((a, b) => String(a[by as keyof CompanyRow] ?? "").localeCompare(String(b[by as keyof CompanyRow] ?? "")) * (dir === "asc" ? 1 : -1));
      const filtered = value && field ? local.filter((r) => String((r as any)[field] ?? "").toLowerCase().includes(String(value).toLowerCase())) : local
      setRows(filtered.slice((p - 1) * pageSize, p * pageSize));
      setTotal((value && field ? filtered.length : companyData.length));
    }
  }

  const handleSortChange = async (by: keyof CompanyRow, dir: "asc" | "desc") => {
    setSortBy(by); setSortDir(dir);
    setPage(1);
    await load(1, by, dir);
  };

  const handleSearchChange = async ({ field, value }: { field: keyof CompanyRow; value: string }) => {
    setSearchField(field);
    setSearchValue(value);
    setPage(1);
    await load(1, sortBy, sortDir, field, value);
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Empresas</h1>
      <DataTable
        data={rows}
        searchTrigger="submit"
        columns={companyColumns}
        onSortChange={handleSortChange}
        onSearchChange={handleSearchChange}
        pagination={{ page, pageSize, total }}
        onPageChange={(p) => { setPage(p); load(p); }}
        search={{ field: searchField, value: searchValue }}
        sorting={{ by: sortBy as keyof CompanyRow, dir: sortDir }}
      />
    </div>
  );
}