import type { Schemas } from "@/core/api/types";

/**
 * Contratos del slice users — derivados del OpenAPI del backend.
 * Los usuarios pertenecen al tenant del token (no se envía company_id).
 */
export type UserDTO = Schemas["UserDto"];
export type UserListItemDTO = Schemas["UserListDto"]["data"][number];
export type CreateUserDTO = Schemas["CreateUserDto"];
export type UpdateUserDTO = Schemas["UpdateUserDto"];

export type UserStatus = UserDTO["status"];

/** Forma que consume la tabla (mapeo en fetchUsers). */
export type UserRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  status: UserStatus;
  role_id: string;
  role_name: string;
  last_login_at: string | null;
};
