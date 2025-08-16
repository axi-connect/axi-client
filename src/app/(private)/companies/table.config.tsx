"use client"

import { listCompanies } from "./service";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ColumnDef, DataRow } from "@/components/ui/data-table/types";
import type { CompanyRow, CompanyDTO, ApiCompaniesPayload, ApiResponse, ListCompaniesParams } from "./model";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export const companyColumns: ColumnDef[] = [
  { accessorKey: "name", header: "Empresa", sortable: true },
  { accessorKey: "nit", header: "NIT", sortable: true },
  { accessorKey: "city", header: "Ciudad", sortable: true },
  { accessorKey: "industry", header: "Industria", sortable: true },
  {
    id: "actions",
    cell: ({ row }) => {
      const company = row.original as DataRow
      return (  
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(String(company.id ?? ""))}>
                Copiar ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Ver empresa</DropdownMenuItem>
              <DropdownMenuItem>Ver contactos</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
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