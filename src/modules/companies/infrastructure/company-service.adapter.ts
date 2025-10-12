import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { SelectOption } from "@/shared/query";
import type { ApiCompaniesPayload, ListCompaniesParams, CreateCompanyDTO, CompanyDTO, UpdateCompanyDTO } from "@/modules/companies/domain/company";

export async function listCompanies(params: ListCompaniesParams): Promise<ApiResponse<ApiCompaniesPayload>> {
  return http.get<ApiResponse<ApiCompaniesPayload>>("/identities/companies", params as Params);
}

export async function createCompany(payload: CreateCompanyDTO): Promise<ApiResponse<CompanyDTO>> {
  return http.post<ApiResponse<CompanyDTO>>("/identities/companies", payload);
}

export async function deleteCompany(id: number | string): Promise<ApiResponse<{}>> {
  return http.delete<ApiResponse<{}>>(`/identities/companies/${id}`);
}

export async function updateCompany(id: number | string, payload: UpdateCompanyDTO): Promise<ApiResponse<CompanyDTO>> {
  return http.put<ApiResponse<CompanyDTO>>(`/identities/companies/${id}`, payload);
}

export async function getCompanyById(id: number | string): Promise<ApiResponse<CompanyDTO>> {
  return http.get<ApiResponse<CompanyDTO>>(`/identities/companies/${id}`)
}

export async function listCompanyOptions(params: { name?: string; limit?: number; offset?: number } = {}): Promise<Array<SelectOption>> {
  const res = await http.get<ApiResponse<ApiCompaniesPayload>>("/identities/companies", { ...params, view: "summary" });
  return (res.data?.companies ?? []).map(c => ({ id: Number(c.id), label: String(c.name ?? "") }))
}