import { http } from "@/core/services/http";
import type { Schemas } from "@/core/api/types";
import type { CreateUserDTO, UpdateUserDTO, UserDTO } from "@/modules/users/domain/user";

/**
 * Adapter HTTP del slice users → `/users` (colección del tenant, sin
 * paginación server-side: devuelve `{ data, meta: { total } }`).
 */
export function listUsers(): Promise<Schemas["UserListDto"]> {
  return http.get<Schemas["UserListDto"]>("/users");
}

export function getUserById(id: string): Promise<UserDTO> {
  return http.get<UserDTO>(`/users/${id}`);
}

export function createUser(dto: CreateUserDTO): Promise<Schemas["CreatedIdDto"]> {
  return http.post<Schemas["CreatedIdDto"]>("/users", dto);
}

/** PATCH parcial; responde 204 (sin body). */
export function updateUser(id: string, dto: UpdateUserDTO): Promise<void> {
  return http.patch<void>(`/users/${id}`, dto);
}

export function deleteUser(id: string): Promise<void> {
  return http.delete(`/users/${id}`);
}
