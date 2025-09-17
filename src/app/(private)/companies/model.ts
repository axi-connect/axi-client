// Companies module models

export type CompaniesSortDir = "asc" | "desc";

export type CompanyRow = {
  id: string;
  name: string;
  nit: string;
  city?: string;
  industry?: string;
};

export type CompaniesSort = {
  sortBy?: keyof Pick<CompanyRow, "name" | "nit" | "city" | "industry">;
  sortDir?: CompaniesSortDir;
};

export type CompaniesPaging = {
  page: number;
  pageSize: number;
  total?: number;
};

// API contracts
export type CompaniesView = "summary" | "detail";

export interface ListCompaniesParams {
  nit?: string;
  name?: string;
  city?: string;
  industry?: string;
  limit?: number;
  offset?: number;
  view?: CompaniesView;
  sortBy?: string;
  sortDir?: CompaniesSortDir;
}

export interface CompanyDTO {
  id: string | number;
  nit: string;
  name: string;
  city?: string;
  industry?: string;
  [key: string]: unknown;
}

export interface ApiCompaniesPayload {
  companies: CompanyDTO[];
  total: number;
}

// Create company DTO (payload expected by the endpoint)
export type CompanyScheduleItem = { day: string; time_range: string }

export interface CreateCompanyDTO {
  nit: string
  city: string
  address: string
  industry: string
  name: string
  activity_description: string
  company_schedule: CompanyScheduleItem[]
}

export type UpdateCompanyDTO = Partial<{
  name: string
  city: string
  address: string
  industry: string
  activity_description: string
  company_schedule: CompanyScheduleItem[]
}>