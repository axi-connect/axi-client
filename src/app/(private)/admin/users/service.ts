import { http, Params } from "@/services/http";
import type { ApiResponse } from "@/shared/api";
import type { ApiUsersPayload, CreateUserDTO, ListUsersParams, UpdateUserDTO, UserDTO, SelectOption } from "./model";

export async function listUsers(params: ListUsersParams): Promise<ApiResponse<ApiUsersPayload>> {
  return http.get<ApiResponse<ApiUsersPayload>>("/identities/users", params as Params);
}

export async function getUserById(id: number | string): Promise<ApiResponse<UserDTO>> {
  return http.get<ApiResponse<UserDTO>>(`/identities/users/${id}`);
}

export async function createUser(payload: CreateUserDTO): Promise<ApiResponse<UserDTO>> {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("email", payload.email);
  form.append("phone", payload.phone);
  form.append("password", payload.password);
  form.append("company_id", String(payload.company_id));
  form.append("role_id", String(payload.role_id));
  if (payload.avatar instanceof File) {
    form.append("avatar", payload.avatar);
  }
  return http.post<ApiResponse<UserDTO>>("/identities/users", form);
}

export async function updateUser(id: number | string, payload: UpdateUserDTO): Promise<ApiResponse<UserDTO>> {
  const form = new FormData();
  if (payload.name !== undefined) form.append("name", payload.name);
  if (payload.email !== undefined) form.append("email", payload.email);
  if (payload.phone !== undefined) form.append("phone", payload.phone);
  if (payload.company_id !== undefined) form.append("company_id", String(payload.company_id));
  if (payload.role_id !== undefined) form.append("role_id", String(payload.role_id));
  if (payload.avatar instanceof File) {
    form.append("avatar", payload.avatar);
  }

  return http.put<ApiResponse<UserDTO>>(`/identities/users/${id}`, form);
}

export async function deleteUser(id: number | string): Promise<ApiResponse<{}>> {
  return http.delete<ApiResponse<{}>>(`/identities/users/${id}`);
}

// Options (summary views)
export async function listCompanyOptions(params: { name?: string; limit?: number; offset?: number } = {}): Promise<Array<SelectOption>> {
  const res = await http.get<ApiResponse<{ companies: Array<{ id: number; name: string }>; total: number }>>(
    "/identities/companies",
    { view: "summary", limit: params.limit ?? 50, offset: params.offset ?? 0, name: params.name }
  );
  return (res.data?.companies ?? []).map(c => ({ id: Number(c.id), name: String(c.name ?? "") }))
}

export async function listRoleOptions(params: { name?: string; limit?: number; offset?: number } = {}): Promise<Array<SelectOption>> {
  const res = await http.get<ApiResponse<{ roles: Array<{ id: number; name: string }>; total: number }>>(
    "/rbac/role",
    { view: "summary", limit: params.limit ?? 50, offset: params.offset ?? 0, name: params.name }
  );
  return (res.data?.roles ?? []).map(r => ({ id: Number(r.id), name: String(r.name ?? "") }))
}