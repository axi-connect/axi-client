"use client"

import { listCompanies } from "../service";
import type { ApiResponse } from "@/shared/api";
import { CompanyRowActions } from "./table.actions";
import type { ColumnDef, DataRow } from "@/components/ui/data-table/types";
import type { CompanyRow, CompanyDTO, ApiCompaniesPayload, ListCompaniesParams } from "../model";

export const companyColumns: ColumnDef[] = [
  { accessorKey: "name", header: "Empresa", sortable: true, alwaysVisible: true},
  { accessorKey: "nit", header: "NIT", sortable: true, alwaysVisible: true },
  { accessorKey: "city", header: "Ciudad", sortable: true },
  { accessorKey: "industry", header: "Industria", sortable: true },
  {
    id: "actions",
    minWidth: 100,
    cell: ({ row }) => <CompanyRowActions company={row.original as DataRow} />,
  },
];

export const companyData: CompanyRow[] = [
  // { id: "1", name: "Acme Inc", nit: "900123456", city: "bogotá", industry: "manufactura" },
  // { id: "2", name: "Globex", nit: "901987654", city: "medellín", industry: "tecnología" },
  // { id: "3", name: "Initech", nit: "800456789", city: "cali", industry: "servicios" },
];

// Service glue to fetch with sorting/filter/pagination
export async function fetchCompanies(params: ListCompaniesParams): Promise<{ rows: CompanyRow[]; total: number }> {
  const res: ApiResponse<ApiCompaniesPayload> = await listCompanies(params);
  const payload = res.data;
  const rows: CompanyRow[] = payload.companies.map((c: CompanyDTO) => ({
    id: String(c.id),
    name: String(c.name ?? ""),
    nit: String(c.nit ?? ""),
    city: String(c.city ?? ""),
    industry: String(c.industry ?? ""),
  }));
  return { rows, total: payload.total };
}