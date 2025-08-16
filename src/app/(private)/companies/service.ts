import { http, Params } from "@/services/http";
import type { ApiCompaniesPayload, ApiResponse, ListCompaniesParams } from "./model";

export async function listCompanies(params: ListCompaniesParams): Promise<ApiResponse<ApiCompaniesPayload>> {
  return http.get<ApiResponse<ApiCompaniesPayload>>("/identities/companies", params as Params);
}